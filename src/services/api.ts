import type {
  UserTier,
  ClassificationEvent,
  SourceUpdateEvent,
  LogEvent,
  ReportData,
} from "@/types/report";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// ── Mock data ──

const MOCK_CLASSIFICATION: ClassificationEvent = {
  market_type: "HEALTH_WELLNESS",
  audience_type: "CONSUMERS_GENERAL",
  problem_maturity: "ESTABLISHED",
  routing_rationale:
    "Consumer health product — routing to patient communities, App Store reviews, YouTube comments, and academic research rather than HackerNews and G2 which have low signal for this audience.",
  sources_selected: [
    { platform: "reddit", display_name: "Reddit", selection_reason: "High volume of health discussions in r/health, r/mentalhealth, and condition-specific subreddits.", priority: 1 },
    { platform: "apple_app_store", display_name: "Apple App Store", selection_reason: "Primary distribution channel for health apps — reviews reveal feature gaps and user frustrations.", priority: 2 },
    { platform: "youtube_comments", display_name: "YouTube Comments", selection_reason: "Health product reviews on YouTube surface authentic user language and unmet needs.", priority: 3 },
    { platform: "patient_communities", display_name: "Patient Communities", selection_reason: "HealthUnlocked and PatientsLikeMe contain first-person accounts of living with conditions.", priority: 4 },
    { platform: "academic_papers", display_name: "Academic Papers", selection_reason: "PubMed research validates whether the problem is clinically recognized.", priority: 5 },
  ],
  sources_skipped: [
    { platform: "hackernews", display_name: "Hacker News", reason: "Low signal for consumer health queries — primarily technical/startup audience." },
    { platform: "g2", display_name: "G2", reason: "B2B software reviews — not relevant for consumer health products." },
    { platform: "stackoverflow", display_name: "Stack Overflow", reason: "Developer-focused — no health product signal." },
    { platform: "job_postings", display_name: "Job Postings", reason: "Not relevant for consumer product validation." },
  ],
};

const MOCK_SOURCE_TIMELINE: Array<{ time: number; event: SourceUpdateEvent }> = [
  { time: 1200, event: { platform: "reddit", status: "searching", items_found: 0, message: "Reddit: scanning subreddits" } },
  { time: 2800, event: { platform: "reddit", status: "done", items_found: 34, message: "Reddit: 34 threads found" } },
  { time: 3200, event: { platform: "apple_app_store", status: "searching", items_found: 0, message: "App Store: extracting reviews" } },
  { time: 4800, event: { platform: "apple_app_store", status: "done", items_found: 847, message: "App Store: 847 reviews processed" } },
  { time: 5400, event: { platform: "youtube_comments", status: "searching", items_found: 0, message: "YouTube: scanning comments" } },
  { time: 7200, event: { platform: "youtube_comments", status: "done", items_found: 156, message: "YouTube: 156 comments extracted" } },
  { time: 7800, event: { platform: "patient_communities", status: "searching", items_found: 0, message: "Patient Communities: searching forums" } },
  { time: 9200, event: { platform: "patient_communities", status: "done", items_found: 89, message: "Patient Communities: 89 posts found" } },
  { time: 9800, event: { platform: "academic_papers", status: "searching", items_found: 0, message: "PubMed: searching papers" } },
  { time: 11200, event: { platform: "academic_papers", status: "done", items_found: 121, message: "PubMed: 121 abstracts matched" } },
];

const MOCK_LOG_TIMELINE: Array<{ time: number; event: LogEvent }> = [
  { time: 800, event: { text: "Classifying query and selecting optimal sources...", type: "searching" } },
  { time: 1500, event: { text: "Scanning Reddit for health-related discussions...", type: "searching" } },
  { time: 2900, event: { text: "Found 34 relevant threads across 6 subreddits", type: "found" } },
  { time: 3500, event: { text: "Extracting App Store reviews for top health apps...", type: "searching" } },
  { time: 5000, event: { text: "Processed 847 reviews — filtering for signal", type: "found" } },
  { time: 5700, event: { text: "Scanning YouTube comments on health product reviews...", type: "searching" } },
  { time: 7400, event: { text: "Extracted 156 comments with product feedback", type: "found" } },
  { time: 8100, event: { text: "Searching patient community forums...", type: "searching" } },
  { time: 9400, event: { text: "Found 89 first-person accounts on HealthUnlocked", type: "found" } },
  { time: 10000, event: { text: "Querying PubMed for clinical validation...", type: "searching" } },
  { time: 11400, event: { text: "Matched 121 abstracts — synthesizing report", type: "found" } },
];

const MOCK_REPORT: ReportData = {
  meta: {
    report_id: "TR-mock-001",
    query: "",
    verdict: "CONFIRMED",
    verdict_statement:
      "Strong signal across Reddit, App Store reviews, and patient communities confirms that users are actively seeking better mental health tracking tools. Existing solutions are widely criticized for gamification over substance.",
    data_points: 1247,
    search_duration_seconds: 9,
    sources_used: [
      { platform: "reddit", display_name: "Reddit", items_extracted: 34 },
      { platform: "apple_app_store", display_name: "Apple App Store", items_extracted: 847 },
      { platform: "youtube_comments", display_name: "YouTube Comments", items_extracted: 156 },
      { platform: "patient_communities", display_name: "Patient Communities", items_extracted: 89 },
      { platform: "academic_papers", display_name: "Academic Papers", items_extracted: 121 },
    ],
  },
  problem_validation: {
    summary:
      "Users consistently express frustration with existing health tracking apps that prioritize streaks and badges over genuine mental health insight. The problem is well-documented across consumer platforms.",
    quotes: [
      { source: "u/mindful_dev", platform: "reddit", text: "Every mental health app I've tried turns my anxiety into a game. I don't need a streak counter — I need to understand my patterns." },
      { source: "App Store Review", platform: "apple_app_store", text: "Deleted after 2 weeks. The daily check-in felt like homework, not help. Why can't these apps just show me what's actually affecting my mood?" },
      { source: "HealthUnlocked user", platform: "patient_communities", text: "My therapist asked me to track triggers but none of these apps let me do that properly. They're all designed for people who are 'a bit stressed' not people actually struggling." },
      { source: "YouTube comment", platform: "youtube_comments", text: "Tried Calm, Headspace, and Daylio. They all assume meditation is the answer. Some of us need data, not breathing exercises." },
      { source: "r/mentalhealth", platform: "reddit", text: "The gap in the market isn't another meditation app — it's something that actually helps you understand WHY you feel the way you do." },
    ],
  },
  feature_gaps: {
    summary: "Three consistent gaps emerge: pattern recognition over time, trigger tracking, and therapist-shareable reports.",
    gaps: [
      { title: "Pattern recognition", frequency: "Mentioned in 42% of negative reviews", status: "Unaddressed", description: "Users want to see correlations between activities, sleep, and mood over weeks — not just daily snapshots." },
      { title: "Trigger tracking", frequency: "23% of App Store reviews", status: "Partially addressed", description: "Existing apps offer mood logging but not contextual trigger capture. Users want to log what happened, not just how they feel." },
      { title: "Therapist integration", frequency: "18% of patient community posts", status: "Unaddressed", description: "Patients want to generate reports they can share with their therapist — none of the top 10 apps offer this." },
      { title: "Privacy-first design", frequency: "15% of Reddit discussions", status: "Partially addressed", description: "Many users avoid health apps entirely due to data privacy concerns. End-to-end encryption is rarely offered." },
    ],
  },
  competitor_weaknesses: {
    summary: "Calm and Headspace dominate market share but are meditation-first. Daylio has the right model but poor execution.",
    competitors: [
      { name: "Calm", pros: ["Strong brand", "Large content library"], cons: ["Meditation-only", "No mood tracking", "Subscription fatigue"], opportunity: "Calm users who want tracking, not content." },
      { name: "Headspace", pros: ["Good onboarding", "Clinical partnerships"], cons: ["No data insights", "Generic recommendations"], opportunity: "Users who completed Headspace courses and want next steps." },
      { name: "Daylio", pros: ["Simple mood logging", "Habit correlation"], cons: ["Ugly UI", "No export", "No therapist sharing", "Feels abandoned"], opportunity: "Daylio's entire user base is waiting for a better version." },
    ],
  },
  audience_language: {
    summary: "Users describe their needs using clinical-adjacent language. They say 'patterns' not 'analytics', 'triggers' not 'inputs', 'understand' not 'track'.",
    phrases: [
      { phrase: "understand my patterns", context: "Used when describing desired outcome vs current app limitations", source: "Reddit", platform: "reddit" },
      { phrase: "not another meditation app", context: "Dismissal of existing solutions — signals market fatigue", source: "YouTube", platform: "youtube_comments" },
      { phrase: "share with my therapist", context: "Functional requirement expressed as desired workflow", source: "HealthUnlocked", platform: "patient_communities" },
      { phrase: "data not badges", context: "Direct rejection of gamification in mental health context", source: "App Store", platform: "apple_app_store" },
      { phrase: "actually struggling", context: "Self-identification that separates target user from casual wellness audience", source: "Reddit", platform: "reddit" },
    ],
  },
  build_recommendations: {
    summary: "Build the trigger-tracking journal first. Pattern recognition is the killer feature but requires 2+ weeks of data — trigger logging gives immediate value on day one.",
    recommendations: [
      { title: "Launch with trigger journaling", body: "A structured but flexible trigger log gives users immediate value and generates the data needed for pattern features later. Ship this first.", priority: "high" },
      { title: "Add weekly pattern reports at week 3", body: "Once a user has 2+ weeks of entries, auto-generate a simple pattern report. This is the 'aha moment' that drives retention.", priority: "high" },
      { title: "Build therapist export as a growth lever", body: "A shareable PDF or link that therapists can review creates a word-of-mouth loop in clinical settings. No competitor offers this.", priority: "medium" },
      { title: "Skip meditation content entirely", body: "The market is fatigued on meditation apps. Position as a 'mental health intelligence tool' not a 'wellness app'. Content is not your moat.", priority: "medium" },
    ],
  },
};

// ── Mock SSE implementation ──

type MockSSECallback = (eventType: string, data: unknown) => void;

function runMockSSE(query: string, callback: MockSSECallback): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];

  // Classification at 500ms
  timers.push(setTimeout(() => callback("classification_complete", MOCK_CLASSIFICATION), 500));

  // Source updates
  for (const item of MOCK_SOURCE_TIMELINE) {
    timers.push(setTimeout(() => callback("source_update", item.event), item.time));
  }

  // Log lines
  for (const item of MOCK_LOG_TIMELINE) {
    timers.push(setTimeout(() => callback("log", item.event), item.time));
  }

  // Report complete at 12s
  const report = { ...MOCK_REPORT, meta: { ...MOCK_REPORT.meta, query, search_duration_seconds: 12 } };
  timers.push(setTimeout(() => callback("report_complete", report), 12000));

  return () => timers.forEach(clearTimeout);
}

// ── Live SSE stream reader ──

export type SSECallback = (eventType: string, data: unknown) => void;

export async function startLiveStream(
  query: string,
  intents: string[],
  callback: SSECallback,
  authToken?: string,
): Promise<() => void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const url = `${supabaseUrl}/functions/v1/generate-report`;

  const controller = new AbortController();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: supabaseKey,
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, intents }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `Server error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMsg = errorJson.error || errorMsg;
      } catch { /* use default */ }
      throw new Error(errorMsg);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    // Read stream in background
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events (separated by double newline)
          let eventEnd: number;
          while ((eventEnd = buffer.indexOf("\n\n")) !== -1) {
            const eventBlock = buffer.slice(0, eventEnd);
            buffer = buffer.slice(eventEnd + 2);

            let eventType = "";
            let eventData = "";

            for (const line of eventBlock.split("\n")) {
              if (line.startsWith("event: ")) {
                eventType = line.slice(7).trim();
              } else if (line.startsWith("data: ")) {
                eventData += line.slice(6);
              }
            }

            if (eventType && eventData) {
              try {
                const parsed = JSON.parse(eventData);
                callback(eventType, parsed);
              } catch {
                // Skip malformed events
              }
            }
          }
        }
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          callback("error", { message: e instanceof Error ? e.message : "Connection lost" });
        }
      }
    })();
  } catch (e) {
    if (!(e instanceof DOMException && e.name === "AbortError")) {
      throw e;
    }
  }

  return () => controller.abort();
}

// ── Public API ──

export async function submitReport(
  query: string,
  intents: string[],
  _tier: UserTier,
): Promise<{ reportId: string; query: string }> {
  return { reportId: `TR-${crypto.randomUUID().slice(0, 8)}`, query };
}
