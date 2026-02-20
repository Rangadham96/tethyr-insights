import { useState, useCallback } from "react";
import { useReport } from "@/hooks/useReport";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import Ticker from "@/components/Ticker";
import LeftPanel from "@/components/LeftPanel";
import ReportPanel from "@/components/ReportPanel";
import EmptyState from "@/components/EmptyState";
import SearchingState from "@/components/SearchingState";
import LandingPage from "@/components/LandingPage";
import AuthCTA from "@/components/AuthCTA";

const Index = () => {
  const { isAuthenticated } = useAuth();
  const {
    appState,
    sources,
    logLines,
    reportData,
    userTier,
    classification,
    currentPhase,
    skippedSources,
    errorMessage,
    runReport,
    reset,
  } = useReport();

  const [query, setQuery] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const [showSplit, setShowSplit] = useState(false);
  const [mobileTab, setMobileTab] = useState<"report" | "sources">("report");
  const isMobile = useIsMobile();

  const handleRunReport = useCallback(
    (q: string, intents: string[]) => {
      setQuery(q);
      setMobileTab("report");

      if (appState === "landing") {
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
  const effectiveAppState = showSplit && appState === "landing" ? "searching" : appState;

  // Mobile layout: stacked with tab switcher
  if (isMobile) {
    return (
      <div
        className={`h-screen overflow-hidden relative z-[1] transition-opacity duration-300 ${
          transitioning ? "opacity-0" : "opacity-100"
        }`}
      >
        <Ticker appState={showSplit ? (appState === "landing" ? "searching" : appState) : appState} sources={sources} reportData={reportData} currentPhase={currentPhase} />

        {/* Mobile tab bar */}
        <div className="flex border-b border-ink/[0.22] mt-[26px] bg-paper">
          <button
            onClick={() => setMobileTab("report")}
            className={`flex-1 py-2.5 font-mono text-[9px] tracking-[0.12em] uppercase border-none cursor-pointer transition-colors ${
              mobileTab === "report"
                ? "bg-paper text-ink border-b-2 border-b-red"
                : "bg-paper-dark text-ink-4"
            }`}
          >
            {effectiveAppState === "searching" ? "Live Feed" : effectiveAppState === "complete" ? "Report" : "Report"}
          </button>
          <button
            onClick={() => setMobileTab("sources")}
            className={`flex-1 py-2.5 font-mono text-[9px] tracking-[0.12em] uppercase border-none cursor-pointer transition-colors ${
              mobileTab === "sources"
                ? "bg-paper text-ink border-b-2 border-b-red"
                : "bg-paper-dark text-ink-4"
            }`}
          >
            Sources {sources.length > 0 ? `(${doneCount}/${sources.length})` : ""}
          </button>
        </div>

        <div className="h-[calc(100vh-26px-37px)] overflow-hidden">
          {mobileTab === "report" ? (
            <div className="flex flex-col overflow-y-auto h-full">
              {(effectiveAppState === "idle" || (appState === "landing" && showSplit)) && (
                <EmptyState onQuerySelect={handleQuerySelect} />
              )}
              {effectiveAppState === "searching" && (
                <SearchingState
                  query={query}
                  classification={classification}
                  logLines={logLines}
                  sourcesTotal={sources.length}
                  sourcesDone={doneCount}
                  currentPhase={currentPhase}
                />
              )}
              {appState === "complete" && reportData && (
                <>
                  {!isAuthenticated && <AuthCTA />}
                  <ReportPanel reportData={reportData} userTier={userTier} />
                </>
              )}
              {appState === "error" && (
                <div className="flex flex-col items-center justify-center h-full px-6">
                  <div className="font-display text-[20px] text-ink mb-3">Something went wrong</div>
                  <p className="font-body text-[14px] text-ink-3 font-light mb-6">{errorMessage}</p>
                  <button
                    onClick={handleNewReport}
                    className="bg-ink text-paper px-5 py-2.5 font-mono text-[10px] tracking-[0.14em] uppercase border-none cursor-pointer hover:bg-red transition-colors"
                  >
                    Try Again →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <LeftPanel
              onRunReport={handleRunReport}
              appState={effectiveAppState}
              sources={sources}
              skippedSources={skippedSources}
              query={query}
              onQueryChange={setQuery}
            />
          )}
        </div>
      </div>
    );
  }

  // Desktop layout: side-by-side
  return (
    <div
      className={`h-screen overflow-hidden relative z-[1] transition-opacity duration-300 ${
        transitioning ? "opacity-0" : "opacity-100"
      }`}
    >
      <Ticker appState={showSplit ? (appState === "landing" ? "searching" : appState) : appState} sources={sources} reportData={reportData} currentPhase={currentPhase} />
      <div
        className="grid h-[calc(100vh-26px)] mt-[26px] relative z-[1]"
        style={{ gridTemplateColumns: "380px 1fr" }}
      >
        <LeftPanel
          onRunReport={handleRunReport}
          appState={effectiveAppState}
          sources={sources}
          skippedSources={skippedSources}
          query={query}
          onQueryChange={setQuery}
        />

        {/* Right panel */}
        <div className="flex flex-col overflow-hidden">
          {(effectiveAppState === "idle" || (appState === "landing" && showSplit)) && (
            <EmptyState onQuerySelect={handleQuerySelect} />
          )}

          {effectiveAppState === "searching" && (
            <SearchingState
              query={query}
              classification={classification}
              logLines={logLines}
              sourcesTotal={sources.length}
              sourcesDone={doneCount}
              currentPhase={currentPhase}
            />
          )}

          {appState === "complete" && reportData && (
            <>
              {!isAuthenticated && <AuthCTA />}
              <ReportPanel reportData={reportData} userTier={userTier} />
            </>
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
