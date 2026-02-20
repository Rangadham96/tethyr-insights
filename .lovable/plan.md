

# Three-Stage Intelligence Pipeline — Final Implementation Plan

## Overview

Build the complete product pipeline as a single Lovable Cloud backend function. Gemini classifies the query into TinyFish tasks, TinyFish scrapes in parallel, Gemini filters and synthesizes into a structured report. The frontend connects via SSE for real-time progress.

## Prerequisites

- Store your **TinyFish API key** as a secret (`TINYFISH_API_KEY`)

## TinyFish API Contract (from official docs)

Based on the full documentation review:

```text
POST https://agent.tinyfish.ai/v1/automation/run-sse
Headers:
  X-API-Key: <TINYFISH_API_KEY>
  Content-Type: application/json
Body:
  {
    "url": "https://example.com",         (required)
    "goal": "plain English instruction",   (required)
    "browser_profile": "stealth",          (optional: "lite" or "stealth")
    "proxy_config": {                      (optional)
      "enabled": true,
      "country_code": "US"
    }
  }
```

**SSE response events from TinyFish:**
- `STARTED` — `{ type: "STARTED", runId, timestamp }`
- `STREAMING_URL` — optional, live browser view URL
- `PROGRESS` — `{ type: "PROGRESS", runId, purpose, timestamp }` (intermediate steps like "Clicking submit button")
- `HEARTBEAT` — keep-alive messages
- `COMPLETE` — `{ type: "COMPLETE", runId, status: "COMPLETED", resultJson: {...}, timestamp }`

The scraped data we need lives in `resultJson` inside the `COMPLETE` event.

**Implementation detail:** We will use `browser_profile: "stealth"` by default since we're scraping real sites (Reddit, App Store, YouTube, etc.) that may have bot detection.

## Architecture

```text
Frontend (POST { query, intents })
    |
    v
Backend Function: generate-report (SSE response stream)
    |
    |-- Stage 1: Gemini 2.5 Pro (Prompt 1)
    |   - Classifies query (market type, audience, maturity, intent)
    |   - Produces 6-10 TinyFish tasks with exact URLs + goals
    |   - Streams: classification_complete, log events
    |
    |-- Stage 2: TinyFish (parallel) + Gemini 2.5 Flash (Prompt 2)
    |   - For each task:
    |     - POST to agent.tinyfish.ai/v1/automation/run-sse
    |       with { url, goal, browser_profile: "stealth" }
    |     - Read SSE stream, collect PROGRESS events as log lines
    |     - Extract resultJson from COMPLETE event
    |     - Run Gemini Flash (Prompt 2) to quality-filter raw data
    |     - Stream: source_update (searching -> done), log events
    |   - All tasks run in parallel
    |
    |-- Stage 3: Gemini 2.5 Pro (Prompt 3)
    |   - Receives all filtered data from all platforms
    |   - Produces final structured report JSON
    |   - Backend normalizes to match frontend ReportData interface
    |   - Streams: report_complete event
    |
    |-- Save completed report to database
```

## What Gets Built

### 1. Secret: TINYFISH_API_KEY

You will be prompted to securely store your TinyFish API key.

### 2. Backend Function: `generate-report`

Single file: `supabase/functions/generate-report/index.ts`

**Request:** POST with `{ query, intents }`
**Response:** SSE stream with events matching frontend expectations

Contains:
- **3 prompt functions** stored separately, exactly as you provided — no modifications
  - `buildClassificationPrompt(query, intents)` — your Prompt 1 verbatim
  - `buildQualityFilterPrompt(platform, itemCount, query)` — your Prompt 2 verbatim
  - `buildSynthesisPrompt(platformCount, totalItems, query, intents)` — your Prompt 3 verbatim

- **TinyFish client** using:
  - `POST https://agent.tinyfish.ai/v1/automation/run-sse`
  - Header: `X-API-Key` from secret
  - Body: `{ url, goal, browser_profile: "stealth" }`
  - Reads SSE stream, forwards `PROGRESS` events as log lines to frontend
  - Extracts `resultJson` from `COMPLETE` event as raw scraped data

- **Schema normalizer** that maps Gemini Prompt 3 output to frontend `ReportData` interface:
  - `problem_validation.evidence` mapped to `problem_validation.quotes`
  - flat `feature_gaps` array mapped to `{ gaps: [...] }`
  - flat `competitor_weaknesses` array mapped to `{ competitors: [...] }`
  - flat `audience_language` array mapped to `{ phrases: [...] }`
  - flat `build_recommendations` array mapped to `{ recommendations: [...] }`

- **Error handling:**
  - TinyFish task fails: platform marked `status: "error"`, excluded from Stage 3
  - Gemini returns invalid JSON: retry once, then fail gracefully
  - All platforms fail: stream error event to frontend

### 3. Frontend API Update

**`src/services/api.ts`:**
- `submitReport()` now constructs the full backend function URL and opens a fetch-based SSE connection
- Reads the SSE stream and dispatches events to `useReport` handlers
- Mock mode remains as fallback (when no `TINYFISH_API_KEY` is configured, or for local dev)

**`src/hooks/useReport.ts`:**
- Minor update to call the new streaming API
- Event handling stays the same — event names (`classification_complete`, `source_update`, `log`, `report_complete`) are unchanged

### 4. Database Persistence

On `report_complete`, the backend function saves to the `reports` table:
- `query`, `status: "complete"`, full report JSON in `report_data`
- Classification metadata

## SSE Event Timeline (what the frontend receives)

```text
1. log: "Classifying query and selecting optimal sources..."
2. classification_complete: { market_type, sources_selected, sources_skipped, ... }
3. log: "Dispatching 8 TinyFish agents in stealth mode..."
4. source_update: { platform: "reddit", status: "searching" }
5. log: "Reddit: Navigating to r/mentalhealth..."         (from TinyFish PROGRESS)
6. source_update: { platform: "reddit", status: "done", items_found: 34 }
7. (repeat for each platform, arriving as they complete)
8. log: "All sources collected. Synthesizing report..."
9. report_complete: { full ReportData JSON }
```

## Model Selection

| Stage | Model | Reason |
|-------|-------|--------|
| 1 (Classification) | google/gemini-2.5-pro | Complex routing logic with 30+ source rules |
| 2 (Quality Filter) | google/gemini-2.5-flash | Runs per-platform, needs speed. Simple filter task. |
| 3 (Synthesis) | google/gemini-2.5-pro | Final report requires deep reasoning across all data |

## Implementation Order

1. Prompt you to add TinyFish API key as a secret
2. Create `supabase/functions/generate-report/index.ts` with all 3 stages, 3 prompts verbatim, TinyFish client with exact API format
3. Update `src/services/api.ts` to call the backend function with SSE streaming
4. Update `src/hooks/useReport.ts` to use the new flow
5. Deploy and test end-to-end

## Files Changed

| File | Action |
|------|--------|
| `supabase/functions/generate-report/index.ts` | Create |
| `src/services/api.ts` | Update |
| `src/hooks/useReport.ts` | Update |
| `src/types/report.ts` | Minor updates if needed |

