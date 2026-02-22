

## Plan: Fix Dashboard Reliability, Data Flow, and Prompt Quality

There are **five interconnected problems** causing the dashboard to freeze, data to not flow correctly, and search results to come back empty. Here's the full fix.

---

### Problem 1: Dashboard Freezes Because the Edge Function Times Out

The Supabase edge function has a **default 60-second wall-clock timeout** (configurable up to 400s in config.toml). With 10-15 TinyFish tasks each taking 3-10 minutes, the function is being killed mid-stream. The SSE connection drops silently, and the frontend stays stuck in "searching" state forever.

**Fix:**
- Set `wall_clock_timeout = 400` in `supabase/config.toml` for the generate-report function (maximum allowed)
- Add a **heartbeat** to the SSE stream: every 15 seconds, send a `:keepalive` comment to prevent connection timeouts on both the edge runtime and the browser
- Add a **frontend timeout + recovery**: if no SSE event is received for 90 seconds, show a "Connection lost" state with a "Retry" button

### Problem 2: Google Play Store Fallback Sends Invalid URLs to TinyFish

The logs show: `TinyFish error for google_play_store: 400 Invalid URL`. The fallback builds URLs like `https://play.google.com/store/search?q=...&c=apps` but TinyFish's `url` field requires a simple base URL, not a URL with query parameters. The search query should go in the `goal` field instead.

**Fix:**
- Change all fallback `url_or_query` values to use simple base URLs (e.g., `https://play.google.com/store`)
- Move the search query into the `goal` text where TinyFish can interpret it as a browsing instruction
- Apply the same fix to other fallbacks (Reddit, Quora, HealthUnlocked) that use query-parameter URLs

### Problem 3: Classification Prompt Still Says "6-10 Sources" (Line 117)

Despite previous edits to line 519, the STEP 2 header on line 117 still says "select 6-10 sources." Gemini reads both instructions and defaults to the lower number.

**Fix:**
- Update line 117 to say "select 10-15 sources" to match the STEP 3 instruction on line 519

### Problem 4: TinyFish Prompts Are Too Vague

The goals sent to TinyFish are generic (e.g., "search for 'topic'"), which often returns empty results. TinyFish works best with hyper-specific browsing instructions that name exact pages, exact scroll actions, and exact extraction formats.

**Fix:**
- Add a **prompt enhancement step** after classification: before sending tasks to TinyFish, run each task's goal through a quick Gemini Flash call that rewrites it into a step-by-step browsing script with exact actions (navigate to URL, click element, scroll down, extract specific fields)
- Alternatively (simpler), improve the classification prompt itself to produce more prescriptive goals by adding examples of good vs bad goals

### Problem 5: Add a Refresh/Retry Button to the Dashboard

When the dashboard gets stuck (SSE dies, timeout, etc.), users have no way to recover without a full page reload which loses state.

**Fix:**
- Add a "Refresh Status" button visible during `searching` state that re-establishes the SSE connection
- Add a "Dashboard is taking longer than expected" message after 120 seconds with a "Start New Report" button
- When a completed report exists in localStorage, always show a "View Last Report" recovery option

---

### Technical Details

**Files to modify:**

**`supabase/config.toml`**
- Add function-specific config:
```text
[functions.generate-report]
verify_jwt = false
wall_clock_timeout = 400
```

**`supabase/functions/generate-report/index.ts`**
- Line 117: Change "6-10 sources" to "10-15 sources"
- Add SSE heartbeat: start a 15-second interval timer at the beginning of the stream handler that sends `:keepalive\n\n` and clear it in the `finally` block
- Fix all fallback URLs in `getFallback()` to use base URLs only (move query params into the goal text):
  - `google_play_store`: URL becomes `https://play.google.com/store`, goal says "search for '{topic}'"
  - `reddit` fallbacks: URL becomes `https://www.reddit.com`, goal says "search for '{topic}'"
  - `quora`: URL becomes `https://www.quora.com`, goal says "search for '{topic}'"
  - `healthunlocked`: URL becomes `https://healthunlocked.com`, goal says "search for '{topic}'"
- Improve task goal specificity: add 3-4 concrete examples of good goals in the classification prompt so Gemini produces more actionable instructions

**`src/pages/Index.tsx`**
- Add a "stuck detection" timer: if `appState === "searching"` for more than 120 seconds without a source completing, show a recovery UI
- Add a "New Report" button visible in all non-landing states
- Show "View Last Report" option when localStorage has a completed report but the current state is stuck

**`src/hooks/useReport.ts`**
- Add a `lastEventTime` ref that updates on every SSE callback
- Expose a `isStale` flag (true when no event received for 90+ seconds during searching)
- Add a `retry` function that re-runs the current query

**`src/components/SearchingState.tsx`**
- Show a "Taking longer than expected..." message after 120s
- Add a "Start Fresh" button that calls `reset()`

