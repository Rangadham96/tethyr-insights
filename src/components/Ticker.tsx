import type { AppState, SourceInfo, ReportData, PhaseEvent } from "@/types/report";
import { SOURCE_REGISTRY } from "@/constants/sources";

interface TickerProps {
  appState: AppState;
  sources: SourceInfo[];
  reportData: ReportData | null;
  currentPhase?: PhaseEvent | null;
}

const Ticker = ({ appState, sources, reportData, currentPhase }: TickerProps) => {
  const getItems = (): Array<{ text: string; live: boolean; dot?: "red" | "green" }> => {
    switch (appState) {
      case "landing":
        return [
          { text: "Tethyr — Real signal, not AI opinion", live: false },
          { text: "29 platforms searched in real time", live: false },
          { text: "Evidence for every claim", live: false },
          { text: "Built for founders", live: false },
        ];
      case "idle":
        return Object.values(SOURCE_REGISTRY)
          .slice(0, 10)
          .map((s) => ({ text: `${s.display_name}: ready`, live: false }));
      case "searching":
        return sources.map((s) => ({
          text: `${SOURCE_REGISTRY[s.platform]?.display_name || s.display_name}: ${
            s.status === "done"
              ? `${s.items_found} found`
              : s.status === "searching"
              ? "searching"
              : s.status === "error"
              ? "failed"
              : "queued"
          }`,
          live: s.status === "searching",
          dot: s.status === "done" ? ("green" as const) : s.status === "searching" ? ("red" as const) : s.status === "error" ? ("red" as const) : undefined,
        }));
      case "complete":
        return [
          { text: `${sources.filter(s => s.status === "done").length} platforms searched`, live: false, dot: "green" as const },
          { text: `${reportData?.meta.data_points.toLocaleString() || 0} data points`, live: false, dot: "green" as const },
          { text: `Verdict: ${reportData?.meta.verdict || "—"}`, live: false, dot: "green" as const },
          { text: `Report ${reportData?.meta.report_id || ""}`, live: false },
        ];
      default:
        return [{ text: "Tethyr", live: false }];
    }
  };

  const getBadgeLabel = (): string => {
    if (appState === "searching" && currentPhase) {
      switch (currentPhase.phase) {
        case "classifying":
          return "Classifying";
        case "scraping":
          return `Scraping ${currentPhase.detail.replace(/ sources? complete/, "").replace(/ of /, "/")}`;
        case "synthesizing":
          return "Synthesizing";
        default:
          return "Searching";
      }
    }
    if (appState === "complete") return "Complete";
    return "Tethyr Live";
  };

  const items = getItems();
  const doubled = [...items, ...items];

  return (
    <div className="fixed top-0 left-0 right-0 z-[300] h-[26px] bg-ink flex items-center overflow-hidden">
      <div className="flex-shrink-0 h-full px-3.5 bg-red flex items-center font-mono text-[8.5px] tracking-[0.18em] uppercase text-paper border-r border-white/10">
        {getBadgeLabel()}
      </div>
      <div className="overflow-hidden flex-1">
        <div className="flex animate-ticker-scroll w-max">
          {doubled.map((item, i) => (
            <span
              key={i}
              className={`font-mono text-[8.5px] tracking-[0.09em] px-[22px] border-r border-white/[0.07] h-[26px] flex items-center gap-[7px] whitespace-nowrap ${
                item.live ? "text-paper/90" : "text-paper/50"
              }`}
            >
              {item.dot && (
                <span
                  className={`w-[5px] h-[5px] rounded-full flex-shrink-0 ${
                    item.dot === "green" ? "bg-[#3D9970]" : "bg-red-soft animate-blink"
                  }`}
                />
              )}
              {item.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Ticker;
