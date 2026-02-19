import type { ClassificationEvent, LogEvent } from "@/types/report";

interface SearchingStateProps {
  query: string;
  classification: ClassificationEvent | null;
  logLines: LogEvent[];
  sourcesTotal: number;
  sourcesDone: number;
}

const SearchingState = ({
  query,
  classification,
  logLines,
  sourcesTotal,
  sourcesDone,
}: SearchingStateProps) => {
  return (
    <div className="flex flex-col h-full overflow-y-auto px-10 py-8" style={{ scrollbarWidth: "thin" }}>
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
        {logLines.map((line, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5"
            style={{ animation: "section-in 0.3s ease forwards", animationDelay: `${i * 50}ms`, opacity: 0 }}
          >
            <span
              className={`w-[5px] h-[5px] rounded-full flex-shrink-0 mt-[6px] ${
                line.type === "found"
                  ? "bg-green"
                  : line.type === "error"
                  ? "bg-red"
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
        ))}
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
    </div>
  );
};

export default SearchingState;
