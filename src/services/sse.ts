import type {
  SourceUpdateEvent,
  LogEvent,
  ClassificationEvent,
  ReportData,
} from "@/types/report";

export type SSEEvent =
  | { type: "source_update"; data: SourceUpdateEvent }
  | { type: "log"; data: LogEvent }
  | { type: "classification_complete"; data: ClassificationEvent }
  | { type: "report_complete"; data: ReportData };

export function parseSSEEvent(eventType: string, rawData: string): SSEEvent | null {
  try {
    const data = JSON.parse(rawData);
    switch (eventType) {
      case "source_update":
        return { type: "source_update", data: data as SourceUpdateEvent };
      case "log":
        return { type: "log", data: data as LogEvent };
      case "classification_complete":
        return { type: "classification_complete", data: data as ClassificationEvent };
      case "report_complete":
        return { type: "report_complete", data: data as ReportData };
      default:
        return null;
    }
  } catch {
    return null;
  }
}
