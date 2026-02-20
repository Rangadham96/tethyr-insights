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
- B2B_SAAS: software sold to businesses, bought by a team 
  or company
- B2C_APP: consumer-facing app, individual buys or downloads
- MARKETPLACE: connects two sides (buyers/sellers, 
  creators/audience)
- PHYSICAL_PRODUCT: hardware, consumer goods, physical item
- SERVICE_BUSINESS: agency, consulting, professional service
- HEALTH_WELLNESS: physical or mental health, medical, 
  fitness, nutrition
- FINANCE: payments, investing, insurance, banking
- CREATOR_TOOLS: content creation, media, creative software
- DEVELOPER_TOOLS: APIs, infrastructure, dev tooling
- EDUCATION: learning, courses, tutoring, skills
- UNKNOWN: cannot determine from query




AUDIENCE TYPE — who is the end user?
- FOUNDERS_PMS: startup founders, product managers, operators
- DEVELOPERS: software engineers, technical builders
- ENTERPRISE_BUYERS: procurement, IT, C-suite
- CONSUMERS_GENERAL: broad consumer audience, no specific 
  profession
- PROFESSIONALS: doctors, lawyers, accountants, teachers, 
  a specific professional category — name it
- CREATORS: YouTubers, writers, podcasters, artists
- STUDENTS: learners in formal or informal education
- SMALL_BUSINESS: SMB owners, local business operators




PROBLEM MATURITY — how established is this problem space?
- ESTABLISHED: well-known problem, many existing solutions, 
  signal will be plentiful
- EMERGING: problem is real but solutions are new, signal 
  will be scattered  
- NOVEL: problem may not be widely articulated yet, signal 
  will require inference from adjacent complaints




QUERY INTENT — what is the primary thing they need?
- VALIDATE: is this problem real and big enough?
- GAPS: what is missing from existing solutions?
- COMPETE: what are competitors failing at?
- LANGUAGE: how do people describe this problem?
- BUILD: what should be built first?
- ALL: they want the full picture




═══════════════════════════════════════════════
STEP 2 — SELECT SOURCES USING THIS ROUTING LOGIC
═══════════════════════════════════════════════




Using your classification above, select 6-10 sources from the 
master list below. Every source selection must have a reason. 
Do not default to the same sources for every query.




MASTER SOURCE LIST WITH ROUTING RULES:




── DISCUSSION & COMMUNITY ──




reddit
  USE WHEN: almost always — but select subreddits specifically
  B2B_SAAS → r/SaaS, r/startups, r/ProductManagement, 
    r/Entrepreneur
  B2C_APP → r/apps, r/productivity, plus topic-specific 
    subreddit
  HEALTH_WELLNESS → r/mentalhealth, r/anxiety, r/depression, 
    r/therapy, r/psychology, r/ADHD — pick the most relevant
  FINANCE → r/personalfinance, r/investing, r/financialplanning
  DEVELOPER_TOOLS → r/programming, r/webdev, r/devops, 
    r/ExperiencedDevs
  EDUCATION → r/learnprogramming, r/Teachers, r/GradSchool
  CREATOR_TOOLS → r/YoutubeCreators, r/podcasting, r/writing
  SMALL_BUSINESS → r/smallbusiness, r/Entrepreneur, 
    r/ecommerce
  ALWAYS include r/[topic] where topic matches the domain




hackernews
  USE WHEN: DEVELOPER_TOOLS, B2B_SAAS, FOUNDERS_PMS, 
    EMERGING problems, NOVEL problems
  SKIP WHEN: HEALTH_WELLNESS, CONSUMERS_GENERAL, 
    PHYSICAL_PRODUCT — signal will be weak
  Search: site:news.ycombinator.com "[topic]" — extract 
    Ask HN and Show HN threads specifically




indiehackers
  USE WHEN: FOUNDERS_PMS, B2B_SAAS, CREATOR_TOOLS, 
    VALIDATE intent, GAPS intent
  SKIP WHEN: HEALTH_WELLNESS, CONSUMERS_GENERAL, 
    PHYSICAL_PRODUCT
  Particularly valuable for "what did you try that failed" 
    signal




producthunt
  USE WHEN: B2C_APP, B2B_SAAS, DEVELOPER_TOOLS, 
    CREATOR_TOOLS — always check comment threads not just 
    upvotes
  SKIP WHEN: PHYSICAL_PRODUCT, SERVICE_BUSINESS, 
    HEALTH_WELLNESS
  Look at: comments on competitor products, 
    "alternatives to X" pages, and products that launched 
    then went quiet




quora
  USE WHEN: CONSUMERS_GENERAL, EDUCATION, HEALTH_WELLNESS, 
    FINANCE, PROFESSIONALS — people ask Quora questions 
    they are embarrassed to Google
  SKIP WHEN: DEVELOPER_TOOLS, B2B_SAAS — developers 
    do not use Quora
  Extract: question text, top answer text, 
    "X people found this helpful" counts




alternativeto
  USE WHEN: anytime there is a named competitor to investigate
  NEVER SKIP IF competitor names appear in the query
  This is where people who have already left a product 
    explain why — extremely high signal for GAPS intent




discord_public
  USE WHEN: DEVELOPER_TOOLS, CREATOR_TOOLS, GAMING, 
    CRYPTO, any community with an active Discord
  Method: search "[topic] discord" — find public invite 
    links, browse public channels




── APP STORES ──




apple_app_store
  USE WHEN: any B2C_APP, HEALTH_WELLNESS, EDUCATION, 
    FITNESS, FINANCE mobile product
  ALWAYS include if query involves a product that has 
    a mobile app competitor
  Focus: 1-star and 2-star reviews only — these contain 
    feature requests and unmet needs
  Extract: review text, star rating, date, 
    "helpful" vote count




google_play_store
  USE WHEN: same as apple_app_store
  Run both in parallel — Android users often have 
    different complaints than iOS users




chrome_web_store
  USE WHEN: DEVELOPER_TOOLS, CREATOR_TOOLS, 
    productivity browser extensions
  SKIP WHEN: mobile-only products




── PROFESSIONAL REVIEW PLATFORMS ──




g2
  USE WHEN: B2B_SAAS always, ENTERPRISE_BUYERS always
  SKIP WHEN: CONSUMERS_GENERAL, HEALTH_WELLNESS 
    (consumers do not review on G2)
  Extract: "What do you dislike?" field specifically — 
    this is the highest-signal field on G2
  Also extract: "What problems is the product solving 
    for you?" field




capterra
  USE WHEN: B2B_SAAS, SMALL_BUSINESS, ENTERPRISE_BUYERS
  Particularly strong for: HR tools, accounting software, 
    project management, marketing tools




trustpilot
  USE WHEN: CONSUMERS_GENERAL, FINANCE, E_COMMERCE, 
    SERVICE_BUSINESS
  SKIP WHEN: B2B_SAAS, DEVELOPER_TOOLS




glassdoor
  USE WHEN: when the query involves understanding a 
    company's internal priorities or product direction
  Employee reviews reveal what a company is struggling 
    to build internally — useful for COMPETE intent




bbb_complaints
  USE WHEN: CONSUMERS_GENERAL, FINANCE, 
    SERVICE_BUSINESS, HEALTH_WELLNESS
  BBB complaints are written by people who are genuinely 
    angry and describe product failures in detail
  Underused by competitors — high signal




── SOCIAL PLATFORMS ──




youtube_comments
  USE WHEN: HEALTH_WELLNESS always, CREATOR_TOOLS, 
    EDUCATION, CONSUMERS_GENERAL, B2C_APP
  Search: "[competitor name] review", 
    "[problem] solution", "[topic] does it work"
  Extract comments on: reviews, tutorials, 
    "after 6 months" videos, "honest review" videos
  SKIP WHEN: DEVELOPER_TOOLS, B2B_SAAS — 
    low signal on YouTube




twitter_x
  USE WHEN: EMERGING problems, real-time reactions, 
    COMPETE intent for recent competitor launches
  Search: competitor @handle complaints, 
    "[topic] frustrated", "[topic] wish there was"
  SKIP WHEN: ESTABLISHED problems — noise to signal 
    ratio is too low for well-covered topics




facebook_groups_public
  USE WHEN: HEALTH_WELLNESS always, SMALL_BUSINESS, 
    CONSUMERS_GENERAL, EDUCATION, parenting products
  Facebook Groups contain the most candid long-form 
    discussion on the internet for non-technical audiences
  Search: "[topic] group" — find large public groups, 
    search within them for complaints and questions
  SKIP WHEN: DEVELOPER_TOOLS, B2B_SAAS — 
    these audiences do not use Facebook Groups




linkedin_comments
  USE WHEN: B2B_SAAS, ENTERPRISE_BUYERS, PROFESSIONALS,
    COMPETE intent
  Search: posts from executives at competitor companies, 
    find disagreements and criticisms in comments
  Also search: "[problem] LinkedIn" to find 
    professional discussions




tiktok_comments
  USE WHEN: CONSUMERS_GENERAL, HEALTH_WELLNESS, 
    CREATOR_TOOLS, EDUCATION, any product targeting 
    under-35 consumers
  Search: "[product name] review", "[problem] solution" 
    — comments contain extremely candid reactions
  SKIP WHEN: B2B_SAAS, DEVELOPER_TOOLS, 
    ENTERPRISE_BUYERS




── FORUMS & NICHE COMMUNITIES ──




discourse_forums
  USE WHEN: whenever a competitor product has a 
    public Discourse forum (check: community.[product].com 
    or forum.[product].com)
  This is where the most engaged users discuss 
    feature requests and frustrations
  ALWAYS check if named competitors have Discourse forums




stackoverflow_stackexchange
  USE WHEN: DEVELOPER_TOOLS always, also any technical 
    product where users hit implementation problems
  Stack Exchange network has 170+ topic-specific sites — 
    select the relevant one
  SKIP WHEN: CONSUMERS_GENERAL, HEALTH_WELLNESS, 
    PHYSICAL_PRODUCT




patient_communities
  USE WHEN: HEALTH_WELLNESS always — non-negotiable
  Sources: HealthUnlocked, PatientsLikeMe, 
    Inspire.com, Ben's Friends, WebMD community forums
  SKIP WHEN: any non-health query
  These communities contain the most honest, 
    detailed health experience descriptions on the internet




── MARKET INTELLIGENCE SOURCES ──




job_postings
  USE WHEN: COMPETE intent always, 
    VALIDATE intent for ESTABLISHED markets
  Search: competitor company job postings on LinkedIn Jobs, 
    Indeed, Greenhouse, Lever
  What to look for: new engineering roles suggesting 
    a feature build, job descriptions describing 
    problems they need to solve
  "We are looking for someone to help us solve X" 
    in a job description IS market signal




amazon_reviews
  USE WHEN: PHYSICAL_PRODUCT always, also 
    CONSUMERS_GENERAL for any product category 
    that has physical equivalents
  Focus: "Critical reviews" filter — 
    1 and 2 star only
  Also extract: "Customers ask" Q&A section — 
    unresolved questions are unmet needs




podcast_transcripts
  USE WHEN: HEALTH_WELLNESS, EDUCATION, FINANCE, 
    CREATOR_TOOLS, any market where thought leaders 
    discuss problems on podcasts
  Search: ListenNotes.com for "[topic] podcast episodes"
  Transcripts available via Spotify and Apple Podcasts 
    for many shows
  SKIP WHEN: DEVELOPER_TOOLS, B2B_SAAS — 
    lower signal, harder to extract




academic_papers
  USE WHEN: HEALTH_WELLNESS always, EDUCATION, 
    NOVEL problems where scientific research 
    validates the problem exists
  Search: Google Scholar, Semantic Scholar, PubMed 
    for "[problem]" — abstract and citation count 
    indicates problem maturity
  A problem cited in 500+ papers is validated. 
    A problem cited in 5 is emerging.
  SKIP WHEN: CONSUMERS_GENERAL, PHYSICAL_PRODUCT, 
    SMALL_BUSINESS




substack_comments
  USE WHEN: FINANCE, HEALTH_WELLNESS, CREATOR_TOOLS, 
    any newsletter-driven audience
  Search: Substack for topic newsletters, 
    read comment sections under popular posts
  Substack commenters are engaged, educated, 
    and opinionated — high quality signal




indie_review_sites
  USE WHEN: DEVELOPER_TOOLS, B2B_SAAS, CREATOR_TOOLS
  Sources: AlternativeTo, Slant.co, 
    SaaSHub, SourceForge reviews
  These attract users who have tried multiple 
    products and are comparing — maximum feature 
    gap signal




═══════════════════════════════════════════════
STEP 3 — GENERATE SEARCH TASKS
═══════════════════════════════════════════════




Now produce 6-10 search tasks as a JSON array.




Rules that cannot be broken:
- Every task references a specific URL, subreddit, 
  search query, or named competitor — never vague
- Every extract instruction names exact fields to return
- Each task targets a different source — 
  no duplicating platforms
- Tasks are ordered by expected signal strength 
  for this specific query — highest first
- If a platform has no relevant subreddit or 
  search term for this topic, skip it and 
  explain why in routing_skipped
- Never include a source just because it is popular — 
  only include it if routing logic justifies it




Return this exact JSON structure:




{
  "classification": {
    "market_type": string,
    "audience_type": string,
    "problem_maturity": string,
    "query_intent": string,
    "routing_rationale": string (2-3 sentences explaining 
      why you selected these specific sources for 
      this specific query),
    "routing_skipped": [
      {
        "source": string,
        "reason": string
      }
    ]
  },
  "tasks": [
    {
      "platform": string,
      "priority": number (1 = highest signal expected),
      "url_or_query": string (exact URL or search string),
      "goal": string (precise plain-English browsing 
        instruction — specific enough that it cannot 
        be misinterpreted),
      "selection_reason": string (one sentence — 
        why this source for this query),
      "extract": {
        "fields": [array of exact field names],
        "max_items": number,
        "filter": string (any filter to apply — 
          e.g. "1 and 2 star reviews only", 
          "posts from past 12 months only", 
          "top comments with 10+ upvotes only")
      }
    }
  ]
}




Return only valid JSON. No markdown. No explanation 
outside the JSON structure.`;
}

// ═══════════════════════════════════════════════
// PROMPT 2 — QUALITY FILTER (Gemini 2.5 Flash)
// ═══════════════════════════════════════════════

function buildQualityFilterPrompt(platform: string, itemCount: number, query: string): string {
  return `You are a quality controller reviewing raw scraped internet data 
before it goes into a market intelligence report.




You have received raw data from ${platform} containing 
${itemCount} items related to this query: ${query}




Your job:




1. Remove any item that is: off-topic, spam, bot-generated, 
   less than 2 sentences, or does not contain a genuine human 
   opinion or experience




2. Flag the overall signal strength as one of:
   - STRONG: 10+ genuine items with clear emotional signal
   - MODERATE: 5-9 genuine items  
   - WEAK: fewer than 5 genuine items
   - NONE: no relevant signal found




3. For each item that passes, extract:
   - The core complaint, request, or observation in one sentence
   - The exact quote that best represents it (under 40 words)
   - Source URL
   - Date
   - Sentiment: frustrated / requesting / praising / neutral




Return JSON only. If signal is NONE, return 
{"signal": "NONE", "items": []}




Do not summarise. Do not paraphrase. Preserve exact quotes.`;
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
// LOVABLE AI GATEWAY HELPER
// ═══════════════════════════════════════════════

async function callGemini(
  prompt: string,
  model: string,
  contextData?: string,
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: prompt },
  ];
  if (contextData) {
    messages.push({ role: "user", content: contextData });
  } else {
    messages.push({ role: "user", content: "Execute the task described in the system prompt. Return only valid JSON." });
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, stream: false }),
  });

  if (response.status === 429) throw new Error("AI rate limit exceeded. Please try again in a moment.");
  if (response.status === 402) throw new Error("AI credits exhausted. Please add credits in Settings → Workspace → Usage.");
  if (!response.ok) {
    const text = await response.text();
    console.error("AI gateway error:", response.status, text);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || "";
}

function extractJSON(text: string): unknown {
  // Try to extract JSON from markdown code blocks or raw text
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

async function runTinyFishTask(
  task: TinyFishTask,
  apiKey: string,
): Promise<TinyFishResult> {
  const TINYFISH_TIMEOUT = 90_000; // 90 seconds per task

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TINYFISH_TIMEOUT);

    const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: task.url_or_query,
        goal: task.goal,
        browser_profile: "stealth",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`TinyFish error for ${task.platform}:`, response.status, errorText);
      return { platform: task.platform, success: false, data: null, error: `HTTP ${response.status}` };
    }

    // Read the SSE stream from TinyFish
    const reader = response.body?.getReader();
    if (!reader) {
      return { platform: task.platform, success: false, data: null, error: "No response body" };
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let resultData: unknown = null;
    const progressMessages: string[] = [];

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
            progressMessages.push(event.purpose);
          } else if (event.type === "COMPLETE" && event.status === "COMPLETED") {
            resultData = event.resultJson || event.result || null;
          } else if (event.type === "COMPLETE" && event.status !== "COMPLETED") {
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
      return { platform: task.platform, success: true, data: resultData };
    }
    return { platform: task.platform, success: false, data: null, error: "No result data in TinyFish response" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error(`TinyFish task failed for ${task.platform}:`, msg);
    return { platform: task.platform, success: false, data: null, error: msg };
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

    // Extract auth if present
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
        // Get user's team
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

  // Create SSE stream
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

      try {
        // ═══ STAGE 1: CLASSIFICATION ═══
        send(logEvent("Classifying query and selecting optimal sources...", "searching"));

        const classificationPrompt = buildClassificationPrompt(query, intents);
        const classificationResult = await callGeminiJSON(
          classificationPrompt,
          "google/gemini-2.5-pro",
        ) as any;

        const classification = classificationResult.classification;
        const tasks: TinyFishTask[] = classificationResult.tasks || [];

        // Map to frontend event shape
        const sourcesSelected = tasks.map((t: any) => ({
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

        send(logEvent(`Dispatching ${tasks.length} TinyFish agents in stealth mode...`, "info"));

        // ═══ STAGE 2: TINYFISH SCRAPING + QUALITY FILTERING ═══

        // Mark all sources as searching
        for (const task of tasks) {
          send(sseEvent("source_update", {
            platform: task.platform,
            status: "searching",
            items_found: 0,
            message: `${task.platform}: starting scrape...`,
          }));
        }

        // Run all TinyFish tasks in parallel
        const tinyFishPromises = tasks.map((task) => runTinyFishTask(task, TINYFISH_API_KEY));
        const tinyFishResults = await Promise.allSettled(tinyFishPromises);

        const filteredDataByPlatform: Array<{ platform: string; data: any }> = [];

        for (let i = 0; i < tinyFishResults.length; i++) {
          const task = tasks[i];
          const settled = tinyFishResults[i];

          if (settled.status === "rejected" || !settled.value.success) {
            const error = settled.status === "rejected"
              ? settled.reason?.message || "Unknown error"
              : settled.value.error || "Failed";

            send(sseEvent("source_update", {
              platform: task.platform,
              status: "error",
              items_found: 0,
              message: `${task.platform}: ${error}`,
            }));
            send(logEvent(`${task.platform}: failed — ${error}`, "error"));
            continue;
          }

          const rawData = settled.value.data;
          send(logEvent(`${task.platform}: data received, filtering for quality...`, "found"));

          // Run quality filter through Gemini Flash
          try {
            const rawStr = typeof rawData === "string" ? rawData : JSON.stringify(rawData);
            const itemCount = Array.isArray(rawData) ? rawData.length : 1;
            const filterPrompt = buildQualityFilterPrompt(task.platform, itemCount, query);
            const filtered = await callGeminiJSON(filterPrompt, "google/gemini-2.5-flash", rawStr) as any;

            const itemsFound = filtered.items?.length || 0;
            filteredDataByPlatform.push({ platform: task.platform, data: filtered });

            send(sseEvent("source_update", {
              platform: task.platform,
              status: "done",
              items_found: itemsFound,
              message: `${task.platform}: ${itemsFound} quality items (signal: ${filtered.signal || "unknown"})`,
            }));
            send(logEvent(`${task.platform}: ${itemsFound} items passed quality filter (${filtered.signal || "?"})`, "found"));
          } catch (filterErr) {
            console.error(`Quality filter failed for ${task.platform}:`, filterErr);
            // Still include raw data if filter fails
            filteredDataByPlatform.push({ platform: task.platform, data: { signal: "UNFILTERED", items: rawData } });
            send(sseEvent("source_update", {
              platform: task.platform,
              status: "done",
              items_found: Array.isArray(rawData) ? rawData.length : 1,
              message: `${task.platform}: quality filter failed, using raw data`,
            }));
          }
        }

        // Check if we have any data at all
        if (filteredDataByPlatform.length === 0) {
          send(sseEvent("error", { message: "All sources failed. No data collected." }));
          controller.close();
          return;
        }

        // ═══ STAGE 3: SYNTHESIS ═══
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
            // Don't fail the report if DB save fails
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong";
        console.error("Pipeline error:", e);
        send(logEvent(`Error: ${msg}`, "error"));
        send(sseEvent("error", { message: msg }));
      } finally {
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
