

## Plan: Fix Refresh Persistence and Expand Source Coverage to 15

### Issue 1: Page Refresh Loses Report Data

**Root cause**: The persistence layer uses `sessionStorage` which works correctly, but the `Index.tsx` component has a logic gap. When the page reloads:
- `useReport` correctly restores `appState: "complete"` from sessionStorage
- But `Index.tsx` initializes `showSplit` based on `appState !== "landing"` -- this works
- The actual bug is that `currentQuery` is captured via closure in `handleEvent`'s `useCallback` dependency. On `report_complete`, `persistState` uses `currentQuery` which may be stale (empty string) if the closure hasn't updated. This means the persisted `query` field is empty, so on reload `query` state starts as `""`, and the report renders but the context is lost.

**Additionally**, `sessionStorage` does NOT survive hard refreshes in all cases (it's cleared when the tab is closed). To make this more robust, we should use `localStorage` instead for completed reports.

**Fix**:
1. Switch from `sessionStorage` to `localStorage` in `useReport.ts`
2. Fix the stale `currentQuery` closure bug by passing `query` directly into `persistState` from the `report_complete` handler rather than relying on the closure
3. Add a TTL check (e.g., 24 hours) so old reports are auto-cleared
4. Ensure `Index.tsx` properly initializes all UI state (query, showSplit, etc.) from the persisted state

### Issue 2: Expand Source Selection from 6-10 to 10-15

**Root cause**: The classification prompt on line 519 explicitly instructs Gemini to "produce 6-10 search tasks." TinyFish can handle up to 15 concurrent tasks.

**Fix**:
1. Update the classification prompt to request **10-15 sources** instead of 6-10
2. Add a new instruction: when a high-signal platform (Reddit, G2, App Stores) covers multiple distinct angles, **split it into multiple focused tasks** rather than one broad task. For example:
   - Reddit Task 1: "Search r/SaaS for complaints about [competitor]"
   - Reddit Task 2: "Search r/startups for '[problem] solution' posts"
   - Reddit Task 3: "Search r/[topic-specific] for feature requests"
3. Update the JSON schema rules to allow multiple tasks per platform when the sub-targets are different (different subreddits, different search queries)
4. Make goals hyper-specific: each task should name exact subreddits, exact search queries, exact filters, and exact field extractions

### Technical Details

**Files to modify:**

**`src/hooks/useReport.ts`**
- Change `sessionStorage` to `localStorage` for the `SESSION_KEY`
- Fix `persistState` call in `report_complete` to capture query from the event handler's own state rather than the stale closure
- Add 24-hour TTL check in `loadPersistedState()`

**`src/pages/Index.tsx`**
- Ensure `showSplit` initializes to `true` when persisted state has a completed report (already partially done, but verify)

**`supabase/functions/generate-report/index.ts`**
- Line 519: Change "6-10 search tasks" to "10-15 search tasks"
- Update task rules to explicitly encourage splitting high-signal platforms into multiple focused sub-tasks with different targets
- Add guidance like: "If Reddit is selected, create 2-3 separate Reddit tasks targeting different subreddits with different search queries. If G2 is selected, create one task for competitor A reviews and another for competitor B reviews."
- Update the "no duplicating platforms" rule to "no duplicating exact targets -- multiple tasks for the same platform are encouraged if they target different pages, subreddits, or search queries"

