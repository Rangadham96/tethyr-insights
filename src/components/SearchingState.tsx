import { useState, useEffect } from "react";
import type { ClassificationEvent, LogEvent, PhaseEvent } from "@/types/report";

const TIPS = [
  "TinyFish agents are browsing platforms in stealth mode right now...",
  "Deep research typically takes 3-5 minutes for comprehensive results.",
  "Each source is scraped independently — fast platforms finish first.",
  "Every claim in your report will be backed by real human quotes.",
  "We filter out spam, bots, and low-quality posts automatically.",
  "Your report synthesizes signal from thousands of data points.",
];

interface SearchingStateProps {
  query: string;
  classification: ClassificationEvent | null;
  logLines: LogEvent[];
  sourcesTotal: number;
  sourcesDone: number;
  currentPhase?: PhaseEvent | null;
}

const SearchingState = ({
  query,
  classification,
  logLines,
  sourcesTotal,
  sourcesDone,
  currentPhase,
}: SearchingStateProps) => {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const getPhaseLabel = (): { stage: string; estimate: string } => {
    if (!currentPhase) return { stage: "STAGE 1 OF 3 · CLASSIFYING QUERY", estimate: "~15 sec" };
    switch (currentPhase.phase) {
      case "classifying":
        return { stage: "STAGE 1 OF 3 · CLASSIFYING QUERY", estimate: "~15 sec" };
      case "scraping":
        return { stage: "STAGE 2 OF 3 · SCRAPING PLATFORMS", estimate: "~3-5 min" };
      case "synthesizing":
        return { stage: "STAGE 3 OF 3 · SYNTHESIZING REPORT", estimate: "~30 sec" };
      default:
        return { stage: "PROCESSING", estimate: "" };
    }
  };

  const { stage, estimate } = getPhaseLabel();

  return (
    <div className="flex flex-col h-full overflow-y-auto px-10 py-8" style={{ scrollbarWidth: "thin" }}>
      {/* Phase banner */}
      <div
        className="flex items-center justify-between mb-5 pb-3 border-b border-ink/10"
        style={{ animation: "section-in 0.4s ease forwards" }}
      >
        <div className="flex items-center gap-2.5">
          <span className="w-[6px] h-[6px] rounded-full bg-red-soft animate-pulse-dot flex-shrink-0" />
          <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-ink-3">
            {stage}
          </span>
        </div>
        {estimate && (
          <span className="font-mono text-[8.5px] tracking-[0.06em] text-ink-4">
            {estimate}
          </span>
        )}
      </div>

      {/* Query display */}
      <div className="mb-6">
        <div className="font-mono text-[8px] tracking-[0.12em] uppercase text-ink-4 mb-2">
          Searching for
        </div>
        <p className="font-display text-[18px] italic text-ink-2 leading-[1.45]">
          "{query}"
        </p>
      </div>

      {/* Classification card */}
      {classification && (
        <div
          className="border-l-2 border-amber bg-amber/[0.04] rounded-sm px-4 py-3 mb-6"
          style={{ animation: "section-in 0.4s ease forwards" }}
        >
          <div className="font-mono text-[8px] tracking-[0.14em] uppercase text-ink-3 mb-1.5">
            {classification.market_type.replace(/_/g, " ")} · {classification.audience_type.replace(/_/g, " ")} · {classification.problem_maturity}
          </div>
          <p className="font-body text-[13px] italic text-ink-3 leading-[1.5] font-light">
            {classification.routing_rationale}
          </p>
        </div>
      )}

      {/* Log feed */}
      <div className="flex flex-col gap-1.5 flex-1">
        {logLines.map((line, i) => {
          const isLatest = i === logLines.length - 1;
          return (
            <div
              key={i}
              className="flex items-start gap-2.5"
              style={{ animation: "section-in 0.3s ease forwards", animationDelay: `${Math.min(i, 20) * 30}ms`, opacity: 0 }}
            >
              <span
                className={`w-[5px] h-[5px] rounded-full flex-shrink-0 mt-[6px] ${
                  line.type === "found"
                    ? "bg-green"
                    : line.type === "error"
                    ? "bg-red"
                    : isLatest
                    ? "bg-red-soft animate-pulse-dot"
                    : "bg-ink-4"
                }`}
              />
              <span
                className={`font-mono text-[10px] tracking-[0.04em] leading-[1.5] ${
                  line.type === "found"
                    ? "text-green"
                    : line.type === "error"
                    ? "text-red"
                    : "text-ink-3"
                }`}
              >
                {line.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress summary */}
      {sourcesTotal > 0 && (
        <div className="mt-6 pt-4 border-t border-ink/10">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-ink-4 tracking-[0.06em]">
              {sourcesDone} of {sourcesTotal} sources complete
            </span>
            <span className="font-mono text-[9px] text-ink-4 tracking-[0.06em]">
              {sourcesTotal > 0 ? Math.round((sourcesDone / sourcesTotal) * 100) : 0}%
            </span>
          </div>
          <div className="h-[2px] bg-paper-darker rounded-sm overflow-hidden mt-1.5">
            <div
              className="h-full bg-red-soft rounded-sm transition-all duration-500"
              style={{ width: `${sourcesTotal > 0 ? (sourcesDone / sourcesTotal) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Rotating tips */}
      {currentPhase?.phase === "scraping" && (
        <div className="mt-4 pt-3">
          <p
            key={tipIndex}
            className="font-body text-[12px] italic text-ink-4 font-light leading-[1.5]"
            style={{ animation: "section-in 0.5s ease forwards" }}
          >
            💡 {TIPS[tipIndex]}
          </p>
        </div>
      )}

      {/* Synthesizing message */}
      {currentPhase?.phase === "synthesizing" && (
        <div
          className="mt-6 border-l-2 border-green bg-green/[0.04] rounded-sm px-4 py-3"
          style={{ animation: "section-in 0.4s ease forwards" }}
        >
          <div className="font-mono text-[8px] tracking-[0.14em] uppercase text-green mb-1">
            Synthesizing
          </div>
          <p className="font-body text-[13px] italic text-ink-3 leading-[1.5] font-light">
            Generating your intelligence report from all collected data...
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchingState;
