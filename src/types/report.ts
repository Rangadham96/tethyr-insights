export type UserTier = "free" | "founder" | "team" | "studio";

export type AppState = "landing" | "idle" | "searching" | "complete" | "error";

export interface SubmitReportRequest {
  query: string;
  intents: string[];
  sessionId: string;
  tier: UserTier;
}

export interface SubmitReportResponse {
  reportId: string;
  status: string;
}

export interface SourceUpdateEvent {
  platform: string;
  status: "queued" | "searching" | "done" | "error";
  items_found: number;
  message: string;
}

export interface LogEvent {
  text: string;
  type: "searching" | "found" | "info" | "error";
}

export interface SelectedSource {
  platform: string;
  display_name: string;
  selection_reason: string;
  priority: number;
}

export interface ClassificationEvent {
  market_type: string;
  audience_type: string;
  problem_maturity: string;
  routing_rationale: string;
  sources_selected: SelectedSource[];
  sources_skipped: Array<{ platform: string; display_name: string; reason: string }>;
}

export type Verdict = "CONFIRMED" | "PARTIAL" | "UNCLEAR" | "INVALIDATED";

export interface ReportData {
  meta: {
    report_id: string;
    query: string;
    verdict: Verdict;
    verdict_statement: string;
    data_points: number;
    search_duration_seconds: number;
    sources_used: Array<{
      platform: string;
      display_name: string;
      items_extracted: number;
    }>;
  };
  problem_validation: {
    quotes: Array<{
      source: string;
      platform: string;
      text: string;
      url?: string;
    }>;
    summary: string;
  };
  feature_gaps: {
    gaps: Array<{
      title: string;
      frequency: string;
      status: string;
      description: string;
    }>;
    summary: string;
  };
  competitor_weaknesses: {
    competitors: Array<{
      name: string;
      pros: string[];
      cons: string[];
      opportunity: string;
    }>;
    summary: string;
  };
  audience_language: {
    phrases: Array<{
      phrase: string;
      context: string;
      source: string;
      platform: string;
    }>;
    summary: string;
  };
  build_recommendations: {
    recommendations: Array<{
      title: string;
      body: string;
      priority: "high" | "medium" | "low";
    }>;
    summary: string;
  };
}

export interface SourceInfo {
  platform: string;
  display_name: string;
  selection_reason: string;
  status: "queued" | "searching" | "done" | "error";
  items_found: number;
  message: string;
}
