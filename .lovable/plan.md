

# Fix TinyFish Integration: Switch to Sync API + Proper Concurrency

## What's Actually Broken (Evidence from Logs)

Every single task across multiple runs shows `ABORT` — not `FAILED`, not `TIMEOUT`, but `ABORT`. This means our own code is killing the tasks before TinyFish finishes. Two bugs cause this:

1. **Early-exit abort (line 1331)**: When 80% of tasks "complete" (even with 0 items), `scrapingAbort.abort()` fires and kills ALL remaining in-flight tasks. With 5 tasks, the moment 4 finish (even empty), the 5th is murdered.

2. **Concurrency 5 exceeds account limit**: TinyFish docs explicitly state: "Each user account has a concurrency limit for simultaneous browser sessions. When you exceed this limit, additional requests will be queued automatically." Tasks 4-5 sit in TinyFish's queue, eating into their timeout budget. By the time they start executing, the early-exit abort has already fired.

3. **Stream double-close (line 1571 + 1632)**: After the abort, `controller.close()` is called in the error path AND the finally block, causing the `TypeError: The stream controller cannot close or enqueue` crash.

## What's Different This Time

Previous attempts just tweaked timeout numbers. This time: **structural rewrite of the TinyFish communication layer** based on TinyFish's own official documentation for concurrent requests.

### Change 1: Switch from SSE to Sync API

TinyFish has two endpoints:
- `/v1/automation/run-sse` (what we use) — streams progress events
- `/v1/automation/run` (sync) — waits and returns final JSON

Their docs literally say: **"The sync /run API is perfect for concurrent requests — you get clean, simple code without SSE stream handling, making it ideal for batch operations with Promise.all()."**

The sync API response is simple:
```text
{
  "run_id": "...",
  "status": "COMPLETED",
  "result": { ... extracted data ... },
  "error": null
}
```

This eliminates our entire 60-line SSE stream parser (`runTinyFishTask`) — the CAPTCHA-in-PROGRESS detection, the `data:` line parsing, the `buffer` management, the `[DONE]` sentinel. Replace with ~15 lines: `fetch()` + `await response.json()` + check `status === "COMPLETED"`.

We still stream OUR OWN SSE events to the user's browser for the live progress UI — this only changes how we talk to TinyFish's servers.

### Change 2: Concurrency 2, Tasks 3

TinyFish docs say to "size your concurrent batches to match your concurrency limit." Free/starter accounts typically have 2-3 concurrent sessions. With 5 concurrent requests, tasks 4-5 queue, adding 30-60s of wait time that eats into their timeout.

- `MAX_CONCURRENT_AGENTS`: 5 down to **2**
- Task cap: 5 down to **3**
- Remove mandatory dual-angle Reddit from classification prompt (1 Reddit task + 2 other sources)

With concurrency 2 and 3 tasks: batch 1 runs 2 tasks in parallel, batch 2 runs 1 task. No queueing. Total time: ~60-90s instead of tasks fighting for slots.

### Change 3: Remove Early-Exit Abort Entirely

With only 3 fast tasks and concurrency 2, all tasks complete in ~90s. The early-exit optimization is unnecessary and actively harmful. Remove: `scrapingAbort`, `earlyResolved`, `checkEarlyExit`. Keep only the 300s deadline as a safety net.

```text
Before: Complex Promise with 80% threshold + dataCount + abort
After:  await runWithConcurrency(taskFactories, 2) — just wait for all 3 tasks
        300s deadline timer aborts only if something hangs
```

### Change 4: Guard Stream Close

Add `streamClosed` boolean flag. Check before every `controller.close()`.

### Change 5: Only Count Sources with Items toward dataCount

The "no relevant items found" branch (line 1448) still increments `dataCount`. Fix: only increment when items > 0.

## Technical Implementation

**File**: `supabase/functions/generate-report/index.ts`

### Rewrite `runTinyFishTask` (~50 lines shorter)

```text
Current (SSE):
  fetch("/run-sse") -> reader.read() loop -> parse "data:" lines
  -> detect CAPTCHA in PROGRESS events -> extract resultJson from COMPLETE event

New (Sync):
  fetch("/run") -> await response.json()
  -> check result.status === "COMPLETED"
  -> return result.result (the extracted data)
  -> check result.error for CAPTCHA/failure info
```

CAPTCHA detection moves from inspecting PROGRESS events to checking the `error` field in the sync response.

### Update Constants

```text
MAX_CONCURRENT_AGENTS = 2
TINYFISH_TIMEOUT_MS = 120_000 (2 min — generous, no queueing to eat into it)
All platform-specific timeouts = 120_000 (uniform, simple)
```

### Simplify Classification Prompt

- Remove "MULTI-TASK STRATEGY FOR REDDIT (MANDATORY)" section
- Change "3-5 ONLY" to "exactly 3"
- Keep all source selection logic and goal formatting rules

### Simplify Scraping Orchestration (lines 1304-1565)

```text
Before (~260 lines):
  scrapingAbort controller
  earlyResolved flag
  checkEarlyExit function
  Complex Promise wrapper with deadline + early-exit
  
After (~80 lines):
  Simple deadline timer (300s safety net only)
  streamClosed guard flag
  await runWithConcurrency(taskFactories, 2)
  Then proceed to synthesis
```

### Keep Everything Else

- Gemini classification (Stage 1) — unchanged
- Quality filter (Stage 2b) — unchanged
- Synthesis (Stage 3) — unchanged
- Thin-result retry logic — kept
- 24h cache check — kept
- Fallback logic — kept
- All frontend code — unchanged
- `normalizeReport` — unchanged

## What to Tell TinyFish Support (If This Doesn't Work)

After implementing this fix, if tasks still fail, here's the email to send:

---

**To**: support@tinyfish.ai

**Subject**: Tasks returning empty results with stealth+proxy on old.reddit.com — account diagnostics needed

**Body**:

Hi TinyFish team,

I'm building Tethyr (market intelligence tool) for the TinyFish Accelerator. I'm experiencing consistent failures when scraping old.reddit.com/search with stealth + US proxy.

**Setup**:
- API endpoint: `/v1/automation/run` (sync)
- Concurrency: 2 simultaneous requests
- Browser profile: stealth
- Proxy: US
- Timeout: 120s

**What I'm seeing**:
- Tasks targeting `old.reddit.com/search/?q=...` with stealth+proxy consistently return empty results or time out
- Tasks targeting Google (`google.com/search?q=site:...`) with lite profile succeed
- HN Algolia tasks with lite profile succeed

**What I need to know**:
1. What is my account's concurrency limit?
2. Is there a known issue with stealth+proxy on Reddit search pages?
3. Should I use a different URL pattern for Reddit (e.g., `reddit.com/search` instead of `old.reddit.com/search`)?
4. Are there recommended `feature_flags` for Reddit extraction?

**Integration ID**: tethyr
**Typical goal**: "Extract all visible post titles and preview text on this page..." (structured JSON output)

Thanks,
[Your name]

---

## Expected Outcome

- Tasks execute without queueing (concurrency matches account limit)
- No premature aborts (early-exit logic removed)
- No stream crashes (close guard added)
- Simpler code (~100 lines removed)
- Reports should complete in ~2 minutes with 3 sources of actual data

## Summary of All Changes

| What | Before | After |
|------|--------|-------|
| TinyFish endpoint | `/run-sse` (SSE stream) | `/run` (sync JSON) |
| Concurrency | 5 | 2 |
| Max tasks | 5 | 3 |
| Reddit tasks | 2 mandatory | 1 (let classifier decide) |
| Early-exit abort | 80% + abort all | Removed entirely |
| Timeouts | 75-90s (per-platform) | 120s (uniform) |
| Stream close | No guard (crashes) | `streamClosed` flag |
| runTinyFishTask | ~70 lines SSE parsing | ~20 lines sync fetch |
| dataCount for 0 items | Incremented | Not incremented |

