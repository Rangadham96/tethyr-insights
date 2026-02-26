
# TinyFish Integration Fix — IMPLEMENTED ✅

Changes shipped to `supabase/functions/generate-report/index.ts`:

1. ✅ **Sync API** — switched from `/v1/automation/run-sse` to `/v1/automation/run` (sync JSON)
2. ✅ **Concurrency 2** — reduced from 5 to prevent TinyFish queueing
3. ✅ **Tasks capped at 3** — 1 Reddit + 2 others (was 5)
4. ✅ **No dual-Reddit** — removed mandatory 2-Reddit-task strategy
5. ✅ **Early-exit abort removed** — all tasks run to completion, only 300s deadline as safety net
6. ✅ **Stream close guard** — `streamClosed` flag prevents double-close TypeError
7. ✅ **dataCount fix** — only increments for sources with actual items > 0
8. ✅ **Uniform 120s timeouts** — no more per-platform timeout complexity
9. ✅ **24h cache check** — kept from previous version
10. ✅ **Thin-result retry** — kept from previous version
