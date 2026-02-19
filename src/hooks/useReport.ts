import { useState, useCallback, useRef, useEffect } from "react";
import type {
  AppState,
  UserTier,
  SourceInfo,
  LogEvent,
  ReportData,
  ClassificationEvent,
} from "@/types/report";
import { submitReport, startMockStream, createReportStream } from "@/services/api";
import { parseSSEEvent } from "@/services/sse";
import { SOURCE_REGISTRY } from "@/constants/sources";

const USE_MOCK = !import.meta.env.VITE_API_URL;

export function useReport() {
  const [appState, setAppState] = useState<AppState>("landing");
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [logLines, setLogLines] = useState<LogEvent[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [userTier, setUserTier] = useState<UserTier>("free");
  const [classification, setClassification] = useState<ClassificationEvent | null>(null);
  const [skippedSources, setSkippedSources] = useState<
    Array<{ platform: string; display_name: string; reason: string }>
  >([]);
  const [errorMessage, setErrorMessage] = useState("");

  const cleanupRef = useRef<(() => void) | null>(null);

  const handleEvent = useCallback((eventType: string, data: unknown) => {
    switch (eventType) {
      case "classification_complete": {
        const classData = data as ClassificationEvent;
        setClassification(classData);
        setSkippedSources(classData.sources_skipped);
        setSources(
          classData.sources_selected.map((s) => ({
            platform: s.platform,
            display_name: SOURCE_REGISTRY[s.platform]?.display_name || s.display_name,
            selection_reason: s.selection_reason,
            status: "queued",
            items_found: 0,
            message: "",
          })),
        );
        break;
      }
      case "source_update": {
        const su = data as import("@/types/report").SourceUpdateEvent;
        setSources((prev) =>
          prev.map((s) =>
            s.platform === su.platform
              ? { ...s, status: su.status, items_found: su.items_found, message: su.message }
              : s,
          ),
        );
        break;
      }
      case "log": {
        const log = data as LogEvent;
        setLogLines((prev) => [...prev, log]);
        break;
      }
      case "report_complete": {
        const report = data as ReportData;
        setReportData(report);
        setAppState("complete");
        break;
      }
    }
  }, []);

  const runReport = useCallback(
    async (query: string, intents: string[]) => {
      // Reset state
      setAppState("searching");
      setSources([]);
      setLogLines([]);
      setReportData(null);
      setClassification(null);
      setSkippedSources([]);
      setErrorMessage("");

      try {
        const result = await submitReport(query, intents, userTier);

        if (USE_MOCK) {
          const cleanup = startMockStream(result.query, handleEvent);
          cleanupRef.current = cleanup;
        } else {
          const es = createReportStream(result.reportId);
          es.addEventListener("classification_complete", (e) => {
            const parsed = parseSSEEvent("classification_complete", (e as MessageEvent).data);
            if (parsed) handleEvent(parsed.type, parsed.data);
          });
          es.addEventListener("source_update", (e) => {
            const parsed = parseSSEEvent("source_update", (e as MessageEvent).data);
            if (parsed) handleEvent(parsed.type, parsed.data);
          });
          es.addEventListener("log", (e) => {
            const parsed = parseSSEEvent("log", (e as MessageEvent).data);
            if (parsed) handleEvent(parsed.type, parsed.data);
          });
          es.addEventListener("report_complete", (e) => {
            const parsed = parseSSEEvent("report_complete", (e as MessageEvent).data);
            if (parsed) handleEvent(parsed.type, parsed.data);
            es.close();
          });
          es.onerror = () => {
            setAppState("error");
            setErrorMessage("Connection lost. Please try again.");
            es.close();
          };
          cleanupRef.current = () => es.close();
        }
      } catch (err) {
        setAppState("error");
        setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      }
    },
    [userTier, handleEvent],
  );

  const reset = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setAppState("idle");
    setSources([]);
    setLogLines([]);
    setReportData(null);
    setClassification(null);
    setSkippedSources([]);
    setErrorMessage("");
  }, []);

  const goToIdle = useCallback(() => {
    setAppState("idle");
  }, []);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return {
    appState,
    sources,
    logLines,
    reportData,
    userTier,
    setUserTier,
    classification,
    skippedSources,
    errorMessage,
    runReport,
    reset,
    goToIdle,
  };
}
