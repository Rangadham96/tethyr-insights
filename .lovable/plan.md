

# Get Comprehensive Results — Implementation Plan

## Problem
Reports return 8-11 data points and default to "UNCLEAR" verdicts. Three root causes identified by comparing our implementation against TinyFish best practices.

## Changes (all in `supabase/functions/generate-report/index.ts`)

### 1. Increase Concurrency: 3 to 5

The battle plan explicitly says "fire 5 Reddit calls simultaneously instead of sequentially." With 5 tasks capped and only 3 concurrent slots, 2 tasks always queue behind — wasting the entire timeout of the first batch before starting.

- Change `MAX_CONCURRENT_AGENTS` from 3 to 5
- All 5 tasks now run truly in parallel

### 2. Cut Timeouts in Half

The battle plan says TinyFish calls take "10-30 seconds each." Our timeouts are 120-180s — a task that hasn't returned in 90s is almost certainly stuck. Cutting timeouts means failed tasks fail fast, leaving time budget for retries.

- Default timeout: 180s to 90s
- Reddit: 180s to 90s
- Short-leash platforms (HackerNews, ProductHunt, Quora): 120s to 75s

### 3. Auto-Retry Thin Results with Broader Query

After a task completes with fewer than 5 items, automatically retry with a simplified 2-keyword version of the query. This catches cases where the LLM generated an overly specific query.

Logic (added after quality filter, before incrementing doneCount):

```text
if filtered items < 5 AND deadline not reached AND not already a retry:
  1. Extract 2 broadest keywords from query (simple string split, no LLM)
  2. Build broader URL for same platform
  3. Run second TinyFish task
  4. Merge + deduplicate items by title
  5. Re-run quality filter on combined set
```

Guard: a `retried` flag per task prevents infinite loops.

### 4. Dual-Angle Reddit in Classification Prompt

Update `buildClassificationPrompt` to instruct the LLM to generate TWO Reddit tasks with different query angles when Reddit is selected:

```text
MULTI-TASK STRATEGY FOR REDDIT:
When selecting Reddit, generate TWO separate tasks:
  1. Pain/frustration angle (e.g., "invoicing frustration freelance")
  2. Competitor/alternative angle (e.g., "invoice tool alternative")
Each Reddit task counts toward the 5-task cap.
```

This doubles Reddit coverage without code hacks — the LLM naturally generates complementary queries.

### 5. Cache Check Before Scraping (Quick Win)

Before starting the pipeline, check if a report for the same query exists in the `reports` table within the last 24 hours. If so, return it immediately via SSE — saves TinyFish credits and gives instant results.

```text
if (userId && teamId):
  check reports table for matching query + team_id where created_at > 24h ago
  if found: stream cached report_data as report_complete event, skip pipeline
```

## Expected Impact

| Metric | Current | After |
|--------|---------|-------|
| Items per report | 8-11 | 25-40 |
| Total scraping time | ~180s (sequential bottleneck) | ~90s (full parallel) |
| Verdict accuracy | Mostly "UNCLEAR" | Appropriate to volume |
| Reddit coverage | 1 query, 3-5 hits | 2 queries + retry, 15-25 hits |
| Repeat queries | Full re-scrape every time | Instant from cache |

## Risk Assessment

- **Low**: Concurrency and timeout changes are single-constant edits
- **Low**: Retry has a `retried` flag guard — no infinite loops possible
- **Low**: Dual-Reddit is a soft prompt instruction — if LLM ignores it, we get 1 Reddit task as before
- **None**: Cache check is read-only with graceful fallthrough

## Files Changed

| File | What Changes |
|------|-------------|
| `supabase/functions/generate-report/index.ts` | Concurrency 3 to 5, timeouts halved, thin-result retry logic, dual-Reddit prompt instruction, 24h cache check |

## No Changes Needed

- PDF layout (already fixed)
- Confidence scaling rules (already in place)
- Phantom item filtering (already in place)
- Frontend components (no UI changes needed)
- Fallback logic (already working)

