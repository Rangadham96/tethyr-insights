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

const STORAGE_KEY = "tethyr_report_state";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    // Only restore completed reports within TTL
    if (parsed.appState === "complete" && parsed.reportData) {
      if (Date.now() - parsed.timestamp > TTL_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function persistState(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or unavailable
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
  const lastEventTimeRef = useRef<number>(Date.now());
  const [isStale, setIsStale] = useState(false);

  const cleanupRef = useRef<(() => void) | null>(null);

  const handleEvent = useCallback((eventType: string, data: unknown) => {
    lastEventTimeRef.current = Date.now();
    // Keepalive just resets the timer, no state changes
    if (eventType === "keepalive") return;
    setIsStale(false);
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
        // Persist to localStorage so it survives refreshes
        setSources((currentSources) => {
          setClassification((currentClassification) => {
            setCurrentPhase((currentPhaseVal) => {
              setSkippedSources((currentSkipped) => {
                setLogLines((currentLogs) => {
                  setCurrentQuery((currentQ) => {
                    persistState({
                      appState: "complete",
                      sources: currentSources,
                      logLines: currentLogs,
                      reportData: report,
                      classification: currentClassification,
                      currentPhase: currentPhaseVal,
                      skippedSources: currentSkipped,
                      query: currentQ,
                      timestamp: Date.now(),
                    });
                    return currentQ;
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
  }, []);

  const runReport = useCallback(
    async (query: string, intents: string[]) => {
      // Reset state
      setAppState("searching");
      setCurrentQuery(query);
      setIsStale(false);
      lastEventTimeRef.current = Date.now();
      localStorage.removeItem(STORAGE_KEY);
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

  const retry = useCallback(() => {
    if (currentQuery) {
      runReport(currentQuery, []);
    }
  }, [currentQuery, runReport]);

  const reset = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    localStorage.removeItem(STORAGE_KEY);
    setAppState("idle");
    setSources([]);
    setLogLines([]);
    setReportData(null);
    setClassification(null);
    setCurrentPhase(null);
    setSkippedSources([]);
    setErrorMessage("");
    setCurrentQuery("");
    setIsStale(false);
  }, []);

  const goToIdle = useCallback(() => {
    setAppState("idle");
  }, []);

  // Stale connection detection: check every 45s if no event/keepalive for 150s
  useEffect(() => {
    if (appState !== "searching") {
      setIsStale(false);
      return;
    }
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastEventTimeRef.current;
      if (elapsed > 150_000) {
        setIsStale(true);
      }
    }, 45_000);
    return () => clearInterval(interval);
  }, [appState]);

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
    isStale,
    runReport,
    retry,
    reset,
    goToIdle,
  };
}
