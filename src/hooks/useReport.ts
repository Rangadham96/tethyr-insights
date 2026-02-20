import { useState, useCallback, useRef, useEffect } from "react";
import type {
  AppState,
  UserTier,
  SourceInfo,
  LogEvent,
  ReportData,
  ClassificationEvent,
} from "@/types/report";
import { submitReport, startMockStream, startLiveStream } from "@/services/api";
import { SOURCE_REGISTRY } from "@/constants/sources";
import { supabase } from "@/integrations/supabase/client";

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
      case "error": {
        const err = data as { message: string };
        setAppState("error");
        setErrorMessage(err.message || "Something went wrong.");
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
        if (USE_MOCK) {
          const result = await submitReport(query, intents, userTier);
          const cleanup = startMockStream(result.query, handleEvent);
          cleanupRef.current = cleanup;
        } else {
          // Get auth token for authenticated requests
          const { data: { session } } = await supabase.auth.getSession();
          const authToken = session?.access_token;

          const cleanup = await startLiveStream(query, intents, handleEvent, authToken);
          cleanupRef.current = cleanup;
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
