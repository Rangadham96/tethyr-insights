

# Fix Backend Streaming, Tiered Timeouts, Phase Tracking, and Searching UX

## Problems and Fixes

### 1. Backend: Progress stuck because TinyFish results stream all at once

**Root cause:** Lines 1119-1121 use `Promise.allSettled` on all TinyFish tasks, then process results sequentially in a `for` loop (lines 1125-1170). No SSE events stream during the 3-6 minute wait.

**Fix:** Wrap each TinyFish task in an async function that independently sends SSE events (`source_update`, `log`) the moment that individual task completes and is filtered. All wrappers run in parallel via `Promise.allSettled`, but each one streams its own progress incrementally.

### 2. Backend: Tiered timeouts per platform

Instead of a single timeout, define a `PLATFORM_TIMEOUTS` map with three tiers:

| Tier | Timeout | Platforms |
|------|---------|-----------|
| Slow | 600s (10 min) | reddit, facebook_groups_public, youtube_comments, patient_communities, discourse_forums |
| Medium | 300s (5 min) | hackernews, g2, capterra, apple_app_store, google_play_store, chrome_web_store, glassdoor, amazon_reviews, stackoverflow, linkedin_comments, academic_papers, substack_comments, podcast_transcripts |
| Fast | 180s (3 min) | twitter_x, producthunt, quora, alternativeto, trustpilot, bbb_complaints, indie_review_sites, tiktok_comments, indiehackers, discord_public, job_postings |

The `runTinyFishTask` function will accept a `timeoutMs` parameter. The caller looks up the platform in the map, defaulting to 300s for unknown platforms.

### 3. Backend: TinyFish PROGRESS events not forwarded

**Root cause:** `runTinyFishTask` collects `progressMessages` in an array (line 872) but never returns or streams them.

**Fix:** Pass a `send` callback into `runTinyFishTask`. On each TinyFish `PROGRESS` event, immediately call `send(logEvent(...))` to forward it to the frontend as a log line (e.g., "Reddit: Navigating to search results...").

### 4. New SSE event: `phase_update`

Add a new event type so the frontend knows the high-level pipeline stage:
- `{ phase: "classifying", detail: "Analyzing query..." }`
- `{ phase: "scraping", detail: "3 of 8 sources complete" }`
- `{ phase: "synthesizing", detail: "Generating report..." }`

Emitted at key transitions in the edge function.

### 5. Ticker: Show pipeline phase

The ticker badge (line 54 of Ticker.tsx) currently just says "Searching". Update to accept a `currentPhase` prop and display: "Classifying" / "Scraping 3/8" / "Synthesizing" / "Complete".

### 6. SearchingState: Classification card (already exists, verify it works)

The classification card at lines 31-42 of SearchingState.tsx already matches the spec exactly (amber left border, market type in mono uppercase, routing rationale in italic). It will be kept as-is and verified to stay visible throughout the wait.

### 7. SearchingState: Phase banner, time estimate, animations, tips

- Add a **phase banner** at the very top (above query) showing current stage: "STAGE 2 OF 3 -- SCRAPING PLATFORMS" with "~3-5 min remaining"
- Add a **pulsing dot** animation on the latest log line to show active progress
- Show **stage progress text**: "4 of 8 sources complete"
- When synthesis starts: "Generating your intelligence report..."
- Add rotating **contextual tips** during long waits (e.g., "TinyFish agents are browsing Reddit in stealth mode right now...")

### 8. Layout: Fix clipped headers

Verify `mt-[26px]` offset is consistent. Remove any sticky positioning inside SearchingState that could clip under the fixed ticker.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/generate-report/index.ts` | Tiered timeouts, incremental streaming per task, forward PROGRESS events, add phase_update events |
| `src/types/report.ts` | Add `PhaseEvent` type |
| `src/hooks/useReport.ts` | Add `currentPhase` state, handle `phase_update` event, expose to Index |
| `src/components/Ticker.tsx` | Accept `currentPhase` prop, show phase in badge |
| `src/components/SearchingState.tsx` | Accept `currentPhase` prop, add phase banner, time estimate, pulse animation, rotating tips |
| `src/pages/Index.tsx` | Pass `currentPhase` to Ticker and SearchingState |
| `src/index.css` | Add pulse-dot keyframe animation |

## Technical Details

### Tiered timeout map (edge function)

```text
const PLATFORM_TIMEOUTS: Record<string, number> = {
  reddit: 600_000,
  facebook_groups_public: 600_000,
  youtube_comments: 600_000,
  patient_communities: 600_000,
  discourse_forums: 600_000,
  // All others default to 300_000
  twitter_x: 180_000,
  producthunt: 180_000,
  quora: 180_000,
  alternativeto: 180_000,
  trustpilot: 180_000,
  bbb_complaints: 180_000,
  indie_review_sites: 180_000,
  tiktok_comments: 180_000,
  indiehackers: 180_000,
  discord_public: 180_000,
  job_postings: 180_000,
};
const DEFAULT_TIMEOUT = 300_000;

function getTimeout(platform: string): number {
  return PLATFORM_TIMEOUTS[platform] ?? DEFAULT_TIMEOUT;
}
```

### Incremental streaming pattern (edge function)

```text
let doneCount = 0;
const totalTasks = tasks.length;

const wrapperPromises = tasks.map(async (task) => {
  send(sseEvent("source_update", { platform: task.platform, status: "searching", ... }));

  const timeout = getTimeout(task.platform);
  const result = await runTinyFishTask(task, apiKey, timeout, send);
  // runTinyFishTask now calls send(logEvent(...)) for each PROGRESS event

  if (result.success) {
    send(logEvent(`${task.platform}: data received, filtering...`, "found"));
    const filtered = await callGeminiJSON(filterPrompt, "flash", rawData);
    doneCount++;
    send(sseEvent("source_update", { platform: task.platform, status: "done", items_found }));
    send(sseEvent("phase_update", { phase: "scraping", detail: `${doneCount} of ${totalTasks} complete` }));
    return { platform: task.platform, data: filtered };
  } else {
    send(sseEvent("source_update", { platform: task.platform, status: "error" }));
    doneCount++;
    send(sseEvent("phase_update", { phase: "scraping", detail: `${doneCount} of ${totalTasks} complete` }));
    return null;
  }
});

await Promise.allSettled(wrapperPromises);
send(sseEvent("phase_update", { phase: "synthesizing", detail: "Generating report..." }));
```

### runTinyFishTask signature change

```text
async function runTinyFishTask(
  task: TinyFishTask,
  apiKey: string,
  timeoutMs: number,
  send: (chunk: string) => void,
): Promise<TinyFishResult>
```

Inside, on each `PROGRESS` event:
```text
if (event.type === "PROGRESS" && event.purpose) {
  send(logEvent(`${task.platform}: ${event.purpose}`, "searching"));
}
```

The `AbortController` timeout uses `timeoutMs` instead of the hardcoded 90s.

### SearchingState layout (top to bottom)

```text
1. Phase banner: "STAGE 2 OF 3 -- SCRAPING PLATFORMS" + "~3-5 min"
2. Query display: "Searching for: ..."
3. Classification card (amber border): market/audience + routing rationale
4. Log feed with pulse on latest entry
5. Progress bar: "4 of 8 sources complete - 50%"
6. Rotating tips during long waits
```

