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




Using your classification above, select 10-15 sources from the 
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
  IMPORTANT SCRAPING APPROACH: Do NOT scrape apple.com 
    directly — it blocks bots. Instead use this goal:
    "Go to apps.apple.com, search for [competitor app name], 
    navigate to ratings and reviews, extract the 20 most 
    recent 1 and 2 star reviews including review text, 
    date, and star rating."
  The task transformer will route this through Google 
    search to bypass blocks.
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
  IMPORTANT SCRAPING APPROACH: Do NOT use youtube.com 
    directly — it blocks bots aggressively. Instead 
    set url_or_query to "https://www.google.com" and 
    use this goal pattern:
    "Go to google.com and search for '[topic] review 
    site:youtube.com', click the first 3 results, 
    on each YouTube page scroll to the comments section 
    and extract the top 20 comments sorted by 
    Top Comments."
  This indirect approach via Google bypasses YouTube 
    bot detection.
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
  *** BLOCKED — DO NOT SELECT ***
  Facebook requires login and blocks all scraping. 
  Never select facebook_groups_public as a source. 
  Instead substitute these alternatives automatically:
  - HEALTH_WELLNESS → use patient_communities 
    (HealthUnlocked.com, PatientsLikeMe.com) — public, 
    unblocked, more honest health discussions
  - SMALL_BUSINESS, CONSUMERS_GENERAL → use Reddit 
    small business communities and Quora instead
  Always list facebook_groups_public in routing_skipped 
    with reason "Platform requires login and blocks 
    scraping; substituted with [alternative] for 
    equivalent audience signal."




linkedin_comments
  USE WHEN: B2B_SAAS, ENTERPRISE_BUYERS, PROFESSIONALS,
    COMPETE intent
  Search: posts from executives at competitor companies, 
    find disagreements and criticisms in comments
  Also search: "[problem] LinkedIn" to find 
    professional discussions




tiktok_comments
  *** BLOCKED — DO NOT SELECT ***
  TikTok blocks virtually all scraping. Never select 
    tiktok_comments as a source. When the query would 
    have qualified for TikTok (CONSUMERS_GENERAL, 
    HEALTH_WELLNESS, CREATOR_TOOLS targeting under-35), 
    use Reddit mobile communities and Quora instead — 
    same demographic, not blocked. Always list 
    tiktok_comments in routing_skipped with reason 
    "Platform blocks automated access; substituted 
    with Reddit and Quora for equivalent audience signal."




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




Now produce 10-15 search tasks as a JSON array.

TinyFish can handle up to 15 concurrent tasks — use this capacity wisely.


Rules that cannot be broken:
- Every task references a specific URL, subreddit, 
  search query, or named competitor — never vague
- Every extract instruction names exact fields to return
- SPLITTING IS ENCOURAGED: For high-signal platforms 
  (Reddit, G2, App Stores, Amazon), create MULTIPLE 
  tasks targeting different angles. Examples:
  - Reddit: separate tasks for different subreddits 
    (r/SaaS, r/startups, r/[topic-specific])
  - G2/Capterra: separate tasks for different competitors
  - App Stores: separate tasks for competitor A vs B
  - Amazon: separate tasks for different product categories
- No duplicating exact targets — multiple tasks for 
  the same platform ARE allowed if they target 
  different pages, subreddits, or search queries
- Tasks are ordered by expected signal strength 
  for this specific query — highest first
- If a platform has no relevant subreddit or 
  search term for this topic, skip it and 
  explain why in routing_skipped
- Never include a source just because it is popular — 
  only include it if routing logic justifies it
- Make each task's goal hyper-specific: name exact 
  subreddits, exact search queries, exact filters, 
  and exact field extractions

CRITICAL — WRITING EFFECTIVE GOALS FOR TINYFISH:

TinyFish is a browser-automation agent. It navigates to a URL 
and follows your "goal" as step-by-step browsing instructions. 
Vague goals produce empty results. Here are examples:

BAD GOAL (too vague, will return nothing):
  "Search for project management complaints"

GOOD GOAL (specific, actionable steps):
  "Navigate to reddit.com/r/projectmanagement. Click the search 
   bar and type 'frustrated OR hate OR switching from'. Sort 
   results by 'Top' and filter to 'Past Year'. Open the first 
   5 thread results. In each thread, extract the original post 
   text, top 10 comments with 5+ upvotes, the commenter names, 
   upvote counts, and post dates. Return all data as JSON."

BAD GOAL:
  "Find G2 reviews for Asana"

GOOD GOAL:
  "Navigate to g2.com/products/asana/reviews. Click 'Filter' and 
   select 1-star and 2-star ratings only. Scroll down and extract 
   the first 20 reviews. For each review extract: the 'What do 
   you dislike?' section text, the reviewer's role/title, company 
   size, star rating, and review date. Return as JSON array."

BAD GOAL:
  "Look at app store reviews"

GOOD GOAL:
  "Navigate to the page. Use the search bar to search for 'Calm 
   app'. Click the first result. Scroll to the Ratings & Reviews 
   section. Sort by 'Most Recent'. Extract 20 reviews that are 
   1-star or 2-star. For each review get: full review text, star 
   rating, date, and reviewer display name. Return as JSON."

Every goal you write MUST include:
1. Exact navigation steps (what to click, what to type)
2. Exact filters to apply (star ratings, date range, sort order)
3. Exact fields to extract (named explicitly)
4. A quantity (how many items to collect)
5. Output format instruction ("Return as JSON array")




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

// ═══════════════════════════════════════════════
// TIERED TIMEOUTS PER PLATFORM
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
// POST-CLASSIFICATION TASK TRANSFORMER
// Fixes platform-specific scraping approaches for
// platforms that block direct access
// ═══════════════════════════════════════════════

function transformTasks(tasks: TinyFishTask[], classification: any): TinyFishTask[] {
  const transformed: TinyFishTask[] = [];

  for (const task of tasks) {
    // APPLE APP STORE: Route through Google search instead of apple.com
    if (task.platform === "apple_app_store") {
      // Extract app/topic from the goal to build a Google search
      const searchTopic = task.url_or_query.includes("apple.com")
        ? task.goal.match(/search for ['"]?([^'"]+)['"]?/i)?.[1] || task.url_or_query
        : task.url_or_query;
      transformed.push({
        ...task,
        url_or_query: "https://www.google.com",
        goal: `Go to google.com and search for '${searchTopic} app store reviews site:apps.apple.com'. Click the first result. On the App Store page, navigate to Ratings & Reviews. Extract the 20 most recent 1-star and 2-star reviews including the full review text, date, and star rating. If the App Store page doesn't load reviews, go back to Google and search for '${searchTopic} app reviews site:appfollow.io' and extract reviews from there instead.`,
      });
      continue;
    }

    // YOUTUBE COMMENTS: Route through Google search instead of youtube.com
    if (task.platform === "youtube_comments") {
      const searchTopic = task.url_or_query.includes("youtube.com")
        ? task.goal.match(/search for ['"]?([^'"]+)['"]?/i)?.[1] || task.url_or_query
        : task.url_or_query;
      transformed.push({
        ...task,
        url_or_query: "https://www.google.com",
        goal: `Go to google.com and search for '${searchTopic} review site:youtube.com'. Click the first 3 video results. On each YouTube page, scroll down to the comments section, sort by Top Comments, and extract the top 20 comments including the comment text, author name, like count, and relative date. Return all comments grouped by video title.`,
      });
      continue;
    }

    // TIKTOK: Should have been excluded by prompt, but catch any that slip through
    if (task.platform === "tiktok_comments") {
      // Skip entirely — prompt should have excluded this
      console.warn("TikTok task slipped through classification, dropping it");
      continue;
    }

    // FACEBOOK GROUPS: Should have been excluded by prompt, but catch any that slip through
    if (task.platform === "facebook_groups_public") {
      console.warn("Facebook Groups task slipped through classification, dropping it");
      continue;
    }

    transformed.push(task);
  }

  return transformed;
}

// ═══════════════════════════════════════════════
// FALLBACK SOURCE MAP
// When a platform is blocked (403, 429, empty),
// automatically substitute a replacement source
// ═══════════════════════════════════════════════

interface FallbackDef {
  platform: string;
  label: string;
  url_or_query: string;
  goalTemplate: (topic: string) => string;
}

function getFallback(
  failedPlatform: string,
  originalTask: TinyFishTask,
  classification: any,
): FallbackDef | null {
  // Extract a search topic from the original task goal
  const topic = originalTask.goal.match(/search for ['"]?([^'",.]+)['"]?/i)?.[1]
    || originalTask.extract?.fields?.[0]
    || "the topic";

  switch (failedPlatform) {
    case "apple_app_store":
      return {
        platform: "google_play_store",
        label: "Google Play Store",
        url_or_query: "https://play.google.com/store/apps",
        goalTemplate: (t) =>
          `Navigate to the Google Play Store. Use the search bar to search for '${t}'. Click the first app result. Scroll down to the Reviews section. Sort by 'Most recent' and look for 1-star and 2-star reviews. Extract 20 negative reviews including: full review text, star rating, date, and reviewer name. Return as JSON array.`,
      };

    case "youtube_comments":
      return {
        platform: "reddit",
        label: "Reddit video discussions",
        url_or_query: "https://www.reddit.com",
        goalTemplate: (t) =>
          `Navigate to reddit.com. Use the search bar to search for '${t} review video'. Sort results by 'Relevance' and filter to 'Past Year'. Open the top 5 threads. In each thread, extract the top 15 comments including comment text, upvote count, subreddit name, and relative date. Return as JSON array.`,
      };

    case "tiktok_comments":
      return {
        platform: "quora",
        label: "Quora",
        url_or_query: "https://www.quora.com",
        goalTemplate: (t) =>
          `Navigate to quora.com. Use the search bar to search for '${t}'. Open the top 5 question results. For each question, extract the top 3 answers including: answer text, author name, upvote count, and date. Return as JSON array.`,
      };

    case "facebook_groups_public": {
      const marketType = classification?.market_type || "";
      if (marketType === "HEALTH_WELLNESS") {
        return {
          platform: "patient_communities",
          label: "HealthUnlocked",
          url_or_query: "https://healthunlocked.com",
          goalTemplate: (t) =>
            `Navigate to healthunlocked.com. Use the search functionality to search for '${t}'. Open the top 10 discussion threads. For each thread extract: original post text, top 5 replies, author names, community name, and dates. Return as JSON array.`,
        };
      }
      return {
        platform: "reddit",
        label: "Reddit communities",
        url_or_query: "https://www.reddit.com",
        goalTemplate: (t) =>
          `Navigate to reddit.com. Use the search bar to search for '${t}'. Sort by 'Relevance' and filter to 'Past Year'. Open the top 5 threads. In each thread, extract the top 15 comments including comment text, upvote count, subreddit name, and relative date. Return as JSON array.`,
      };
    }

    default:
      return null;
  }
}

function isBlockingError(result: TinyFishResult): boolean {
  if (!result.success) {
    const err = (result.error || "").toLowerCase();
    if (err.includes("403") || err.includes("429") || err.includes("blocked") || err.includes("forbidden") || err.includes("rate limit")) {
      return true;
    }
  }
  // Check for empty results (platform loaded but returned nothing)
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


const PLATFORM_TIMEOUTS: Record<string, number> = {
  // Slow tier — 600s (10 min)
  reddit: 600_000,
  patient_communities: 600_000,
  discourse_forums: 600_000,
  // Medium-slow — 480s (8 min) for Google-routed platforms
  apple_app_store: 480_000,
  youtube_comments: 480_000,
  // Fast tier — 180s (3 min)
  twitter_x: 180_000,
  producthunt: 180_000,
  quora: 180_000,
  alternativeto: 180_000,
  trustpilot: 180_000,
  bbb_complaints: 180_000,
  indie_review_sites: 180_000,
  indiehackers: 180_000,
  discord_public: 180_000,
  job_postings: 180_000,
};
const DEFAULT_TIMEOUT = 300_000; // Medium tier — 300s (5 min)

function getTimeout(platform: string): number {
  return PLATFORM_TIMEOUTS[platform] ?? DEFAULT_TIMEOUT;
}

async function runTinyFishTask(
  task: TinyFishTask,
  apiKey: string,
  timeoutMs: number,
  send: (chunk: string) => void,
): Promise<TinyFishResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

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
            // Forward TinyFish progress to frontend in real time
            send(logEvent(`${task.platform}: ${event.purpose}`, "searching"));
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

      // Start SSE keepalive heartbeat every 15 seconds
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

        // Apply platform-specific fixes for blocked sources
        const tasks = transformTasks(rawTasks, classification);
        if (tasks.length < rawTasks.length) {
          send(logEvent(`Dropped ${rawTasks.length - tasks.length} blocked platform(s) from task list`, "info"));
        }

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
        send(sseEvent("phase_update", { phase: "scraping", detail: `0 of ${tasks.length} sources complete` }));

        // ═══ STAGE 2: TINYFISH SCRAPING + QUALITY FILTERING (INCREMENTAL) ═══

        const filteredDataByPlatform: Array<{ platform: string; data: any }> = [];
        let doneCount = 0;
        const totalTasks = tasks.length;

        // Each task independently streams its own SSE events as it completes
        const wrapperPromises = tasks.map(async (task) => {
          // Mark this source as searching
          send(sseEvent("source_update", {
            platform: task.platform,
            status: "searching",
            items_found: 0,
            message: `${task.platform}: starting scrape...`,
          }));

          const timeoutMs = getTimeout(task.platform);
          let result = await runTinyFishTask(task, TINYFISH_API_KEY, timeoutMs, send);

          // ── FALLBACK LOGIC: if blocked or empty, try substitute source ──
          if (isBlockingError(result)) {
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

              const topic = task.goal.match(/search for ['"]?([^'",.]+)['"]?/i)?.[1] || "the topic";
              const fallbackTask: TinyFishTask = {
                platform: fallback.platform,
                url_or_query: fallback.url_or_query,
                goal: fallback.goalTemplate(topic),
                selection_reason: `Fallback for blocked ${displayName}`,
                extract: task.extract,
              };

              const fallbackTimeout = getTimeout(fallback.platform);
              result = await runTinyFishTask(fallbackTask, TINYFISH_API_KEY, fallbackTimeout, send);

              // Use fallback platform name for downstream processing
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
            return null;
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
            filteredDataByPlatform.push({ platform: activePlatform, data: filtered });

            send(sseEvent("source_update", {
              platform: task.platform,
              status: "done",
              items_found: itemsFound,
              message: `${activePlatform}: ${itemsFound} quality items (signal: ${filtered.signal || "unknown"})`,
            }));
            send(logEvent(`${activePlatform}: ${itemsFound} items passed quality filter (${filtered.signal || "?"})`, "found"));
          } catch (filterErr) {
            console.error(`Quality filter failed for ${activePlatform}:`, filterErr);
            filteredDataByPlatform.push({ platform: activePlatform, data: { signal: "UNFILTERED", items: rawData } });
            send(sseEvent("source_update", {
              platform: task.platform,
              status: "done",
              items_found: Array.isArray(rawData) ? rawData.length : 1,
              message: `${activePlatform}: quality filter failed, using raw data`,
            }));
          }

          doneCount++;
          send(sseEvent("phase_update", { phase: "scraping", detail: `${doneCount} of ${totalTasks} sources complete` }));
          return { platform: activePlatform };
        });

        await Promise.allSettled(wrapperPromises);

        // Check if we have any data at all
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
            // Don't fail the report if DB save fails
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
