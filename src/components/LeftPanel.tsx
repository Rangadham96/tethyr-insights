import { useState } from "react";
import SearchInput from "@/components/SearchInput";
import { SOURCE_REGISTRY } from "@/constants/sources";
import { useAuth } from "@/hooks/useAuth";
import type { AppState, SourceInfo } from "@/types/report";

interface LeftPanelProps {
  onRunReport: (query: string, intents: string[]) => void;
  appState: AppState;
  sources: SourceInfo[];
  skippedSources: Array<{ platform: string; display_name: string; reason: string }>;
  query: string;
  onQueryChange: (q: string) => void;
}

const LeftPanel = ({
  onRunReport,
  appState,
  sources,
  skippedSources,
  query,
  onQueryChange,
}: LeftPanelProps) => {
  const { signOut } = useAuth();
  const [showSkipped, setShowSkipped] = useState(false);

  const SignOutButton = () => (
    <button
      onClick={() => signOut()}
      className="font-mono text-[8px] text-ink-5 tracking-[0.06em] bg-transparent border-none cursor-pointer hover:text-red transition-colors uppercase"
    >
      Sign out
    </button>
  );

  const isSearching = appState === "searching";
  const isComplete = appState === "complete";
  const doneCount = sources.filter((s) => s.status === "done").length;
  const progress = sources.length > 0 ? Math.round((doneCount / sources.length) * 100) : 0;

  return (
    <div
      className="border-r border-ink/[0.22] flex flex-col overflow-y-auto overflow-x-hidden bg-paper"
      style={{ scrollbarWidth: "thin" }}
    >
      {/* Brand */}
      <div className="px-7 pt-[22px] pb-[18px] border-b-2 border-ink flex-shrink-0">
        <div className="font-display text-[21px] font-bold tracking-tight text-ink">
          Teth<span className="text-red">y</span>r
        </div>
        <div className="font-mono text-[8.5px] tracking-[0.15em] uppercase text-ink-4 mt-[3px]">
          Real signal · Not AI opinion
        </div>
      </div>

      {/* How it works */}
      <div className="bg-red/[0.06] border-b border-red/[0.12] px-7 py-3 flex-shrink-0">
        <div className="font-mono text-[8.5px] tracking-[0.15em] uppercase text-red mb-[9px]">
          How Tethyr works
        </div>
        <div className="flex flex-col gap-[7px]">
          {[
            "Describe what you're building or the problem you're investigating.",
            "Tethyr searches Reddit, HackerNews, X, App Stores, G2 and more in real time.",
            "You get a structured intelligence report — evidence, gaps, competitor weaknesses, and what to build first.",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-[10px]">
              <div className="w-4 h-4 border border-red-soft rounded-full flex items-center justify-center font-mono text-[8px] text-red flex-shrink-0 mt-[1px]">
                {i + 1}
              </div>
              <div className="font-body text-[13px] text-ink-3 leading-[1.4] font-light">{step}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="px-7 py-5 border-b border-ink/10 flex-shrink-0">
        <div className="font-mono text-[8.5px] tracking-[0.15em] uppercase text-ink-4 mb-2 flex items-center gap-2">
          Your query
          <span className="text-red-soft text-[8px] tracking-[0.1em]">be specific for best results</span>
        </div>
        <SearchInput
          variant="panel"
          onRunReport={onRunReport}
          isSearching={isSearching}
          appState={appState}
          initialQuery={query}
          onQueryChange={onQueryChange}
        />
      </div>

      {/* Live sources */}
      {(isSearching || isComplete) && sources.length > 0 && (
        <div className="px-7 py-4 border-b border-ink/10 flex-shrink-0">
          <div className="font-mono text-[8.5px] tracking-[0.15em] uppercase text-ink-4">
            {isComplete ? "Sources searched" : "Live sources"}
          </div>
          <div className="flex flex-col mt-[10px] border border-ink/10 rounded-sm overflow-hidden">
            {sources.map((s, i) => (
              <div
                key={s.platform}
                className={`px-3 py-[9px] transition-colors hover:bg-white/40 ${
                  i < sources.length - 1 ? "border-b border-ink/10" : ""
                } ${
                  s.status === "done"
                    ? "bg-green/[0.04]"
                    : s.status === "searching"
                    ? "bg-red/[0.03]"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-ink-2 tracking-[0.04em]">
                    {SOURCE_REGISTRY[s.platform]?.display_name || s.display_name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-ink-4 tracking-[0.04em]">
                      {s.items_found > 0 ? `${s.items_found} found` : "—"}
                    </span>
                    <span
                      className={`font-mono text-[8px] tracking-[0.08em] uppercase px-1.5 py-[2px] rounded-sm ${
                        s.status === "done"
                          ? "bg-green/[0.07] text-green border border-green/[0.15]"
                          : s.status === "searching"
                          ? "bg-red/[0.08] text-red border border-red/[0.15] animate-badge-pulse"
                          : "bg-transparent text-ink-5 border border-ink/10"
                      }`}
                    >
                      {s.status === "done" ? "Done" : s.status === "searching" ? "Live" : "Queued"}
                    </span>
                  </div>
                </div>
                {s.selection_reason && (
                  <p className="font-body text-[11px] italic text-ink-4 leading-[1.4] mt-1 font-light">
                    {s.selection_reason}
                  </p>
                )}
              </div>
            ))}

            {/* Progress bar */}
            {isSearching && (
              <div className="px-3 py-2 border-t border-ink/10 bg-white/30">
                <div className="flex justify-between mb-[5px]">
                  <span className="font-mono text-[8px] text-ink-4 tracking-[0.06em]">Overall progress</span>
                  <span className="font-mono text-[8px] text-ink-4 tracking-[0.06em]">{progress}%</span>
                </div>
                <div className="h-[2px] bg-paper-darker rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-red-soft rounded-sm transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Skipped sources */}
          {skippedSources.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowSkipped(!showSkipped)}
                className="font-mono text-[8px] text-ink-4 tracking-[0.06em] cursor-pointer bg-transparent border-none p-0 hover:text-ink-3 transition-colors"
              >
                {skippedSources.length} sources not searched for this query {showSkipped ? "↑" : "↓"}
              </button>
              {showSkipped && (
                <div className="mt-2 flex flex-col gap-1.5">
                  {skippedSources.map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="font-mono text-[9px] text-ink-5 flex-shrink-0 mt-px">
                        {SOURCE_REGISTRY[s.platform]?.display_name || s.display_name}
                      </span>
                      <span className="font-body text-[11px] italic text-ink-5 font-light leading-[1.4]">
                        — {s.reason}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Idle sources placeholder */}
      {appState === "idle" && (
        <div className="px-7 py-4 border-b border-ink/10 flex-shrink-0">
          <div className="font-mono text-[8.5px] tracking-[0.15em] uppercase text-ink-4 mb-2">
            Sources
          </div>
          <p className="font-mono text-[9px] text-ink-5 tracking-[0.04em]">
            Sources will be selected based on your query
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto px-7 py-3.5 border-t border-ink/[0.22] flex-shrink-0 flex items-center justify-between">
        <div className="font-mono text-[8px] text-ink-5 tracking-[0.06em] leading-[1.6]">
          <a href="#" className="text-red no-underline hover:underline">
            Set up daily workspace →
          </a>
        </div>
        <SignOutButton />
      </div>
    </div>
  );
};

export default LeftPanel;
