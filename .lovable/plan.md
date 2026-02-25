

# Fix Scraping Reliability + PDF Layout Issues

## Assessment of the Feedback

The feedback identifies **two distinct problems**: backend scraping reliability (critical) and PDF layout quality (cosmetic but important for demos). The previously proposed plan addresses scraping but misses the PDF issues. This plan covers both.

---

## Part A: PDF Layout Problems

Looking at the exported PDF, several alignment issues are visible:

1. **Feature Gaps table columns overlap**: The GAP text column (`ML + 8`) is only allocated `CW - 50` mm width, but FREQ is placed at `ML + CW - 30` and STATUS at `ML + CW - 12`. When gap descriptions are long, text bleeds into the FREQ column.

2. **Competitor table is too cramped**: Four equal columns (`CW/4 = 42.5mm` each) is not enough for prose-heavy content. The "WHAT USERS HATE" and "YOUR OPENING" columns wrap excessively at 8.5pt font.

3. **Quotes layout wastes space**: The source label is right-aligned at `ML + 24` (only 24mm from left margin), but the quote text starts at `ML + 30`. This means 30mm of the 170mm content width is used for a short label, and the quote only gets 140mm.

4. **Line height inconsistencies**: `splitText` returns lines, but the y-increment multipliers vary (4, 3.8, 4.5, 6.5) without matching the actual font sizes used. At 10pt (body), line height should be ~4.2mm; at 9pt, ~3.8mm; at 8.5pt, ~3.6mm.

5. **Verdict block has fixed 10mm height** but the text may wrap to more lines, causing text to overflow the background rectangle.

### PDF Fixes (in `src/lib/exportPdf.ts`)

- Widen left margin to 22mm, keep right at 18mm for a more editorial feel
- Quotes: reduce source label width to 18mm, start quote at ML + 20 (gives quote 150mm)
- Feature Gaps: use proportional columns -- GAP gets 60% of CW, FREQ 15%, STATUS 15%, number 10%
- Competitor table: switch from 4 equal columns to weighted (20% / 25% / 30% / 25%)
- Verdict block: dynamically size the background rectangle height based on actual text lines
- Standardize line-height multipliers to match font sizes consistently

---

## Part B: Scraping Reliability (5 changes)

### Change 1: Route Reddit through Google site-search

Reddit's native search (`old.reddit.com/search/`) is unreliable for compound queries. Google site-search works reliably (proven by ProductHunt and IndieHackers patterns).

**In `buildClassificationPrompt`**, update the Reddit URL rule:
```
reddit -- USE WHEN: almost always. 
URL MUST USE: https://www.google.com/search?q=site:reddit.com+[subreddit]+[terms]
(do NOT use old.reddit.com/search directly -- it often returns empty results)
```

**In `PLATFORM_BASE_URLS`**, change reddit's base to `https://www.google.com/search?q=site:reddit.com`.

### Change 2: Route Twitter/X through Google site-search

Twitter is consistently login-walled. Update the classification prompt:
```
twitter_x -- USE WHEN: EMERGING problems, real-time reactions.
URL MUST USE: https://www.google.com/search?q=site:twitter.com+OR+site:x.com+[terms]
(do NOT use twitter.com directly -- login wall blocks all scraping)
```

### Change 3: Add Reddit fallback in `getFallback()`

Currently there's no `case "reddit"` in the fallback switch. Add one that retries via Google site-search with broader terms:
```typescript
case "reddit":
  return {
    platform: "reddit",
    label: "Reddit (via Google)",
    urlTemplate: (t) => `https://www.google.com/search?q=site:reddit.com+${encodeURIComponent(t)}`,
    goalTemplate: (t) => `Extract all visible Google search result titles and snippets...`
  };
```

### Change 4: Confidence scaling in synthesis prompt

Add mandatory rules to `buildSynthesisPrompt`:
```
CONFIDENCE SCALING RULES (MANDATORY):
- If total data_points < 15: verdict MUST be "UNCLEAR" or "PARTIAL"  
- If a feature gap has frequency <= 2 mentions: it CANNOT be ranked above position 3
- build_recommendations with evidence_count <= 2: set rank no higher than 3
- NEVER use language like "Focus on" or "HIGH PRIORITY" for anything with < 5 data points
- If competitors are not directly mentioned in data: write "Insufficient data to assess" for users_value and users_hate
```

### Change 5: Fix phantom item inflation

The raw-data safety net at line 1313-1315 counts `{items: [], error: "login_wall_encountered"}` as having content because `Object.keys(rawData).length > 0` is true. Fix to check for actual items:
```typescript
const hasRawContent = Array.isArray(rawData) 
  ? rawData.length > 0
  : (typeof rawData === "object" && rawData !== null 
     && Array.isArray((rawData as any).items) 
     && (rawData as any).items.length > 0);
```

---

## Files Changed

| File | What changes |
|------|-------------|
| `supabase/functions/generate-report/index.ts` | Changes 1-5: Reddit/Twitter Google routing, fallback, synthesis confidence rules, phantom item fix |
| `src/lib/exportPdf.ts` | Column proportions, quote layout, verdict block sizing, line-height consistency |

## Expected Impact

- **Data volume**: Reddit and Twitter queries go through Google (proven reliable), should increase from ~10 to 30-50 items per report
- **Synthesis honesty**: Reports with thin data will have appropriately cautious language and lower-priority recommendations  
- **PDF quality**: Proper column alignment, no text overlap, professional A4 layout suitable for demo/pitch

## Risk

Low. The Google site-search approach is already proven for ProductHunt and IndieHackers in the existing codebase. PDF changes are purely visual with no logic impact.

