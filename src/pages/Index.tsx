import { useState, useCallback } from "react";
import { useReport } from "@/hooks/useReport";
import Ticker from "@/components/Ticker";
import LeftPanel from "@/components/LeftPanel";
import ReportPanel from "@/components/ReportPanel";
import EmptyState from "@/components/EmptyState";
import SearchingState from "@/components/SearchingState";
import LandingPage from "@/components/LandingPage";

const Index = () => {
  const {
    appState,
    sources,
    logLines,
    reportData,
    userTier,
    classification,
    skippedSources,
    errorMessage,
    runReport,
    reset,
  } = useReport();

  const [query, setQuery] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const [showSplit, setShowSplit] = useState(false);

  const handleRunReport = useCallback(
    (q: string, intents: string[]) => {
      setQuery(q);

      if (appState === "landing") {
        // Landing → searching transition
        setTransitioning(true);
        setTimeout(() => {
          setShowSplit(true);
          runReport(q, intents);
          setTimeout(() => setTransitioning(false), 50);
        }, 300);
      } else {
        runReport(q, intents);
      }
    },
    [appState, runReport],
  );

  const handleQuerySelect = useCallback((text: string) => {
    setQuery(text);
  }, []);

  const handleNewReport = useCallback(() => {
    reset();
    setQuery("");
  }, [reset]);

  // Landing state — full screen
  if (appState === "landing" && !showSplit) {
    return (
      <div
        className={`transition-opacity duration-300 ${transitioning ? "opacity-0" : "opacity-100"}`}
      >
        <LandingPage
          onRunReport={handleRunReport}
          isSearching={false}
          appState={appState}
        />
      </div>
    );
  }

  // Split panel layout (idle, searching, complete, error)
  const doneCount = sources.filter((s) => s.status === "done").length;

  return (
    <div
      className={`h-screen overflow-hidden relative z-[1] transition-opacity duration-300 ${
        transitioning ? "opacity-0" : "opacity-100"
      }`}
    >
      <Ticker appState={showSplit ? (appState === "landing" ? "searching" : appState) : appState} sources={sources} reportData={reportData} />
      <div
        className="grid h-[calc(100vh-26px)] mt-[26px] relative z-[1]"
        style={{ gridTemplateColumns: "380px 1fr" }}
      >
        <LeftPanel
          onRunReport={handleRunReport}
          appState={showSplit && appState === "landing" ? "searching" : appState}
          sources={sources}
          skippedSources={skippedSources}
          query={query}
          onQueryChange={setQuery}
        />

        {/* Right panel */}
        <div className="flex flex-col overflow-hidden">
          {(appState === "idle" || (appState === "landing" && showSplit)) && (
            <EmptyState onQuerySelect={handleQuerySelect} />
          )}

          {appState === "searching" && (
            <SearchingState
              query={query}
              classification={classification}
              logLines={logLines}
              sourcesTotal={sources.length}
              sourcesDone={doneCount}
            />
          )}

          {appState === "complete" && reportData && (
            <ReportPanel reportData={reportData} userTier={userTier} />
          )}

          {appState === "error" && (
            <div className="flex flex-col items-center justify-center h-full px-12">
              <div className="font-display text-[24px] text-ink mb-3">Something went wrong</div>
              <p className="font-body text-[15px] text-ink-3 font-light mb-6">{errorMessage}</p>
              <button
                onClick={handleNewReport}
                className="bg-ink text-paper px-5 py-2.5 font-mono text-[10px] tracking-[0.14em] uppercase border-none cursor-pointer hover:bg-red transition-colors"
              >
                Try Again →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
