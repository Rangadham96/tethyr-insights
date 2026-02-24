

# Critical Audit: What the Previous Plan Missed

The previous plan identified 8 changes. After re-reading every line of the edge function, I found **6 additional critical issues** the plan did NOT cover. Without fixing these, reports will still fail even with the other changes applied.

---

## MISSED ISSUE 1: The `extract` Field is Generated But NEVER Sent to TinyFish (CRITICAL)

The classification prompt generates detailed `extract` specs for every task:
```
"extract": {
  "fields": ["review_text", "star_rating", "reviewer_name"],
  "max_items": 20,
  "filter": "1 and 2 star reviews only"
}
```

But look at what `runTinyFishTask` actually sends to TinyFish (lines 1150-1155):
```
body: JSON.stringify({
  url: task.url_or_query,
  goal: task.goal,
  browser_profile: browserProfile,
  ...proxyConfig,
})
```

**The `extract` field is completely ignored.** All that intelligence about fields, max_items, and filters is thrown away. The goal text is the ONLY thing TinyFish sees, and it says generic things like "Extract all visible review texts on this page."

**Fix:** Inject the extract spec INTO the goal text itself. When building the final goal string, append: "Return ONLY these fields: [fields]. Maximum [max_items] items. Filter: [filter]."

---

## MISSED ISSUE 2: The Prompt Contradicts Itself (CRITICAL)

The classification prompt has two sections that directly contradict each other:

**Section 1 (ABSOLUTE RULES, lines 536-565):** Says "NEVER say first 5 posts, top 10 comments" and "NEVER use words: navigate, click, search, sort, filter, scroll"

**Section 2 (MASTER SOURCE LIST, lines 128-512):** Says things like:
- "extract Ask HN and Show HN threads specifically" (line 164)
- "search for [competitor app name], navigate to ratings and reviews, extract the 20 most recent 1 and 2 star reviews" (lines 234-238)
- "Click the first 3 results, on each YouTube page scroll to the comments section and extract the top 20 comments" (lines 329-333)
- "Open the top 5 question results. For each question, extract the top 3 answers" (embedded in routing rules)

Gemini sees BOTH sets of instructions in the SAME prompt and gets confused. The source-specific guidance overrides the absolute rules.

**Fix:** Remove ALL navigation/multi-step instructions from the MASTER SOURCE LIST. Keep only: when to use, when to skip, and what signal to look for. Move ALL goal-writing guidance to the ABSOLUTE RULES section.

---

## MISSED ISSUE 3: Transformer Goals Are Still Multi-Step Navigation (CRITICAL)

The `transformTasks()` function (lines 935-958) REPLACES classification goals with hardcoded multi-step navigation goals:

- **Apple App Store** (line 943): "Go to google.com and search for... Click the first result. On the App Store page, navigate to Ratings and Reviews. Extract the 20 most recent..."
- **YouTube** (line 956): "Go to google.com and search for... Click the first 3 video results. On each YouTube page, scroll down to the comments section, sort by Top Comments..."

These are exactly the patterns the ABSOLUTE RULES say NOT to use. The transformer undoes any good work the classification prompt does.

**Fix:** Rewrite transformer goals to be extraction-only with pre-built URLs, or remove transformers entirely and let the improved classification prompt handle these platforms correctly.

---

## MISSED ISSUE 4: ALL Fallback Goals Are Multi-Step Navigation (CRITICAL)

Every fallback in `getFallback()` (lines 993-1053) uses the exact anti-patterns:

- Google Play fallback: "Navigate to... Use the search bar to search for... Click the first app result. Scroll down to the Reviews section. Sort by 'Most recent'..."
- Reddit fallback: "Navigate to reddit.com. Use the search bar... Sort results by 'Relevance'... Open the top 5 threads. In each thread, extract the top 15 comments..."
- Quora fallback: "Navigate to quora.com. Use the search bar... Open the top 5 question results. For each question, extract the top 3 answers..."
- HealthUnlocked fallback: "Navigate to... Use the search functionality... Open the top 10 discussion threads. For each thread extract..."

Every single one will timeout because they all require multi-page navigation.

**Fix:** Rewrite all fallback goals to use pre-built search URLs and extraction-only goals.

---

## MISSED ISSUE 5: Scraping Abort Doesn't Actually Cancel In-Flight Tasks

When `scrapingAbort.abort()` fires (either at the 5-min deadline or early exit), it only prevents NEW tasks from starting (line 1478 checks `scrapingAbort.signal.aborted`). But tasks already running each have their OWN `AbortController` inside `runTinyFishTask` and will continue running until their individual 120s timeout.

So the 5-minute deadline is actually 5 minutes + up to 120s for the last batch = potentially 7 minutes, which exceeds the edge function's 400s (6.7 min) limit. This can cause the edge function to be killed mid-stream with no error sent to the user.

**Fix:** Pass the global `scrapingAbort.signal` into `runTinyFishTask` and combine it with the per-task timeout. When the global abort fires, ALL running tasks should cancel immediately.

---

## MISSED ISSUE 6: Early Exit Condition is Too Aggressive

The early exit (lines 1458-1467) triggers when 60% of tasks are done AND 2+ have data. With 5 tasks, this means 3 done + 2 with data = exit, even if tasks 4 and 5 are 2 seconds from completing with valuable data.

**Fix:** Increase to 80% completion OR add a small grace period (10 seconds) after the early exit condition is met to let nearly-complete tasks finish.

---

## Complete Fix List (Previous Plan + New Issues)

Here is every change needed, in implementation order:

### File: `supabase/functions/generate-report/index.ts`

**Change 1: Remove contradictory navigation instructions from MASTER SOURCE LIST (lines 128-512)**
Strip all "navigate to", "click", "search for", "scroll to" language from the source routing rules. Keep only USE WHEN / SKIP WHEN / what signal to look for. This eliminates the prompt self-contradiction.

**Change 2: Rewrite ABSOLUTE RULES section (lines 536-565) with JSON schema enforcement**
Add to the goal-writing rules:
- Every goal MUST include an explicit JSON schema with sample values
- Every goal MUST include termination conditions ("Do not scroll more than 3 times", "Stop after extracting items visible on first load")
- Every goal MUST include edge case handling ("If cookie banner appears, close it first. If login wall appears, return empty array.")
- The `extract.fields` and `extract.max_items` MUST be embedded into the goal text itself

**Change 3: Cap sources at 3-5 (line 117)**
Change "3-15 sources" to "3-5 sources" for all query complexity levels.

**Change 4: Inject extract spec into goal in runTinyFishTask (lines 1150-1155)**
Before sending to TinyFish, append the extract fields/max_items/filter to the goal string so TinyFish actually knows what to extract.

**Change 5: Rewrite transformer goals (lines 935-958)**
Replace multi-step apple_app_store and youtube_comments goals with extraction-only goals using pre-built URLs.

**Change 6: Rewrite ALL fallback goals (lines 993-1053)**
Replace every fallback's `goalTemplate` with extraction-only patterns using pre-built search URLs.

**Change 7: Increase timeout to 180s (line 1079)**
Change `TINYFISH_TIMEOUT_MS` from `120_000` to `180_000`.

**Change 8: Add max_steps to TinyFish API call (line 1150)**
Add `max_steps: 15` to the request body to prevent agents from looping.

**Change 9: Wire global abort into runTinyFishTask**
Pass `scrapingAbort.signal` and combine with the per-task timeout so the 5-min deadline actually cancels running tasks.

**Change 10: Fix early exit condition (lines 1458-1467)**
Change from 60% to 80% OR add a 10-second grace period.

### File: `src/components/ReportPanel.tsx`

**Change 11: Wire "New Report" button**
Add `onNewReport?: () => void` prop. Wire button at line 260 to `onClick={onNewReport}`.

### File: `src/pages/Index.tsx`

**Change 12: Pass handleNewReport to ReportPanel**
Pass `onNewReport={handleNewReport}` to `<ReportPanel>` on lines 141 and 216.

### File: `src/components/SearchInput.tsx`

**Change 13: Fix timing claim**
Change "60-90 seconds" on line 338 to "3-5 minutes".

---

## Summary: Why the Previous Plan Was Incomplete

| Issue | Previous Plan | This Plan |
|-------|--------------|-----------|
| Prompt contradicts itself (source list vs absolute rules) | Not identified | Fix: strip navigation from source list |
| `extract` field never sent to TinyFish | Not identified | Fix: inject into goal text |
| Transformer goals are multi-step | Mentioned but not emphasized as critical | Fix: rewrite to extraction-only |
| ALL fallback goals are multi-step | Mentioned but fix was vague | Fix: rewrite with pre-built URLs |
| Global abort doesn't cancel running tasks | Not identified | Fix: wire signal into runTinyFishTask |
| Early exit too aggressive | Not identified | Fix: increase threshold or add grace |
| Timeout 120s too low | Covered | Same: increase to 180s |
| No max_steps | Covered | Same: add max_steps: 15 |
| Cap sources | Covered | Same: 3-5 max |
| New Report button broken | Covered | Same: wire onClick |
| Timing claim wrong | Covered | Same: update to 3-5 min |
| JSON schema in goals | Covered | Enhanced: also inject extract spec |

Total: **13 changes across 4 files**, all in the edge function and frontend. No database changes needed.

