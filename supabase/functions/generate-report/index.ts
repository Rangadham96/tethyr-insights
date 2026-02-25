import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════
// SSE HELPERS
// ═══════════════════════════════════════════════

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function logEvent(text: string, type: "searching" | "found" | "info" | "error" = "info"): string {
  return sseEvent("log", { text, type });
}

// ═══════════════════════════════════════════════
// PROMPT 1 — CLASSIFICATION (Gemini 2.5 Pro)
// ═══════════════════════════════════════════════

function buildClassificationPrompt(query: string, intents: string[]): string {
  return `You are a senior market research director. Your job is to convert 
a founder or PM's question into precise internet search tasks, 
selecting the best sources for that specific type of query.

THE QUERY: "${query}"
WHAT THEY WANT TO KNOW: "${intents.join(", ")}"

═══════════════════════════════════════════════
STEP 1 — CLASSIFY THE QUERY
═══════════════════════════════════════════════

Before selecting any sources, classify this query across 
four dimensions. Return your classification as part of the 
JSON output.

MARKET TYPE — which best describes this?
- B2B_SAAS: software sold to businesses
- B2C_APP: consumer-facing app
- MARKETPLACE: connects two sides
- PHYSICAL_PRODUCT: hardware, consumer goods
- SERVICE_BUSINESS: agency, consulting
- HEALTH_WELLNESS: physical or mental health, medical, fitness
- FINANCE: payments, investing, insurance, banking
- CREATOR_TOOLS: content creation, media
- DEVELOPER_TOOLS: APIs, infrastructure, dev tooling
- EDUCATION: learning, courses, tutoring
- UNKNOWN: cannot determine

AUDIENCE TYPE — who is the end user?
- FOUNDERS_PMS / DEVELOPERS / ENTERPRISE_BUYERS
- CONSUMERS_GENERAL / PROFESSIONALS / CREATORS
- STUDENTS / SMALL_BUSINESS

PROBLEM MATURITY:
- ESTABLISHED / EMERGING / NOVEL

QUERY INTENT:
- VALIDATE / GAPS / COMPETE / LANGUAGE / BUILD / ALL

═══════════════════════════════════════════════
STEP 2 — SELECT SOURCES (3-5 ONLY)
═══════════════════════════════════════════════

Select exactly 3-5 sources from the list below. NEVER more than 5.
Fewer sources = faster, more reliable results.

MASTER SOURCE LIST — USE WHEN / SKIP WHEN only:

── DISCUSSION & COMMUNITY ──
reddit — USE WHEN: almost always. SKIP WHEN: never.
hackernews — USE WHEN: DEVELOPER_TOOLS, B2B_SAAS, FOUNDERS_PMS. SKIP WHEN: HEALTH_WELLNESS, CONSUMERS_GENERAL.
indiehackers — USE WHEN: FOUNDERS_PMS, B2B_SAAS, VALIDATE/GAPS. SKIP WHEN: HEALTH_WELLNESS, CONSUMERS_GENERAL.
producthunt — USE WHEN: B2C_APP, B2B_SAAS, DEVELOPER_TOOLS. SKIP WHEN: PHYSICAL_PRODUCT, SERVICE_BUSINESS. URL MUST USE: https://www.google.com/search?q=site:producthunt.com+[query] (do NOT use producthunt.com directly).
quora — USE WHEN: CONSUMERS_GENERAL, EDUCATION, HEALTH_WELLNESS. SKIP WHEN: DEVELOPER_TOOLS.
alternativeto — *** DEPRIORITIZED — HIGH TIMEOUT RATE ***. Instead, add a second reddit task with "[competitor] alternatives OR vs" query for competitor intelligence.
discord_public — USE WHEN: DEVELOPER_TOOLS, CREATOR_TOOLS, GAMING.

── APP STORES ──
apple_app_store — USE WHEN: B2C_APP, HEALTH_WELLNESS, EDUCATION, FINANCE mobile products.
google_play_store — USE WHEN: same as apple_app_store.
chrome_web_store — USE WHEN: browser extensions, DEVELOPER_TOOLS.

── PROFESSIONAL REVIEW PLATFORMS ──
g2 — *** BLOCKED — DO NOT SELECT *** (aggressive CAPTCHA, always fails)
capterra — *** BLOCKED — DO NOT SELECT *** (aggressive CAPTCHA, always fails)
trustpilot — USE WHEN: CONSUMERS_GENERAL, FINANCE, SERVICE_BUSINESS. SKIP WHEN: B2B_SAAS.
glassdoor — *** BLOCKED — DO NOT SELECT *** (login wall, always fails)
bbb_complaints — USE WHEN: CONSUMERS_GENERAL, FINANCE, SERVICE_BUSINESS.

── SOCIAL PLATFORMS ──
youtube_comments — USE WHEN: HEALTH_WELLNESS, CREATOR_TOOLS, EDUCATION, CONSUMERS_GENERAL. SKIP WHEN: DEVELOPER_TOOLS.
twitter_x — USE WHEN: EMERGING problems, real-time reactions, COMPETE intent. SKIP WHEN: ESTABLISHED problems.
linkedin_comments — USE WHEN: B2B_SAAS, ENTERPRISE_BUYERS, PROFESSIONALS.
facebook_groups_public — *** BLOCKED — DO NOT SELECT ***
tiktok_comments — *** BLOCKED — DO NOT SELECT ***

── FORUMS & NICHE ──
discourse_forums — USE WHEN: competitor has a public Discourse forum.
stackoverflow_stackexchange — USE WHEN: DEVELOPER_TOOLS, technical products. SKIP WHEN: CONSUMERS_GENERAL.
patient_communities — USE WHEN: HEALTH_WELLNESS always. Sources: HealthUnlocked, PatientsLikeMe.

── MARKET INTELLIGENCE ──
job_postings — USE WHEN: COMPETE intent, VALIDATE for ESTABLISHED markets.
amazon_reviews — USE WHEN: PHYSICAL_PRODUCT, CONSUMERS_GENERAL.
podcast_transcripts — USE WHEN: HEALTH_WELLNESS, EDUCATION, FINANCE.
academic_papers — USE WHEN: HEALTH_WELLNESS, NOVEL problems. SKIP WHEN: CONSUMERS_GENERAL.
substack_comments — USE WHEN: FINANCE, HEALTH_WELLNESS, CREATOR_TOOLS.
indie_review_sites — USE WHEN: DEVELOPER_TOOLS, B2B_SAAS.

═══════════════════════════════════════════════
STEP 3 — GENERATE SEARCH TASKS (3-5 TASKS ONLY)
═══════════════════════════════════════════════

CRITICAL — WRITING EFFECTIVE GOALS FOR TINYFISH:

TinyFish is a browser-automation agent. It works best when given a SINGLE PAGE and told to EXTRACT WHAT IS VISIBLE.

ABSOLUTE RULES FOR EVERY GOAL:

1. The url_or_query MUST be a fully-formed URL that lands DIRECTLY on the data page.
   URL EXAMPLES (search params pre-embedded):
   - Reddit: https://old.reddit.com/r/SaaS/search/?q=CRM+frustrations&sort=top&t=year
   - G2: https://www.g2.com/products/asana/reviews?segment=small-business
   - HN: https://hn.algolia.com/?q=CRM&type=story&sort=byPopularity
   - Capterra: https://www.capterra.com/p/12345/ProductName/reviews/
   - ProductHunt: https://www.producthunt.com/products/folk/reviews
   - Google Play: https://play.google.com/store/search?q=meditation+app&c=apps
   - Apple (via Google): https://www.google.com/search?q=site:apps.apple.com+meditation+app+reviews
   - YouTube (via Google): https://www.google.com/search?q=site:youtube.com+meditation+app+review
   - Quora: https://www.quora.com/search?q=best+CRM+for+small+teams
   - HealthUnlocked: https://healthunlocked.com/search/anxiety+treatment
   - AlternativeTo: https://alternativeto.net/software/notion/

2. The goal MUST follow this EXACT structure:

   "Extract all visible [THING] on this page.

   For each item, extract ONLY these fields:
   - field_name_1 (type, e.g. 'Example value')
   - field_name_2 (type, e.g. 'Example value')

   STOP CONDITIONS:
   - Stop after extracting [max_items] items OR all visible items, whichever is fewer
   - Scroll down to load content if needed, but stop after 5 scrolls maximum
   - If a "Load More" button exists, click it once to load additional items
   - Do NOT navigate away from this page (no clicking into posts, threads, or detail pages)

   EDGE CASES:
   - If a cookie/consent banner appears, close it first
   - If a login wall appears, return empty array immediately
   - If CAPTCHA appears, return empty array immediately

   Return JSON: {'items': [{'field_name_1': '...', 'field_name_2': '...'}]}
   If no data found, return: {'items': [], 'error': 'no_data_visible'}"

3. NEVER use these words in goals: navigate, click, search, sort, filter, scroll, find, go to, open, visit, select, browse.
4. NEVER ask TinyFish to visit multiple pages, click into threads, or perform multi-step workflows.
5. NEVER say "first 5 posts", "top 10 comments" — use "all visible" and let max_items handle limits.

GOOD GOAL EXAMPLE:
  url: "https://old.reddit.com/r/SaaS/search/?q=CRM+frustrations&sort=top&t=year"
  goal: "Extract all visible post titles and preview text on this page.
  
  For each item, extract ONLY:
  - post_title (string, e.g. 'Why I ditched HubSpot')
  - preview_text (string, first 200 chars, e.g. 'After 6 months of...')
  - upvotes (number, e.g. 42)
  - comment_count (number, e.g. 15)
  - subreddit (string, e.g. 'r/SaaS')

  STOP CONDITIONS:
  - Stop after 15 items or all visible, whichever is fewer
  - Scroll down to load content if needed, but stop after 5 scrolls maximum
  - If a "Load More" button exists, click it once
  - Do NOT navigate away from this page (no clicking into posts)

  EDGE CASES:
  - If cookie banner appears, close it first
  - If login wall appears, return empty array

  Return JSON: {'items': [{'post_title': '...', 'preview_text': '...', 'upvotes': 0, 'comment_count': 0, 'subreddit': '...'}]}
  If no data found, return: {'items': [], 'error': 'no_data_visible'}"

BAD GOALS (will timeout — DO NOT USE):
  "Extract top 3 comments from the first 5 posts" ← navigates into multiple posts
  "For the first 20 reviews from small-business users" ← filtering on page
  "Find 5 relevant discussion posts and extract comments" ← multi-page navigation

6. The extract.fields array MUST list the exact same field names used in the goal text.
7. The extract.max_items MUST match the number in the goal's STOP CONDITIONS.

Return this exact JSON structure:

{
  "classification": {
    "market_type": string,
    "audience_type": string,
    "problem_maturity": string,
    "query_intent": string,
    "routing_rationale": string (2-3 sentences),
    "routing_skipped": [
      { "source": string, "reason": string }
    ]
  },
  "tasks": [
    {
      "platform": string,
      "priority": number (1 = highest),
      "url_or_query": string (exact URL with search params),
      "goal": string (following the EXACT structure above),
      "selection_reason": string,
      "extract": {
        "fields": [array of field names matching goal],
        "max_items": number (matching goal STOP CONDITIONS),
        "filter": string
      }
    }
  ]
}

Return only valid JSON. No markdown. No explanation.`;
}

// ═══════════════════════════════════════════════
// PROMPT 2 — QUALITY FILTER (Gemini 2.5 Flash)
// ═══════════════════════════════════════════════

function buildQualityFilterPrompt(platform: string, itemCount: number, query: string): string {
  return `You are a quality controller reviewing raw scraped internet data 
before it goes into a market intelligence report.

You have received raw data from ${platform} containing 
${itemCount} items related to this query: ${query}

IMPORTANT: The data comes from a browser automation agent that extracts 
structured fields from web pages. Items may be short (titles, snippets, 
review summaries). This is NORMAL — short items are still valid signal.

Your job:

1. Remove ONLY items that are: completely off-topic (unrelated to the query),
   obvious spam/advertising, or clearly bot-generated gibberish.
   
   DO NOT remove items just because they are short. A post title like 
   "What CRM do you use for your small team?" IS valid signal.
   A review snippet like "Too expensive for small teams" IS valid signal.
   Even a single sentence expressing frustration or a need is valid.

2. Flag the overall signal strength as one of:
   - STRONG: 10+ relevant items
   - MODERATE: 5-9 relevant items  
   - WEAK: 1-4 relevant items
   - NONE: zero relevant items found (data was entirely off-topic or empty)

3. For each item that passes, preserve ALL original fields and add:
   - core_insight: one sentence summarizing the signal (complaint, request, or observation)
   - sentiment: frustrated / requesting / praising / neutral

CRITICAL: Be INCLUSIVE, not exclusive. When in doubt, KEEP the item.
The synthesis stage will handle deeper analysis. Your job is only to 
remove obvious garbage, not to judge quality.

Return JSON: {"signal": "STRONG|MODERATE|WEAK|NONE", "items": [...]}
If truly no relevant items exist, return {"signal": "NONE", "items": []}

Do not summarise. Do not paraphrase. Preserve all original data fields.`;
}

// ═══════════════════════════════════════════════
// PROMPT 3 — SYNTHESIS (Gemini 2.5 Pro)
// ═══════════════════════════════════════════════

function buildSynthesisPrompt(
  platformCount: number,
  totalItems: number,
  query: string,
  intents: string[],
): string {
  return `You are a senior market analyst producing an intelligence report 
for a founder or product manager.

You have received filtered signal data from ${platformCount} 
platforms totalling ${totalItems} items related to this query:

"${query}"

The user wants to understand: ${intents.join(", ")}

Produce a structured intelligence report as a single JSON object 
matching this exact schema. Do not add fields. Do not remove 
fields. Every field is required.

{
  "meta": {
    "query": string,
    "verdict": "CONFIRMED" | "PARTIAL" | "UNCLEAR" | "INVALIDATED",
    "verdict_statement": string,
    "platforms_searched": number,
    "data_points": number,
    "generated_at": ISO timestamp,
    "sources_used": [
      {
        "platform": string,
        "display_name": string,
        "items_extracted": number
      }
    ]
  },
  "problem_validation": {
    "confidence": "HIGH" | "MEDIUM" | "LOW",
    "summary": string,
    "evidence": [
      {
        "quote": string,
        "platform": string,
        "subreddit_or_context": string,
        "url": string,
        "date": string,
        "sentiment": "frustrated" | "requesting" | "neutral"
      }
    ]
  },
  "feature_gaps": [
    {
      "rank": number,
      "need": string,
      "frequency": number,
      "status": "UNBUILT" | "PARTIAL" | "EXISTS",
      "partial_solution": string or null,
      "evidence_quote": string
    }
  ],
  "competitor_weaknesses": [
    {
      "name": string,
      "users_value": string,
      "users_hate": string,
      "your_opening": string
    }
  ],
  "audience_language": [
    {
      "phrase": string,
      "platform": string,
      "context": string
    }
  ],
  "build_recommendations": [
    {
      "rank": number,
      "title": string,
      "rationale": string,
      "evidence_count": number
    }
  ]
}

Critical rules:
- verdict_statement must be direct and one sentence
- Every claim must trace back to actual scraped data
- audience_language must be exact phrases real humans used
- If overall signal is WEAK, set verdict to UNCLEAR
- build_recommendations must reference specific evidence counts
- Return only valid JSON. No markdown. No explanation.`;
}

// ═══════════════════════════════════════════════
// GOOGLE GEMINI API HELPER
// ═══════════════════════════════════════════════

async function callGemini(
  prompt: string,
  model: string,
  contextData?: string,
): Promise<string> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

  // Map gateway model names to native Gemini model names
  const modelName = model.replace("google/", "");

  const userText = contextData || "Execute the task described in the system instruction. Return only valid JSON.";

  const body = {
    contents: [
      { role: "user", parts: [{ text: userText }] },
    ],
    systemInstruction: { parts: [{ text: prompt }] },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.status === 503 && attempt < maxRetries) {
      await response.text(); // consume body
      const wait = (attempt + 1) * 3000;
      console.warn(`Gemini 503 (attempt ${attempt + 1}), retrying in ${wait}ms...`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }

    if (response.status === 429) {
      const errText = await response.text();
      console.error("Gemini 429 detail:", errText);
      throw new Error("AI rate limit exceeded. Please try again in a moment.");
    }
    if (!response.ok) {
      const text = await response.text();
      console.error("Gemini API error:", response.status, text);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
  throw new Error("Gemini API unavailable after retries");
}

function extractJSON(text: string): unknown {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : text.trim();
  return JSON.parse(jsonStr);
}

async function callGeminiJSON(
  prompt: string,
  model: string,
  contextData?: string,
  retries = 1,
): Promise<unknown> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const raw = await callGemini(prompt, model, contextData);
      return extractJSON(raw);
    } catch (e) {
      if (attempt === retries) throw e;
      console.warn(`JSON parse failed (attempt ${attempt + 1}), retrying...`);
    }
  }
  throw new Error("Failed to get valid JSON from AI");
}

// ═══════════════════════════════════════════════
// TINYFISH CLIENT
// ═══════════════════════════════════════════════

interface TinyFishTask {
  platform: string;
  url_or_query: string;
  goal: string;
  selection_reason: string;
  extract: {
    fields: string[];
    max_items: number;
    filter: string;
  };
}

interface TinyFishResult {
  platform: string;
  success: boolean;
  data: unknown;
  error?: string;
}

// ═══════════════════════════════════════════════
// POST-CLASSIFICATION TASK TRANSFORMER
// Only fixes URLs — does NOT rewrite goals (prompt handles that now)
// ═══════════════════════════════════════════════

const PLATFORM_BASE_URLS: Record<string, string> = {
  reddit: "https://old.reddit.com",
  hackernews: "https://news.ycombinator.com",
  g2: "https://www.g2.com",
  capterra: "https://www.capterra.com",
  trustpilot: "https://www.trustpilot.com",
  apple_app_store: "https://www.google.com",
  google_play_store: "https://play.google.com/store/apps",
  youtube_comments: "https://www.google.com",
  stackoverflow: "https://stackoverflow.com",
  quora: "https://www.quora.com",
  producthunt: "https://www.google.com/search?q=site:producthunt.com",
  indie_hackers: "https://www.indiehackers.com",
  patient_communities: "https://healthunlocked.com",
  academic_papers: "https://scholar.google.com",
  amazon_reviews: "https://www.amazon.com",
  job_postings: "https://www.indeed.com",
  twitter: "https://twitter.com",
  linkedin: "https://www.linkedin.com",
};

function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function transformTasks(tasks: TinyFishTask[], _classification: any): TinyFishTask[] {
  const transformed: TinyFishTask[] = [];

  for (const task of tasks) {
    // Ensure url_or_query is a valid URL — if not, use the platform's base URL
    if (!isValidUrl(task.url_or_query)) {
      const baseUrl = PLATFORM_BASE_URLS[task.platform] || "https://www.google.com";
      console.warn(`Invalid URL for ${task.platform}: "${task.url_or_query}" — using ${baseUrl}`);
      task.url_or_query = baseUrl;
    }

    // Drop blocked platforms that slip through classification
    const BLOCKED_PLATFORMS = new Set(["tiktok_comments", "facebook_groups_public", "g2", "capterra", "glassdoor"]);
    if (BLOCKED_PLATFORMS.has(task.platform)) {
      console.warn(`${task.platform} task slipped through classification (blocked), dropping it`);
      continue;
    }

    transformed.push(task);
  }

  return transformed;
}

// ═══════════════════════════════════════════════
// FALLBACK SOURCE MAP — extraction-only goals with pre-built URLs
// ═══════════════════════════════════════════════

interface FallbackDef {
  platform: string;
  label: string;
  urlTemplate: (topic: string) => string;
  goalTemplate: (topic: string) => string;
}

function getFallback(
  failedPlatform: string,
  originalTask: TinyFishTask,
  classification: any,
): FallbackDef | null {
  // Use the original query context, NOT field names like "post_title"
  const topic = (originalTask.goal.match(/related to[:\s]*["']?([^"'\n]+)/i)?.[1] || "the topic").trim();

  switch (failedPlatform) {
    case "apple_app_store":
      return {
        platform: "google_play_store",
        label: "Google Play Store",
        urlTemplate: (t) => `https://play.google.com/store/search?q=${encodeURIComponent(t)}&c=apps`,
        goalTemplate: (t) =>
          `Extract all visible app listings and their ratings on this page.

For each item, extract ONLY:
- app_name (string, e.g. 'Calm - Sleep & Meditation')
- star_rating (number, e.g. 4.2)
- review_count (string, e.g. '1.2M reviews')
- short_description (string, first 150 chars, e.g. 'The #1 app for...')

STOP CONDITIONS:
- Stop after 10 items or all visible, whichever is fewer
- Scroll down to load content if needed, but stop after 5 scrolls maximum
- Do NOT navigate away from this page (no clicking into app pages)

EDGE CASES:
- If cookie banner appears, close it first
- If login wall appears, return empty array

Return JSON: {'items': [{'app_name': '...', 'star_rating': 0, 'review_count': '...', 'short_description': '...'}]}
If no data found, return: {'items': [], 'error': 'no_data_visible'}`,
      };

    case "youtube_comments":
      return {
        platform: "reddit",
        label: "Reddit video discussions",
        urlTemplate: (t) => `https://old.reddit.com/search/?q=${encodeURIComponent(t + ' review video')}&sort=relevance&t=year`,
        goalTemplate: (t) =>
          `Extract all visible post titles and preview text on this page.

For each item, extract ONLY:
- post_title (string, e.g. 'My honest review of...')
- preview_text (string, first 200 chars, e.g. 'After using it for...')
- upvotes (number, e.g. 42)
- comment_count (number, e.g. 15)
- subreddit (string, e.g. 'r/productivity')

STOP CONDITIONS:
- Stop after 15 items or all visible, whichever is fewer
- Scroll down to load content if needed, but stop after 5 scrolls maximum
- Do NOT navigate away from this page (no clicking into posts)

EDGE CASES:
- If cookie banner appears, close it first
- If login wall appears, return empty array

Return JSON: {'items': [{'post_title': '...', 'preview_text': '...', 'upvotes': 0, 'comment_count': 0, 'subreddit': '...'}]}
If no data found, return: {'items': [], 'error': 'no_data_visible'}`,
      };

    case "tiktok_comments":
      return {
        platform: "quora",
        label: "Quora",
        urlTemplate: (t) => `https://www.quora.com/search?q=${encodeURIComponent(t)}`,
        goalTemplate: (t) =>
          `Extract all visible question titles and answer previews on this page.

For each item, extract ONLY:
- question_title (string, e.g. 'What is the best CRM for small teams?')
- answer_preview (string, first 200 chars, e.g. 'I have tried several...')
- answer_author (string, e.g. 'John Smith')
- upvote_count (number, e.g. 25)

STOP CONDITIONS:
- Stop after 10 items or all visible, whichever is fewer
- Scroll down to load content if needed, but stop after 5 scrolls maximum
- Do NOT navigate away from this page (no clicking into questions)

EDGE CASES:
- If cookie banner appears, close it first
- If login wall appears, return empty array

Return JSON: {'items': [{'question_title': '...', 'answer_preview': '...', 'answer_author': '...', 'upvote_count': 0}]}
If no data found, return: {'items': [], 'error': 'no_data_visible'}`,
      };

    case "facebook_groups_public": {
      const marketType = classification?.market_type || "";
      if (marketType === "HEALTH_WELLNESS") {
        return {
          platform: "patient_communities",
          label: "HealthUnlocked",
          urlTemplate: (t) => `https://healthunlocked.com/search/${encodeURIComponent(t)}`,
          goalTemplate: (t) =>
            `Extract all visible discussion thread titles and preview text on this page.

For each item, extract ONLY:
- thread_title (string, e.g. 'Has anyone tried CBT for anxiety?')
- preview_text (string, first 200 chars, e.g. 'I have been struggling...')
- community_name (string, e.g. 'Anxiety Support')
- reply_count (number, e.g. 8)

STOP CONDITIONS:
- Stop after 15 items or all visible, whichever is fewer
- Scroll down to load content if needed, but stop after 5 scrolls maximum
- Do NOT navigate away from this page (no clicking into threads)

EDGE CASES:
- If cookie banner appears, close it first
- If login wall appears, return empty array

Return JSON: {'items': [{'thread_title': '...', 'preview_text': '...', 'community_name': '...', 'reply_count': 0}]}
If no data found, return: {'items': [], 'error': 'no_data_visible'}`,
        };
      }
      return {
        platform: "reddit",
        label: "Reddit communities",
        urlTemplate: (t) => `https://old.reddit.com/search/?q=${encodeURIComponent(t)}&sort=relevance&t=year`,
        goalTemplate: (t) =>
          `Extract all visible post titles and preview text on this page.

For each item, extract ONLY:
- post_title (string, e.g. 'Why I switched from...')
- preview_text (string, first 200 chars, e.g. 'After 2 years of...')
- upvotes (number, e.g. 42)
- comment_count (number, e.g. 15)
- subreddit (string, e.g. 'r/smallbusiness')

STOP CONDITIONS:
- Stop after 15 items or all visible, whichever is fewer
- Scroll down to load content if needed, but stop after 5 scrolls maximum
- Do NOT navigate away from this page (no clicking into posts)

EDGE CASES:
- If cookie banner appears, close it first
- If login wall appears, return empty array

Return JSON: {'items': [{'post_title': '...', 'preview_text': '...', 'upvotes': 0, 'comment_count': 0, 'subreddit': '...'}]}
If no data found, return: {'items': [], 'error': 'no_data_visible'}`,
      };
    }

    case "g2":
    case "capterra":
    case "glassdoor":
      // These are CAPTCHA-blocked — fall back to Reddit B2B discussions
      return {
        platform: "reddit",
        label: "Reddit B2B discussions",
        urlTemplate: (t) => `https://old.reddit.com/search/?q=${encodeURIComponent(t + ' review OR comparison OR alternative')}&sort=relevance&t=year`,
        goalTemplate: (t) =>
          `Extract all visible post titles and preview text on this page.

For each item, extract ONLY:
- post_title (string, e.g. 'HubSpot vs Pipedrive for small teams')
- preview_text (string, first 200 chars, e.g. 'We switched from...')
- upvotes (number, e.g. 42)
- comment_count (number, e.g. 15)
- subreddit (string, e.g. 'r/smallbusiness')

STOP CONDITIONS:
- Stop after 15 items or all visible, whichever is fewer
- Scroll down to load content if needed, but stop after 5 scrolls maximum
- Do NOT navigate away from this page (no clicking into posts)

EDGE CASES:
- If cookie banner appears, close it first
- If login wall appears, return empty array

Return JSON: {'items': [{'post_title': '...', 'preview_text': '...', 'upvotes': 0, 'comment_count': 0, 'subreddit': '...'}]}
If no data found, return: {'items': [], 'error': 'no_data_visible'}`,
      };

    default:
      return null;
  }
}

function isBlockingError(result: TinyFishResult): boolean {
  if (!result.success) {
    const err = (result.error || "").toLowerCase();
    if (err.includes("403") || err.includes("429") || err.includes("blocked") || err.includes("forbidden") || err.includes("rate limit") || err.includes("captcha")) {
      return true;
    }
  }
  if (result.success) {
    const data = result.data;
    if (data === null || data === undefined) return true;
    if (Array.isArray(data) && data.length === 0) return true;
    if (typeof data === "object" && !Array.isArray(data)) {
      const values = Object.values(data as Record<string, unknown>);
      const allEmpty = values.every(v => v === null || v === undefined || (Array.isArray(v) && v.length === 0) || v === "");
      if (allEmpty) return true;
    }
  }
  return false;
}


const TINYFISH_TIMEOUT_MS = 180_000;

const PLATFORM_TIMEOUTS: Record<string, number> = {
  reddit: 180_000,
  hackernews: 120_000,
  producthunt: 120_000,   // Google site-search is fast
  indiehackers: 150_000,
  quora: 120_000,
  alternativeto: 120_000, // deprioritized, short leash
};

function getTimeout(platform: string): number {
  return PLATFORM_TIMEOUTS[platform] || TINYFISH_TIMEOUT_MS;
}

// ═══════════════════════════════════════════════
// PLATFORM CONFIGURATION SETS
// ═══════════════════════════════════════════════

const STEALTH_PLATFORMS = new Set([
  "trustpilot",
  "amazon_reviews", "apple_app_store", "google_play_store",
  "reddit", "alternativeto", "indiehackers",
  // producthunt removed — now routed through Google site-search
]);

const PROXY_PLATFORMS = new Set([
  "trustpilot", "amazon_reviews",
  "reddit", "alternativeto",
  // producthunt removed — Google doesn't need proxy
]);

// ═══════════════════════════════════════════════
// CONCURRENCY LIMITER
// ═══════════════════════════════════════════════

async function runWithConcurrency<T>(
  taskFactories: Array<() => Promise<T>>,
  maxConcurrent: number,
): Promise<T[]> {
  const results: T[] = [];
  const executing: Set<Promise<void>> = new Set();

  for (const factory of taskFactories) {
    const p = factory().then((result) => {
      results.push(result);
    });
    const tracked = p.then(() => executing.delete(tracked));
    executing.add(tracked);

    if (executing.size >= maxConcurrent) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

const MAX_CONCURRENT_AGENTS = 3;

// Change 4: Inject extract spec into goal text before sending to TinyFish
function buildEnrichedGoal(task: TinyFishTask): string {
  let goal = task.goal;

  // If the goal already contains structured extraction instructions, don't double-inject
  if (goal.includes("STOP CONDITIONS:") && goal.includes("Return JSON:")) {
    return goal;
  }

  // Append extract spec if available and not already embedded
  if (task.extract) {
    const parts: string[] = [];
    if (task.extract.fields?.length > 0) {
      parts.push(`Return ONLY these fields: ${task.extract.fields.join(", ")}.`);
    }
    if (task.extract.max_items) {
      parts.push(`Maximum ${task.extract.max_items} items.`);
    }
    if (task.extract.filter) {
      parts.push(`Filter: ${task.extract.filter}.`);
    }
    if (parts.length > 0) {
      goal += "\n\n" + parts.join(" ");
    }
  }

  return goal;
}

// Change 9: Accept global abort signal to cancel in-flight tasks
async function runTinyFishTask(
  task: TinyFishTask,
  apiKey: string,
  timeoutMs: number,
  send: (chunk: string) => void,
  globalAbortSignal?: AbortSignal,
): Promise<TinyFishResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // Wire global abort to cancel this task immediately
  const onGlobalAbort = () => controller.abort();
  globalAbortSignal?.addEventListener("abort", onGlobalAbort, { once: true });

  try {
    const browserProfile = STEALTH_PLATFORMS.has(task.platform) ? "stealth" : "lite";
    const proxyConfig = PROXY_PLATFORMS.has(task.platform)
      ? { proxy_config: { enabled: true, country_code: "US" } }
      : {};

    // Change 4: Inject extract spec into goal
    const enrichedGoal = buildEnrichedGoal(task);

    const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: task.url_or_query,
        goal: enrichedGoal,
        browser_profile: browserProfile,
        ...proxyConfig,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.info(`[TASK RESULT] ${task.platform} | HTTP_ERROR | ${response.status} | ${errorText.slice(0, 200)}`);
      return { platform: task.platform, success: false, data: null, error: `HTTP ${response.status}` };
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return { platform: task.platform, success: false, data: null, error: "No response body" };
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let resultData: unknown = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === "[DONE]") continue;

        try {
          const event = JSON.parse(jsonStr);

          if (event.type === "PROGRESS" && event.purpose) {
            const purpose = (event.purpose || "").toLowerCase();
            // CAPTCHA early-exit: only abort on CONFIRMED captcha encounters, not checking steps
            // TinyFish often says "Verify if the page is blocked by a CAPTCHA" as a routine check — that's NOT a captcha hit
            const isCaptchaHit = (
              (purpose.includes("captcha") && !purpose.includes("verify if") && !purpose.includes("check if") && !purpose.includes("check for")) ||
              purpose.includes("solve captcha") ||
              purpose.includes("captcha appeared") ||
              purpose.includes("captcha is blocking") ||
              purpose.includes("blocked by captcha") ||
              purpose.includes("verify you are human") ||
              purpose.includes("i'm not a robot")
            );
            if (isCaptchaHit) {
              console.info(`[TASK RESULT] ${task.platform} | CAPTCHA | ${event.purpose}`);
              send(logEvent(`${task.platform}: CAPTCHA confirmed — aborting early`, "error"));
              controller.abort();
              return { platform: task.platform, success: false, data: null, error: "CAPTCHA detected" };
            }
            send(logEvent(`${task.platform}: ${event.purpose}`, "searching"));
          } else if (event.type === "COMPLETE" && event.status === "COMPLETED") {
            resultData = event.resultJson || event.result || null;
          } else if (event.type === "COMPLETE" && event.status !== "COMPLETED") {
            console.info(`[TASK RESULT] ${task.platform} | TASK_FAILED | status=${event.status} | ${JSON.stringify(event).slice(0, 300)}`);
            return {
              platform: task.platform,
              success: false,
              data: null,
              error: `TinyFish task failed: ${event.status}`,
            };
          }
        } catch {
          // Skip malformed SSE lines
        }
      }
    }

    if (resultData) {
      let itemCount = 1;
      if (Array.isArray(resultData)) {
        itemCount = resultData.length;
      } else if (resultData && typeof resultData === "object") {
        const rd = resultData as Record<string, unknown>;
        if (Array.isArray(rd.items)) itemCount = rd.items.length;
        else if (Array.isArray(rd.data)) itemCount = rd.data.length;
        else if (Array.isArray(rd.results)) itemCount = (rd.results as unknown[]).length;
        else if (Array.isArray(rd.posts)) itemCount = (rd.posts as unknown[]).length;
        else if (Array.isArray(rd.stories)) itemCount = (rd.stories as unknown[]).length;
      }
      console.info(`[TASK RESULT] ${task.platform} | SUCCESS | ${itemCount} items`);
      console.info(`[TASK DATA SHAPE] ${task.platform} | ${JSON.stringify(resultData).substring(0, 500)}`);
      return { platform: task.platform, success: true, data: resultData };
    }
    console.info(`[TASK RESULT] ${task.platform} | FAIL | No result data in TinyFish response (stream ended without COMPLETE event)`);
    return { platform: task.platform, success: false, data: null, error: "No result data in TinyFish response" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("abort")) {
      console.info(`[TASK RESULT] ${task.platform} | ABORT | ${msg}`);
      return { platform: task.platform, success: false, data: null, error: "Cancelled (deadline reached)" };
    }
    console.info(`[TASK RESULT] ${task.platform} | ERROR | ${msg}`);
    return { platform: task.platform, success: false, data: null, error: msg };
  } finally {
    clearTimeout(timeout);
    globalAbortSignal?.removeEventListener("abort", onGlobalAbort);
  }
}

// ═══════════════════════════════════════════════
// SCHEMA NORMALIZER — Gemini output → ReportData
// ═══════════════════════════════════════════════

function normalizeReport(raw: any, query: string, searchDuration: number, reportId: string): any {
  return {
    meta: {
      report_id: reportId,
      query: raw.meta?.query || query,
      verdict: raw.meta?.verdict || "UNCLEAR",
      verdict_statement: raw.meta?.verdict_statement || "",
      data_points: raw.meta?.data_points || 0,
      search_duration_seconds: searchDuration,
      sources_used: (raw.meta?.sources_used || []).map((s: any) => ({
        platform: s.platform,
        display_name: s.display_name,
        items_extracted: s.items_extracted,
      })),
    },
    problem_validation: {
      summary: raw.problem_validation?.summary || "",
      quotes: (raw.problem_validation?.evidence || raw.problem_validation?.quotes || []).map((e: any) => ({
        source: e.subreddit_or_context || e.source || "",
        platform: e.platform || "",
        text: e.quote || e.text || "",
        url: e.url || undefined,
      })),
    },
    feature_gaps: {
      summary: raw.feature_gaps_summary || "",
      gaps: (Array.isArray(raw.feature_gaps) ? raw.feature_gaps : raw.feature_gaps?.gaps || []).map((g: any) => ({
        title: g.need || g.title || "",
        frequency: typeof g.frequency === "number" ? `${g.frequency} mentions` : (g.frequency || ""),
        status: g.status || "Unaddressed",
        description: g.evidence_quote || g.partial_solution || g.description || "",
      })),
    },
    competitor_weaknesses: {
      summary: raw.competitor_weaknesses_summary || "",
      competitors: (Array.isArray(raw.competitor_weaknesses) ? raw.competitor_weaknesses : raw.competitor_weaknesses?.competitors || []).map((c: any) => ({
        name: c.name || "",
        pros: c.users_value ? [c.users_value] : (c.pros || []),
        cons: c.users_hate ? [c.users_hate] : (c.cons || []),
        opportunity: c.your_opening || c.opportunity || "",
      })),
    },
    audience_language: {
      summary: raw.audience_language_summary || "",
      phrases: (Array.isArray(raw.audience_language) ? raw.audience_language : raw.audience_language?.phrases || []).map((p: any) => ({
        phrase: p.phrase || "",
        context: p.context || "",
        source: p.platform || p.source || "",
        platform: p.platform || "",
      })),
    },
    build_recommendations: {
      summary: raw.build_recommendations_summary || "",
      recommendations: (Array.isArray(raw.build_recommendations) ? raw.build_recommendations : raw.build_recommendations?.recommendations || []).map((r: any) => ({
        title: r.title || "",
        body: r.rationale || r.body || "",
        priority: r.rank === 1 ? "high" : r.rank === 2 ? "high" : r.rank <= 4 ? "medium" : "low",
      })),
    },
  };
}

// ═══════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const TINYFISH_API_KEY = Deno.env.get("TINYFISH_API_KEY");
  if (!TINYFISH_API_KEY) {
    return new Response(JSON.stringify({ error: "TINYFISH_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let query: string;
  let intents: string[];
  let userId: string | undefined;
  let teamId: string | undefined;

  try {
    const body = await req.json();
    query = body.query;
    intents = body.intents || [];

    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        const { data: membership } = await supabase
          .from("team_members")
          .select("team_id")
          .eq("user_id", user.id)
          .limit(1)
          .single();
        teamId = membership?.team_id;
      }
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!query) {
    return new Response(JSON.stringify({ error: "Query is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const reportId = `TR-${crypto.randomUUID().slice(0, 8)}`;
  const startTime = Date.now();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Stream may be closed
        }
      };

      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          // Stream closed
        }
      }, 15_000);

      try {
        // ═══ STAGE 1: CLASSIFICATION ═══
        send(sseEvent("phase_update", { phase: "classifying", detail: "Analyzing query..." }));
        send(logEvent("Classifying query and selecting optimal sources...", "searching"));

        const classificationPrompt = buildClassificationPrompt(query, intents);
        const classificationResult = await callGeminiJSON(
          classificationPrompt,
          "google/gemini-2.5-pro",
        ) as any;

        const classification = classificationResult.classification;
        const rawTasks: TinyFishTask[] = classificationResult.tasks || [];

        // Apply platform-specific fixes
        const tasks = transformTasks(rawTasks, classification);
        if (tasks.length < rawTasks.length) {
          send(logEvent(`Dropped ${rawTasks.length - tasks.length} blocked platform(s) from task list`, "info"));
        }

        // Cap at 5 tasks max (Change 3)
        const cappedTasks = tasks.slice(0, 5);
        if (tasks.length > 5) {
          send(logEvent(`Capped sources from ${tasks.length} to 5 for reliability`, "info"));
        }

        const sourcesSelected = cappedTasks.map((t: any) => ({
          platform: t.platform,
          display_name: t.platform.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
          selection_reason: t.selection_reason,
          priority: t.priority,
        }));

        const sourcesSkipped = (classification.routing_skipped || []).map((s: any) => ({
          platform: s.source,
          display_name: s.source.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
          reason: s.reason,
        }));

        send(sseEvent("classification_complete", {
          market_type: classification.market_type,
          audience_type: classification.audience_type,
          problem_maturity: classification.problem_maturity,
          routing_rationale: classification.routing_rationale,
          sources_selected: sourcesSelected,
          sources_skipped: sourcesSkipped,
        }));

        for (const t of cappedTasks) {
          const profile = STEALTH_PLATFORMS.has(t.platform) ? "stealth" : "lite";
          const proxy = PROXY_PLATFORMS.has(t.platform) ? "proxy:US" : "direct";
          console.log(`[TASK DEBUG] ${t.platform} | profile=${profile} | ${proxy} | url=${t.url_or_query} | goal=${t.goal.substring(0, 200)}`);
          send(logEvent(`🔍 ${t.platform}: ${profile}/${proxy} → ${t.url_or_query.substring(0, 120)}`, "info"));
        }
        send(logEvent(`Dispatching ${cappedTasks.length} TinyFish agents (max ${MAX_CONCURRENT_AGENTS} concurrent)...`, "info"));
        send(sseEvent("phase_update", { phase: "scraping", detail: `0 of ${cappedTasks.length} sources complete` }));

        // ═══ STAGE 2: TINYFISH SCRAPING + QUALITY FILTERING (TIME-BUDGETED) ═══

        const filteredDataByPlatform: Array<{ platform: string; data: any }> = [];
        let doneCount = 0;
        let dataCount = 0;
        const totalTasks = cappedTasks.length;
        const SCRAPING_DEADLINE_MS = 300_000;
        const scrapingAbort = new AbortController();
        let earlyResolved = false;

        const scrapingPromise = new Promise<void>((resolveAll) => {
          const deadlineTimer = setTimeout(() => {
            if (!earlyResolved) {
              earlyResolved = true;
              send(logEvent(`⏱ Time budget reached (5 min) — synthesizing with ${dataCount} sources`, "info"));
              scrapingAbort.abort();
              resolveAll();
            }
          }, SCRAPING_DEADLINE_MS);

          const checkEarlyExit = () => {
            if (earlyResolved) return;
            // Change 10: Increased from 60% to 80% threshold
            if (doneCount >= Math.ceil(totalTasks * 0.8) && dataCount >= 2) {
              earlyResolved = true;
              clearTimeout(deadlineTimer);
              send(logEvent(`✓ ${dataCount} sources collected (${doneCount}/${totalTasks} done) — proceeding to synthesis`, "info"));
              scrapingAbort.abort();
              resolveAll();
            }
            if (doneCount >= totalTasks) {
              earlyResolved = true;
              clearTimeout(deadlineTimer);
              resolveAll();
            }
          };

          const taskFactories = cappedTasks.map((task) => async () => {
            if (scrapingAbort.signal.aborted) {
              doneCount++;
              checkEarlyExit();
              return;
            }

            send(sseEvent("source_update", {
              platform: task.platform,
              status: "searching",
              items_found: 0,
              message: `${task.platform}: starting scrape...`,
            }));

            const timeoutMs = getTimeout(task.platform);
            // Change 9: Pass global abort signal
            let result = await runTinyFishTask(task, TINYFISH_API_KEY, timeoutMs, send, scrapingAbort.signal);

            // Fallback logic
            if (isBlockingError(result) && !scrapingAbort.signal.aborted) {
              const fallback = getFallback(task.platform, task, classification);
              if (fallback) {
                const displayName = task.platform.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
                send(logEvent(`${displayName} blocked — switching to ${fallback.label}.`, "info"));
                send(sseEvent("source_update", {
                  platform: task.platform,
                  status: "searching",
                  items_found: 0,
                  message: `${displayName} blocked — falling back to ${fallback.label}`,
                }));

                const topic = query; // Use the original user query, not field names
                const fallbackTask: TinyFishTask = {
                  platform: fallback.platform,
                  url_or_query: fallback.urlTemplate(topic),
                  goal: fallback.goalTemplate(topic),
                  selection_reason: `Fallback for blocked ${displayName}`,
                  extract: task.extract,
                };

                const fallbackTimeout = getTimeout(fallback.platform);
                result = await runTinyFishTask(fallbackTask, TINYFISH_API_KEY, fallbackTimeout, send, scrapingAbort.signal);

                if (result.success) {
                  result.platform = fallback.platform;
                  send(logEvent(`${fallback.label}: fallback succeeded`, "found"));
                } else {
                  send(logEvent(`${fallback.label}: fallback also failed — ${result.error || "unknown"}`, "error"));
                }
              }
            }

            if (!result.success) {
              const error = result.error || "Failed";
              send(sseEvent("source_update", {
                platform: task.platform,
                status: "error",
                items_found: 0,
                message: `${task.platform}: ${error}`,
              }));
              send(logEvent(`${task.platform}: failed — ${error}`, "error"));
              doneCount++;
              send(sseEvent("phase_update", { phase: "scraping", detail: `${doneCount} of ${totalTasks} sources complete` }));
              checkEarlyExit();
              return;
            }

            // TinyFish succeeded — run quality filter
            const rawData = result.data;
            const activePlatform = result.platform;
            send(logEvent(`${activePlatform}: data received, filtering for quality...`, "found"));

            try {
              const rawStr = typeof rawData === "string" ? rawData : JSON.stringify(rawData);
              const itemCount = Array.isArray(rawData) ? rawData.length : 1;
              const filterPrompt = buildQualityFilterPrompt(activePlatform, itemCount, query);
              const filtered = await callGeminiJSON(filterPrompt, "google/gemini-2.5-flash", rawStr) as any;

              const itemsFound = filtered.items?.length || 0;

              // Safety net: if filter returned NONE but raw data has content, use raw data
              if (itemsFound === 0 && rawData) {
                const hasRawContent = Array.isArray(rawData) ? rawData.length > 0 
                  : (typeof rawData === "object" && rawData !== null && Object.keys(rawData).length > 0);
                if (hasRawContent) {
                  send(logEvent(`${activePlatform}: quality filter returned 0 items but raw data exists — using raw data`, "info"));
                  filteredDataByPlatform.push({ platform: activePlatform, data: { signal: "WEAK", items: Array.isArray(rawData) ? rawData : [rawData] } });
                  dataCount++;
                  send(sseEvent("source_update", {
                    platform: task.platform,
                    status: "done",
                    items_found: Array.isArray(rawData) ? rawData.length : 1,
                    message: `${activePlatform}: ${Array.isArray(rawData) ? rawData.length : 1} items (raw, filter too strict)`,
                  }));
                } else {
                  filteredDataByPlatform.push({ platform: activePlatform, data: filtered });
                  dataCount++;
                  send(sseEvent("source_update", {
                    platform: task.platform,
                    status: "done",
                    items_found: 0,
                    message: `${activePlatform}: no relevant items found`,
                  }));
                }
              } else {
                filteredDataByPlatform.push({ platform: activePlatform, data: filtered });
                dataCount++;
                send(sseEvent("source_update", {
                  platform: task.platform,
                  status: "done",
                  items_found: itemsFound,
                  message: `${activePlatform}: ${itemsFound} quality items (signal: ${filtered.signal || "unknown"})`,
                }));
                send(logEvent(`${activePlatform}: ${itemsFound} items passed quality filter (${filtered.signal || "?"})`, "found"));
              }
            } catch (filterErr) {
              console.error(`Quality filter failed for ${activePlatform}:`, filterErr);
              filteredDataByPlatform.push({ platform: activePlatform, data: { signal: "UNFILTERED", items: Array.isArray(rawData) ? rawData : [rawData] } });
              dataCount++;
              send(sseEvent("source_update", {
                platform: task.platform,
                status: "done",
                items_found: Array.isArray(rawData) ? rawData.length : 1,
                message: `${activePlatform}: quality filter failed, using raw data`,
              }));
            }

            doneCount++;
            send(sseEvent("phase_update", { phase: "scraping", detail: `${doneCount} of ${totalTasks} sources complete` }));
            checkEarlyExit();
          });

          runWithConcurrency(taskFactories, MAX_CONCURRENT_AGENTS).catch((err) => {
            console.error("Concurrency runner error:", err);
          });
        });

        await scrapingPromise;

        if (filteredDataByPlatform.length === 0) {
          send(sseEvent("error", { message: "All sources failed. No data collected." }));
          controller.close();
          return;
        }

        // ═══ STAGE 3: SYNTHESIS ═══
        send(sseEvent("phase_update", { phase: "synthesizing", detail: "Generating report..." }));
        send(logEvent("All sources collected. Synthesizing final report...", "searching"));

        const totalItems = filteredDataByPlatform.reduce((sum, p) => {
          const items = p.data?.items;
          return sum + (Array.isArray(items) ? items.length : 0);
        }, 0);

        const synthesisPrompt = buildSynthesisPrompt(
          filteredDataByPlatform.length,
          totalItems,
          query,
          intents,
        );

        const allFilteredData = JSON.stringify(filteredDataByPlatform, null, 2);
        const rawReport = await callGeminiJSON(
          synthesisPrompt,
          "google/gemini-2.5-pro",
          allFilteredData,
        ) as any;

        const searchDuration = Math.round((Date.now() - startTime) / 1000);
        const normalizedReport = normalizeReport(rawReport, query, searchDuration, reportId);

        send(sseEvent("report_complete", normalizedReport));
        send(logEvent("Report complete.", "info"));

        // ═══ SAVE TO DATABASE ═══
        if (userId && teamId) {
          try {
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
            const adminClient = createClient(supabaseUrl, serviceRoleKey);

            await adminClient.from("reports").insert({
              id: reportId,
              team_id: teamId,
              user_id: userId,
              query,
              intents,
              status: "complete",
              classification,
              report_data: normalizedReport,
            });
          } catch (dbErr) {
            console.error("Failed to save report to database:", dbErr);
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong";
        console.error("Pipeline error:", e);
        send(logEvent(`Error: ${msg}`, "error"));
        send(sseEvent("error", { message: msg }));
      } finally {
        clearInterval(heartbeatInterval);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
