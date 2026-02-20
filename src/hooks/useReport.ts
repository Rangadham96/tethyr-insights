import { useState, useCallback, useRef, useEffect } from "react";
import type {
  AppState,
  UserTier,
  SourceInfo,
  LogEvent,
  ReportData,
  ClassificationEvent,
  PhaseEvent,
} from "@/types/report";
import { startLiveStream } from "@/services/api";
import { SOURCE_REGISTRY } from "@/constants/sources";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "tethyr_report_state";

interface PersistedState {
  appState: AppState;
  sources: SourceInfo[];
  logLines: LogEvent[];
  reportData: ReportData | null;
  classification: ClassificationEvent | null;
  currentPhase: PhaseEvent | null;
  skippedSources: Array<{ platform: string; display_name: string; reason: string }>;
  query: string;
  timestamp: number;
}

function loadPersistedState(): PersistedState | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    // Only restore completed reports (not stale searching states)
    if (parsed.appState === "complete" && parsed.reportData) return parsed;
    return null;
  } catch {
    return null;
  }
}

function persistState(state: PersistedState) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage full or unavailable
  }
}

export function useReport() {
  const persisted = useRef(loadPersistedState());

  const [appState, setAppState] = useState<AppState>(persisted.current?.appState ?? "landing");
  const [sources, setSources] = useState<SourceInfo[]>(persisted.current?.sources ?? []);
  const [logLines, setLogLines] = useState<LogEvent[]>(persisted.current?.logLines ?? []);
  const [reportData, setReportData] = useState<ReportData | null>(persisted.current?.reportData ?? null);
  const [userTier, setUserTier] = useState<UserTier>("free");
  const [classification, setClassification] = useState<ClassificationEvent | null>(persisted.current?.classification ?? null);
  const [currentPhase, setCurrentPhase] = useState<PhaseEvent | null>(persisted.current?.currentPhase ?? null);
  const [skippedSources, setSkippedSources] = useState<
    Array<{ platform: string; display_name: string; reason: string }>
  >(persisted.current?.skippedSources ?? []);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentQuery, setCurrentQuery] = useState(persisted.current?.query ?? "");

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
        // Persist to sessionStorage so it survives tab switches
        setSources((currentSources) => {
          setClassification((currentClassification) => {
            setCurrentPhase((currentPhaseVal) => {
              setSkippedSources((currentSkipped) => {
                setLogLines((currentLogs) => {
                  persistState({
                    appState: "complete",
                    sources: currentSources,
                    logLines: currentLogs,
                    reportData: report,
                    classification: currentClassification,
                    currentPhase: currentPhaseVal,
                    skippedSources: currentSkipped,
                    query: currentQuery,
                    timestamp: Date.now(),
                  });
                  return currentLogs;
                });
                return currentSkipped;
              });
              return currentPhaseVal;
            });
            return currentClassification;
          });
          return currentSources;
        });
        break;
      }
      case "phase_update": {
        const phase = data as PhaseEvent;
        setCurrentPhase(phase);
        break;
      }
      case "error": {
        const err = data as { message: string };
        setAppState("error");
        setErrorMessage(err.message || "Something went wrong.");
        break;
      }
    }
  }, [currentQuery]);

  const runReport = useCallback(
    async (query: string, intents: string[]) => {
      // Reset state
      setAppState("searching");
      setCurrentQuery(query);
      sessionStorage.removeItem(SESSION_KEY);
      setSources([]);
      setLogLines([]);
      setReportData(null);
      setClassification(null);
      setCurrentPhase(null);
      setSkippedSources([]);
      setErrorMessage("");

      try {
        // Get auth token for authenticated requests
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token;

        const cleanup = await startLiveStream(query, intents, handleEvent, authToken);
        cleanupRef.current = cleanup;
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
    sessionStorage.removeItem(SESSION_KEY);
    setAppState("idle");
    setSources([]);
    setLogLines([]);
    setReportData(null);
    setClassification(null);
    setCurrentPhase(null);
    setSkippedSources([]);
    setErrorMessage("");
    setCurrentQuery("");
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
    currentPhase,
    skippedSources,
    errorMessage,
    currentQuery,
    runReport,
    reset,
    goToIdle,
  };
}
