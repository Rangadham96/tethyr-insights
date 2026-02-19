

# Tethyr: Complete Production Build

## Pre-Build Notes Acknowledged

Three observations noted and integrated:
- **Index.tsx complexity**: Step 16 orchestrates 5 states, landing transition, lifted query state, and hook integration. Will rebuild in isolation if buggy.
- **Mock SSE timing**: Currently 500ms to 8000ms (7.5s window). Will stretch to 12 seconds if demo feels rushed -- one-line change in api.ts.
- **Mobile transition testing**: Landing-to-searching transition on mobile is the highest-risk visual glitch point. Will test immediately after build.

## Implementation Order (17 Steps)

### Step 1: Environment Files
- `.env.example` with `VITE_API_URL=https://your-railway-app.railway.app`
- `.env.local` with `VITE_API_URL=http://localhost:3001`

### Step 2: TypeScript Types (`src/types/report.ts`)
All interfaces matching the backend contract:
- `UserTier` -- `"free" | "founder" | "team" | "studio"`
- `AppState` -- `"landing" | "idle" | "searching" | "complete" | "error"`
- `SubmitReportRequest` -- `{ query, intents, sessionId, tier }`
- `SubmitReportResponse` -- `{ reportId, status }`
- `SourceUpdateEvent` -- `{ platform, status, items_found, message }`
- `LogEvent` -- `{ text, type }`
- `SelectedSource` -- `{ platform, display_name, selection_reason, priority }`
- `ClassificationEvent` -- `{ market_type, audience_type, problem_maturity, routing_rationale, sources_selected, sources_skipped }`
- `Verdict` -- `"CONFIRMED" | "PARTIAL" | "UNCLEAR" | "INVALIDATED"`
- `ReportData` -- full report_complete payload including `meta.sources_used`
- `SourceInfo` -- runtime source tracking with `selection_reason` field

### Step 3: Source Registry (`src/constants/sources.ts`)
`SOURCE_REGISTRY`: typed record of 29 platforms keyed by platform string. Each entry: `display_name`, `category`, `description`. Categories: discussion, app_stores, reviews, social, forums, research, jobs, ecommerce. All UI source rendering resolves through this registry.

### Step 4: API Service (`src/services/api.ts`)
- Reads `import.meta.env.VITE_API_URL`, exports `API_BASE_URL`
- `submitReport(query, intents, tier)` -- POST to `/api/report`
- `createReportStream(reportId)` -- EventSource for SSE
- Mock mode simulating full lifecycle over ~10 seconds:
  - t=300ms: returns reportId
  - t=500ms: fires `classification_complete` (health/wellness mock)
  - t=1000ms-8000ms: staggered source updates + log lines
  - t=9000ms: fires `report_complete` with full mock data

### Step 5: SSE Utilities (`src/services/sse.ts`)
Type-safe event parser handling `source_update`, `log`, `classification_complete`, `report_complete`.

### Step 6: useReport Hook (`src/hooks/useReport.ts`)
Manages: `appState` (default "landing"), `sources[]`, `logLines[]`, `reportData`, `userTier`, `classification`, `skippedSources`. Handles `classification_complete` by replacing source list with selected sources. Cleanup on unmount.

### Step 7: CopyButton (`src/components/CopyButton.tsx`)
Hover-triggered "Copy" in Geist Mono 8px. Copies text + attribution via native clipboard API. Shows "Copied" for 1.5s. No toast, no library.

### Step 8: TierGate (`src/components/TierGate.tsx`)
Wraps locked sections. Tier hierarchy check. If insufficient: CSS blur (6px), pointer-events disabled, lock icon, description, amber "Start free trial" CTA. Newspaper aesthetic.

### Step 9: SearchInput (`src/components/SearchInput.tsx`)
Shared component with `variant: "landing" | "panel"`. Six layers:
1. Intent tabs (5 tabs, hide on typing)
2. Textarea with expanding focus state and amber hint bar
3. Character quality indicator (red below 80, green 80-200, green "Detailed" above 200)
4. Contextual nudge (20-79 chars, content-aware suggestions)
5. Tips panel (toggle, 2x2 grid of tip cards with clickable examples)
6. Contextual examples (3 per intent tab, 15 total, click-to-fill)

### Step 10: EmptyState (`src/components/EmptyState.tsx`)
Right panel for idle state. Playfair headline, Crimson paragraph, 3 clickable example queries with red-on-hover borders.

### Step 11: SearchingState (`src/components/SearchingState.tsx`)
Classification card at top (amber border, market type + routing rationale). Live log feed below with section-in animations. Lines styled by type. Progress summary.

### Step 12: LandingPage (`src/components/LandingPage.tsx`)
Full scrolling page, 8 sections with IntersectionObserver fade-up animations:
1. **Hero**: Sticky nav with blur, "TRUTH" background text, headline, SearchInput (variant="landing")
2. **The Problem**: Two columns, three stat blocks in red Playfair
3. **How It Works**: Dark section (bg-ink), four horizontal steps with amber labels
4. **Sources**: Accordion of 6 categories from SOURCE_REGISTRY, dynamic selection note
5. **What Makes Tethyr Different**: 3x2 claim cards
6. **What's In Your Report**: 2-column section cards with tier badges
7. **Pricing**: 4-column grid, Founder card dark
8. **Final CTA**: Second SearchInput instance, "honest answer" headline

Footer with logo and copyright.

### Step 13: ReportPanel Refactor (`src/components/ReportPanel.tsx`)
- Data-driven from `reportData` prop
- Four verdict states: CONFIRMED (green), PARTIAL (amber), UNCLEAR (red), INVALIDATED (red) with specific copy
- Report header renders `meta.sources_used` names via SOURCE_REGISTRY
- CopyButton on every quote (section 01) and phrase (section 04)
- Sections 04 and 05 wrapped in TierGate (requiredTier="founder")

### Step 14: LeftPanel Refactor (`src/components/LeftPanel.tsx`)
- Uses SearchInput (variant="panel") instead of inline textarea
- Sources driven by classification_complete + source_update SSE events
- Each source row: display name, selection reason in italic Crimson Pro, status badge, count
- Collapsed "Not searched" section showing skipped sources with reasons
- Dynamic progress bar

### Step 15: Ticker Refactor (`src/components/Ticker.tsx`)
- Landing: static branding
- Idle: generic platform names
- Searching: short platform statuses only ("Reddit: 34 threads found")
- Complete: summary stats

### Step 16: Index.tsx Refactor (`src/pages/Index.tsx`)
Five-state orchestration:
- `landing`: renders LandingPage full screen
- `idle`: split panel with EmptyState
- `searching`: split panel with SearchingState
- `complete`: split panel with ReportPanel
- `error`: split panel with retry

Landing-to-searching: 300ms fade out, 300ms fade in. Query preserved. No back button.

### Step 17: Tailwind Config
Add scroll arrow bounce animation. Nothing else changes.

## Risk Mitigation
- Index.tsx (step 16) is the highest complexity file -- will rebuild in isolation if needed
- Mock SSE timing adjustable to 12s if demo feels rushed
- Mobile landing-to-searching transition tested immediately after build
- All CSS variables, keyframes, design tokens remain untouched

