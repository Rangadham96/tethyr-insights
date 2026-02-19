import { useState } from "react";

const promptStarters = [
  {
    tag: "Idea validation",
    text: "A tool that helps solo founders know if the problem they're solving is real, using real internet signal — not AI guessing",
  },
  {
    tag: "Competitor gap",
    text: "What are users of Notion, Linear, and Asana actually complaining about that nobody has solved yet?",
  },
  {
    tag: "Feature decision",
    text: "Should I build a mobile app or a Slack integration first for a B2B async communication tool?",
  },
  {
    tag: "Market sizing",
    text: "How many people are talking about burnout from remote work and what solutions are they asking for?",
  },
];

const intents = [
  "Validate the problem",
  "Feature gaps",
  "Competitor weaknesses",
  "Audience language",
  "Build priority",
  "Market size signal",
];

const sources = [
  { name: "Reddit", count: "34 threads", status: "done" as const },
  { name: "HackerNews", count: "12 threads", status: "done" as const },
  { name: "X / Twitter", count: "1,204 scanned", status: "live" as const },
  { name: "App Store", count: "847 reviews", status: "live" as const },
  { name: "G2 / Trustpilot", count: "—", status: "queued" as const },
  { name: "Product Hunt", count: "—", status: "queued" as const },
  { name: "YouTube comments", count: "—", status: "queued" as const },
];

const tips = [
  { bold: "Name your competitors", text: "— \"compared to Notion and Linear\" gives the agent a starting point and surfaces specific complaints." },
  { bold: "Describe your user, not your product", text: "— \"solo founders who can't code\" gives better signal than \"a no-code app builder\"." },
  { bold: "Ask the uncomfortable question", text: "— \"Is this already solved?\" is the most valuable thing Tethyr can tell you." },
  { bold: "Include the market segment", text: "— \"B2B SaaS PMs\" vs \"consumers\" changes where the agent looks and what it surfaces." },
];

interface LeftPanelProps {
  onRunReport: () => void;
  isSearching: boolean;
}

const LeftPanel = ({ onRunReport, isSearching }: LeftPanelProps) => {
  const [query, setQuery] = useState("");
  const [activeIntents, setActiveIntents] = useState<Set<number>>(new Set([0, 1, 2]));

  const toggleIntent = (idx: number) => {
    setActiveIntents((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handlePromptClick = (text: string) => {
    setQuery(text);
  };

  return (
    <div className="border-r border-ink/[0.22] flex flex-col overflow-y-auto overflow-x-hidden bg-paper" style={{ scrollbarWidth: "thin" }}>
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
              <div className="font-body text-[13px] text-ink-3 leading-[1.4] font-light">
                {step}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Query input */}
      <div className="px-7 py-5 border-b border-ink/10 flex-shrink-0">
        <div className="font-mono text-[8.5px] tracking-[0.15em] uppercase text-ink-4 mb-2 flex items-center gap-2">
          Your query
          <span className="text-red-soft text-[8px] tracking-[0.1em]">be specific for best results</span>
        </div>
        <textarea
          className="w-full bg-white/65 border border-ink/[0.22] rounded-sm px-3.5 py-[13px] font-body text-[15px] font-light text-ink resize-none min-h-[110px] outline-none leading-[1.55] transition-all placeholder:text-ink-5 placeholder:italic focus:border-ink-3 focus:shadow-[0_0_0_2px_rgba(28,25,23,0.05)]"
          placeholder="e.g. An app that helps early-stage founders understand if their startup idea is actually needed, by searching real conversations online instead of relying on AI-generated advice…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex justify-between items-center mt-1.5">
          <span className="font-mono text-[8px] text-ink-5 tracking-[0.06em]">
            Longer, more specific queries return better reports
          </span>
          <span className="font-mono text-[8px] text-red-soft tracking-[0.06em] cursor-pointer underline underline-offset-2">
            See tips ↓
          </span>
        </div>
      </div>

      {/* Prompt starters */}
      <div className="px-7 py-4 border-b border-ink/10 flex-shrink-0">
        <div className="flex items-center justify-between mb-[10px]">
          <div className="font-mono text-[8.5px] tracking-[0.15em] uppercase text-ink-4">
            Try one of these
          </div>
          <span className="font-body text-[12px] text-ink-4 italic">click to use</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {promptStarters.map((p, i) => (
            <div
              key={i}
              onClick={() => handlePromptClick(p.text)}
              className="group bg-white/65 border border-ink/10 rounded-sm px-3 py-[9px] cursor-pointer transition-all hover:border-ink-3 hover:bg-white/75 relative"
            >
              <div className="font-mono text-[7.5px] tracking-[0.1em] uppercase text-ink-4 mb-1">
                {p.tag}
              </div>
              <div className="font-body text-[13px] italic text-ink-2 leading-[1.4] pr-[60px]">
                "{p.text}"
              </div>
              <span className="absolute right-[10px] top-1/2 -translate-y-1/2 font-mono text-[8px] text-red tracking-[0.08em] opacity-0 group-hover:opacity-100 transition-opacity">
                ↑ use this
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Intent selectors */}
      <div className="px-7 py-4 border-b border-ink/10 flex-shrink-0">
        <div className="font-mono text-[8.5px] tracking-[0.15em] uppercase text-ink-4">
          What do you want to know?
        </div>
        <div className="grid grid-cols-2 gap-1.5 mt-2">
          {intents.map((intent, i) => {
            const active = activeIntents.has(i);
            return (
              <div
                key={i}
                onClick={() => toggleIntent(i)}
                className={`flex items-center gap-2 px-[10px] py-2 border rounded-sm cursor-pointer transition-all ${
                  active
                    ? "border-ink-3 bg-white/70"
                    : "border-ink/10 bg-white/65"
                }`}
              >
                <div
                  className={`w-[13px] h-[13px] border rounded-sm flex items-center justify-center text-[9px] flex-shrink-0 transition-all ${
                    active
                      ? "bg-ink border-ink text-paper"
                      : "border-ink/[0.22] text-red"
                  }`}
                >
                  {active && "✓"}
                </div>
                <span className="font-mono text-[9px] text-ink-3 tracking-[0.04em] leading-[1.3]">
                  {intent}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Run button */}
      <div className="px-7 py-4 border-b border-ink/10 flex-shrink-0">
        <button
          onClick={onRunReport}
          disabled={isSearching}
          className="w-full bg-ink text-paper border-none py-[13px] px-[18px] rounded-sm font-mono text-[10px] tracking-[0.14em] uppercase cursor-pointer flex items-center justify-between transition-colors hover:bg-red disabled:opacity-70"
        >
          <span>{isSearching ? "Searching…" : "Run Intelligence Report"}</span>
          <span>→</span>
        </button>
        <div className="font-mono text-[8px] text-ink-4 tracking-[0.06em] mt-[7px] text-center">
          60–90 seconds · No account needed for your first report
        </div>
      </div>

      {/* Live sources */}
      <div className="px-7 py-4 border-b border-ink/10 flex-shrink-0">
        <div className="font-mono text-[8.5px] tracking-[0.15em] uppercase text-ink-4">
          Live sources
        </div>
        <div className="flex flex-col mt-[10px] border border-ink/10 rounded-sm overflow-hidden">
          {sources.map((s, i) => (
            <div
              key={i}
              className={`grid grid-cols-[1fr_auto_auto] items-center gap-2 px-3 py-[9px] transition-colors hover:bg-white/40 ${
                i < sources.length - 1 ? "border-b border-ink/10" : ""
              } ${
                s.status === "done"
                  ? "bg-green/[0.04]"
                  : s.status === "live"
                  ? "bg-red/[0.03]"
                  : ""
              }`}
            >
              <span className="font-mono text-[10px] text-ink-2 tracking-[0.04em]">
                {s.name}
              </span>
              <span className="font-mono text-[9px] text-ink-4 tracking-[0.04em]">
                {s.count}
              </span>
              <span
                className={`font-mono text-[8px] tracking-[0.08em] uppercase px-1.5 py-[2px] rounded-sm ${
                  s.status === "done"
                    ? "bg-green/[0.07] text-green border border-green/[0.15]"
                    : s.status === "live"
                    ? "bg-red/[0.08] text-red border border-red/[0.15] animate-badge-pulse"
                    : "bg-transparent text-ink-5 border border-ink/10"
                }`}
              >
                {s.status === "done" ? "Done" : s.status === "live" ? "Live" : "Queued"}
              </span>
            </div>
          ))}
          {/* Progress bar */}
          <div className="px-3 py-2 border-t border-ink/10 bg-white/30">
            <div className="flex justify-between mb-[5px]">
              <span className="font-mono text-[8px] text-ink-4 tracking-[0.06em]">Overall progress</span>
              <span className="font-mono text-[8px] text-ink-4 tracking-[0.06em]">62% · ~38s remaining</span>
            </div>
            <div className="h-[2px] bg-paper-darker rounded-sm overflow-hidden">
              <div className="h-full bg-red-soft rounded-sm transition-all duration-500" style={{ width: "62%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="px-7 py-4 border-b border-ink/10 flex-shrink-0">
        <div className="font-mono text-[8.5px] tracking-[0.15em] uppercase text-ink-4">
          Tips for better reports
        </div>
        <div className="flex flex-col gap-2 mt-[10px]">
          {tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-[10px]">
              <span className="font-mono text-[9px] text-amber flex-shrink-0 mt-[2px]">→</span>
              <span className="font-body text-[13px] text-ink-3 leading-[1.45] font-light">
                <strong className="text-ink-2 font-medium">{tip.bold}</strong>
                {tip.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto px-7 py-3.5 border-t border-ink/[0.22] flex-shrink-0">
        <div className="font-mono text-[8px] text-ink-5 tracking-[0.06em] leading-[1.6]">
          No account needed for first report.<br />
          <a href="#" className="text-red no-underline hover:underline">
            Set up daily workspace for your company →
          </a>
        </div>
      </div>
    </div>
  );
};

export default LeftPanel;
