

## Plan: Make Reports Deliver in Under 8 Minutes -- Demo-Ready

### The Core Problem

Right now, the pipeline is broken because of three compounding failures:

1. **Individual TinyFish timeouts are absurdly long** (up to 600 seconds for Reddit). The edge function dies at 400s, so a single slow task kills everything.
2. **No global deadline** -- `Promise.allSettled` waits for ALL tasks, including ones timing out at 10 minutes.
3. **The SSE reader ignores keepalive comments** -- the frontend thinks the connection died after 90 seconds even when keepalives are flowing, triggering false "Connection Lost" UI.
4. **Too many agents every time** -- the prompt forces 10-15 tasks regardless of query complexity. A simple query like "best CRM for small teams" doesn't need 15 agents.

### The Fix (4 Changes)

**Change 1: Smart source count + simplified goals (Edge Function)**

Update the classification prompt to request "3-15 tasks depending on query complexity":
- Simple/narrow queries: 3-5 tasks
- Medium queries: 6-8 tasks  
- Broad/multi-dimensional queries: 10-15 tasks

Simplify the goal examples to single-page, single-action instructions (2-3 sentences max). Remove the overly complex multi-step browsing scripts that cause TinyFish to hang.

**Change 2: Time-budgeted execution with hard cutoff (Edge Function)**

- Cap ALL individual TinyFish task timeouts at **120 seconds** (2 minutes). If TinyFish can't get data in 2 minutes, it won't in 10.
- Add a **5-minute (300s) global deadline** for the scraping phase. After 5 minutes, cancel all remaining tasks and proceed to synthesis with whatever data has been collected.
- Add an **early exit**: if 60%+ of tasks are done and at least 2 sources returned data, don't wait for the rest.
- This guarantees: ~30s classification + ~300s max scraping + ~60s synthesis = **under 7 minutes worst case**.

**Change 3: Frontend handles keepalive + proper stale detection (SSE Reader + useReport)**

- Update `src/services/api.ts` to detect `: keepalive` SSE comments and fire a `keepalive` callback.
- Update `useReport.ts` to handle `keepalive` events by resetting the stale timer without changing state.
- Increase stale threshold from 90s to 150s (connection is only "lost" if no keepalive for 2.5 minutes).
- Increase "Taking longer than expected" threshold from 120s to 300s.

**Change 4: Retry actually retries, not resets (SearchingState)**

- The "Retry" button already calls `retry()` which is correctly wired. The problem is the stale detection fires too early (90s) due to keepalives being ignored (fixed in Change 3).
- Clarify button labels: "Retry Same Query" vs "New Query".

### Technical Details

**`supabase/functions/generate-report/index.ts`**

Lines 519-548 (classification prompt): Change "10-15 search tasks" to "3-15 search tasks depending on query complexity" with guidance:
```
Simple/focused query (e.g. "best CRM for plumbers"): 3-5 tasks
Medium query (e.g. "project management tool gaps"): 6-8 tasks
Broad research (e.g. "mental health app market"): 10-15 tasks
```

Lines 556-592 (goal examples): Replace verbose multi-step scripts with concise goals:
```
GOOD: "Search reddit.com/r/SaaS for 'CRM frustrations', sort by Top Past Year, extract titles and top 3 comments from first 5 posts. Return as JSON."
BAD: "Navigate to reddit.com/r/SaaS. Click the search bar and type 'frustrated OR hate...' [paragraph continues]"
```

Lines 1068-1092 (timeouts): Replace entire PLATFORM_TIMEOUTS map with a flat 120-second timeout:
```typescript
const TINYFISH_TIMEOUT_MS = 120_000; // 2 min max per task
function getTimeout(_platform: string): number {
  return TINYFISH_TIMEOUT_MS;
}
```

Lines 1386-1491 (scraping phase): Add global deadline and early-exit logic:
- Create an AbortController for the entire scraping phase
- Start a 300-second deadline timer
- Track `doneCount` and `dataCount` (tasks that returned actual data)
- After each task completes, check: if `doneCount >= totalTasks * 0.6 && dataCount >= 2`, resolve early
- When deadline fires, abort all remaining tasks, log "Time budget reached", proceed to synthesis

**`src/services/api.ts`**

Lines 213-236 (SSE event parsing): Add keepalive detection before the event type/data parsing:
```typescript
// Inside the eventBlock processing loop:
if (eventBlock.startsWith(":")) {
  // SSE comment (keepalive)
  callback("keepalive", {});
  continue;
}
```

**`src/hooks/useReport.ts`**

Line 78 (handleEvent): Add `case "keepalive"` that only updates `lastEventTimeRef.current = Date.now()` and returns.

Lines 170-178 (stale detection): Change 90,000ms threshold to 150,000ms (2.5 minutes). Change check interval from 30s to 45s.

**`src/components/SearchingState.tsx`**

Line ~150 (showSlowWarning): Change threshold from `120` to `300` seconds.

Update button labels: "Retry Same Query" and "New Query" instead of "Retry" and "Start Fresh".
