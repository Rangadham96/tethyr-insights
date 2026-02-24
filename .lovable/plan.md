

# Plan: Fix Low Data Yield (1 Item Per Source) and Timeout Issues

## What's Happening Now

After all previous fixes, the pipeline works end-to-end but has two remaining problems:

1. **Reddit and HackerNews return only 1 item each** (should be 10-15)
2. **AlternativeTo and ProductHunt consistently timeout** after 180 seconds with no data

The report completes but with thin data (e.g., 3 total items across 2 sources), producing weak analysis.

## Root Cause Analysis

### Why only 1 item per source?

Looking at the TASK RESULT logs, the `resultData` extraction logic (line 908) captures `event.resultJson || event.result` from TinyFish's COMPLETE event. The issue is likely that TinyFish returns a nested object like `{"items": [...]}` and we count it as "1 item" because `Array.isArray(resultData)` is false -- it's an object with an `items` array inside.

The item count logging at line 925 does:
```
const itemCount = Array.isArray(resultData) ? resultData.length : 1;
```

This counts `{"items": [15 posts]}` as **1 item**. The data is probably fine, but our logging is misleading. Need to verify this by also checking what the quality filter receives.

### Why AlternativeTo and ProductHunt timeout?

These are heavy JS SPAs behind Cloudflare. Even with stealth + proxy, 180s may not be enough for the page to fully render. Two options:
- Increase timeout for these specific platforms
- Replace them with more reliable alternatives

## Changes

### 1. Fix item count logging to show actual items (edge function)
Update the SUCCESS log to unwrap nested `{items: [...]}` before counting. This will tell us if we're actually getting good data that just looks like "1 item."

### 2. Add detailed data shape logging (edge function)
Log the actual shape of `resultData` (keys, types, nested array lengths) so we can see exactly what TinyFish returns. This is critical to know if the "1 item" problem is a logging bug or a real extraction issue.

### 3. Replace AlternativeTo with a more reliable source (edge function)
AlternativeTo consistently times out. For competitor analysis, redirect to Reddit with a comparison-focused query (e.g., `"[product] alternatives OR competitors"`). This is pragmatic -- we get competitor signal from discussions rather than a catalog site.

### 4. Replace ProductHunt with a Google site-search fallback (edge function)
Instead of scraping producthunt.com directly (heavy SPA), use Google to search ProductHunt: `site:producthunt.com [query]`. Google renders the results as simple HTML that TinyFish can extract reliably.

### 5. Add per-platform timeout overrides (edge function)
Instead of a flat 180s for all platforms, allow certain platforms (like Quora, HealthUnlocked) to have shorter timeouts (120s) so the pipeline doesn't waste time on slow sources.

## Technical Details

### File: `supabase/functions/generate-report/index.ts`

**Change 1: Fix item count in logging (around line 924-926)**
```
// Before
const itemCount = Array.isArray(resultData) ? resultData.length : 1;

// After  
let itemCount = 1;
if (Array.isArray(resultData)) {
  itemCount = resultData.length;
} else if (resultData && typeof resultData === "object") {
  const rd = resultData as Record<string, unknown>;
  if (Array.isArray(rd.items)) itemCount = rd.items.length;
  else if (Array.isArray(rd.data)) itemCount = rd.data.length;
}
```

**Change 2: Add data shape logging after TinyFish returns (after line 926)**
```
console.info(`[TASK DATA SHAPE] ${task.platform} | ${JSON.stringify(resultData).substring(0, 500)}`);
```

**Change 3: Replace AlternativeTo in classification prompt (line 81)**
Change `alternativeto` from a primary source to a deprioritized one. Add guidance to use Reddit competitor discussions instead:
```
alternativeto -- USE WHEN: NEVER as primary (high timeout rate). Use reddit with "[competitor] alternatives" query instead.
```

**Change 4: Replace ProductHunt with Google site-search (in classification prompt, line 79)**
Update the URL pattern for ProductHunt to use Google site-search:
```
producthunt -- USE WHEN: B2C_APP, B2B_SAAS, DEVELOPER_TOOLS. 
URL pattern: https://www.google.com/search?q=site:producthunt.com+[query]
```
Also update the `PLATFORM_BASE_URLS` and remove `producthunt` from `STEALTH_PLATFORMS` and `PROXY_PLATFORMS` since Google doesn't need stealth.

**Change 5: Per-platform timeout map (replace getTimeout function)**
```
const PLATFORM_TIMEOUTS: Record<string, number> = {
  reddit: 180_000,
  hackernews: 120_000,
  producthunt: 120_000, // Google site-search is fast
  indiehackers: 150_000,
  quora: 120_000,
};
function getTimeout(platform: string): number {
  return PLATFORM_TIMEOUTS[platform] || TINYFISH_TIMEOUT_MS;
}
```

## Expected Outcome

- If the "1 item" is actually a logging bug (nested object), real data yield is already fine and we just fix the metric
- If it's a real extraction issue, the data shape logs will tell us exactly what TinyFish returns so we can fix parsing
- AlternativeTo timeouts eliminated by redirecting to Reddit
- ProductHunt timeouts eliminated by using Google as intermediary
- Faster overall pipeline due to per-platform timeouts
