import { useState, useRef, useEffect } from "react";
import type { AppState } from "@/types/report";

const INTENT_TABS = [
  { key: "validate", label: "Validate idea" },
  { key: "gaps", label: "Find gaps" },
  { key: "competitor", label: "Competitor intel" },
  { key: "audience", label: "Audience language" },
  { key: "build", label: "What to build first" },
] as const;

const PLACEHOLDERS: Record<string, string> = {
  validate: "Describe the problem you think exists and who experiences it…",
  gaps: "What product or category do you want to find gaps in?",
  competitor: "Which competitors do you want to investigate?",
  audience: "Whose language do you want to understand?",
  build: "Describe what you're considering building…",
};

const EXAMPLES: Record<string, string[]> = {
  validate: [
    "A tool that helps solo founders know if the problem they're solving is real, using real internet signal — not AI guessing",
    "An app that helps people with chronic pain track their triggers and share structured reports with their doctor",
    "A browser extension that detects when you're reading AI-generated content and warns you before you cite it",
  ],
  gaps: [
    "What are users of Notion, Linear, and Asana actually complaining about that nobody has solved yet?",
    "What features are missing from the top 5 meditation apps according to App Store reviews?",
    "What do small business owners say is broken about current invoicing tools?",
  ],
  competitor: [
    "What are Calm and Headspace users frustrated about? Are there patterns in their 1-star reviews?",
    "Compare what users say about Figma vs Sketch vs Adobe XD in design communities",
    "What are the most common complaints about Shopify from merchants on Reddit?",
  ],
  audience: [
    "How do new parents talk about sleep training — what words and phrases do they actually use?",
    "What language do B2B SaaS PMs use when they describe their workflow frustrations?",
    "How do remote workers describe burnout? What solutions are they asking for?",
  ],
  build: [
    "Should I build a mobile app or a Slack integration first for a B2B async communication tool?",
    "I'm building a habit tracker for ADHD — should I start with the tracking or the accountability features?",
    "What should a solo developer build first: the dashboard or the data import pipeline?",
  ],
};

const TIPS = [
  {
    label: "Be specific",
    title: "Name your user, not your product",
    body: "\"Solo founders who can't code\" gives better signal than \"a no-code app builder.\" Tethyr searches where your user talks — help it find them.",
    example: "An app for solo founders who can't code to validate their startup idea using real conversations",
  },
  {
    label: "Add competitors",
    title: "Name what people use today",
    body: "Naming competitors lets Tethyr search their review pages, comparison threads, and complaint discussions directly.",
    example: "What are users of Notion and Linear actually complaining about that nobody has solved?",
  },
  {
    label: "Ask the hard question",
    title: "Ask if it's already solved",
    body: "\"Is this already solved?\" is the most valuable thing Tethyr can tell you. Don't be afraid to ask.",
    example: "Is the problem of mental health tracking for therapy patients already well-solved by existing apps?",
  },
  {
    label: "Include context",
    title: "Specify market and stage",
    body: "\"B2B SaaS PMs\" vs \"consumers\" changes where the agent looks. \"Early-stage\" vs \"scaling\" changes what it prioritizes.",
    example: "How many early-stage B2B SaaS companies are talking about burnout from remote work?",
  },
];

interface SearchInputProps {
  variant: "landing" | "panel";
  onRunReport: (query: string, intents: string[]) => void;
  isSearching: boolean;
  appState: AppState;
  initialQuery?: string;
  onQueryChange?: (query: string) => void;
}

const SearchInput = ({
  variant,
  onRunReport,
  isSearching,
  appState,
  initialQuery = "",
  onQueryChange,
}: SearchInputProps) => {
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState("validate");
  const [isFocused, setIsFocused] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasTyped = query.length > 0;
  const charCount = query.length;

  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
    }
    // Only sync when initialQuery changes externally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const updateQuery = (val: string) => {
    setQuery(val);
    onQueryChange?.(val);
  };

  const fillQuery = (text: string) => {
    setQuery(text);
    onQueryChange?.(text);
    textareaRef.current?.focus();
  };

  const handleSubmit = () => {
    if (charCount < 80 || isSearching) return;
    onRunReport(query, [activeTab]);
  };

  const isComplete = appState === "complete";
  const isEnabled = charCount >= 80 && !isSearching;

  const qualityIndicator = () => {
    if (charCount === 0) return null;
    if (charCount < 80)
      return <span className="text-red font-mono text-[9px] tracking-[0.04em]">Add more detail for a better report</span>;
    if (charCount <= 200)
      return <span className="text-green font-mono text-[9px] tracking-[0.04em]">Good</span>;
    return <span className="text-green font-mono text-[9px] tracking-[0.04em]">Detailed — best results</span>;
  };

  const contextualNudge = () => {
    if (charCount < 20 || charCount >= 80) return null;
    const hasCompetitor = /compared to|vs |versus |competitor|notion|linear|calm|headspace|shopify|figma/i.test(query);
    if (charCount < 50) {
      return "Good start. Add who your user is — 'solo founders', 'small teams' — and Tethyr searches where they actually talk.";
    }
    if (!hasCompetitor) {
      return "Try naming a competitor. 'What are [Competitor] users frustrated about?' is one of the most powerful queries you can run.";
    }
    return null;
  };

  const goodQueryDot = charCount >= 80;

  const wrapperClass = variant === "landing" ? "max-w-[640px] mx-auto w-full" : "w-full";

  return (
    <div className={wrapperClass}>
      {/* Layer 1: Intent tabs */}
      {!hasTyped && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {INTENT_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 font-mono text-[9px] tracking-[0.08em] uppercase border cursor-pointer transition-all ${
                activeTab === tab.key
                  ? "border-ink-3 bg-white/70 text-ink-2"
                  : "border-ink/10 bg-white/40 text-ink-4 hover:border-ink/[0.22]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Layer 2: Textarea with hint bar */}
      <div className="relative">
        {isFocused && (
          <div className="font-mono text-[8px] tracking-[0.12em] uppercase text-amber mb-1.5 transition-opacity">
            {activeTab === "validate" ? "Describe what you're building" : `${INTENT_TABS.find(t => t.key === activeTab)?.label}`}
          </div>
        )}
        <textarea
          ref={textareaRef}
          className={`w-full bg-white/65 border border-ink/[0.22] rounded-sm px-3.5 py-[13px] font-body text-[15px] font-light text-ink resize-none outline-none leading-[1.55] transition-all placeholder:text-ink-5 placeholder:italic focus:border-ink-3 focus:shadow-[0_0_0_2px_rgba(28,25,23,0.05)] ${
            isFocused ? "min-h-[130px]" : "min-h-[100px]"
          }`}
          placeholder={PLACEHOLDERS[activeTab]}
          value={query}
          onChange={(e) => updateQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {/* Footer row: button + tips link */}
        <div className="flex items-center justify-between mt-2">
          <button
            onClick={handleSubmit}
            disabled={!isEnabled}
            className={`bg-ink text-paper border-none py-[11px] px-[18px] rounded-sm font-mono text-[10px] tracking-[0.14em] uppercase cursor-pointer flex items-center gap-3 transition-colors hover:bg-red disabled:cursor-default ${
              !isEnabled ? "opacity-40 pointer-events-none" : ""
            }`}
          >
            <span>{isSearching ? "Searching…" : isComplete ? "Run New Report →" : "Run Intelligence Report"}</span>
            {!isSearching && !isComplete && <span>→</span>}
          </button>
          <button
            onClick={() => setShowTips(!showTips)}
            className="font-mono text-[8px] text-red-soft tracking-[0.06em] cursor-pointer underline underline-offset-2 bg-transparent border-none"
          >
            {showTips ? "Hide tips" : "How to get a better report?"}
          </button>
        </div>
      </div>

      {/* Layer 3: Character quality + count */}
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-2">
          {goodQueryDot && !contextualNudge() && (
            <span className="w-[6px] h-[6px] rounded-full bg-green animate-badge-pulse" />
          )}
          {qualityIndicator()}
        </div>
        <span className="font-mono text-[8px] text-ink-5 tracking-[0.04em]">{charCount}</span>
      </div>

      {/* Layer 4: Contextual nudge */}
      {contextualNudge() && (
        <div className="mt-2 bg-amber/[0.06] border border-amber/[0.15] rounded-sm px-3 py-2.5">
          <p className="font-body text-[12px] text-ink-3 leading-[1.5] font-light">{contextualNudge()}</p>
        </div>
      )}

      {/* Green confirmation at 80+ */}
      {goodQueryDot && !contextualNudge() && charCount > 0 && charCount < 200 && (
        <div className="mt-2 flex items-center gap-2">
          <span className="font-mono text-[9px] text-green tracking-[0.04em]">Good query — Tethyr will select the best sources for this</span>
        </div>
      )}

      {/* Layer 5: Tips panel */}
      {showTips && (
        <div className="grid grid-cols-2 gap-2 mt-3">
          {TIPS.map((tip, i) => (
            <div key={i} className="border border-ink/10 bg-white/50 rounded-sm p-3">
              <div className="font-mono text-[7.5px] tracking-[0.12em] uppercase text-red mb-1.5">{tip.label}</div>
              <div className="font-display text-[13px] text-ink-2 mb-1">{tip.title}</div>
              <p className="font-body text-[12px] text-ink-3 leading-[1.45] font-light mb-2">{tip.body}</p>
              <button
                onClick={() => fillQuery(tip.example)}
                className="font-body text-[12px] italic text-ink-4 hover:text-red cursor-pointer bg-transparent border-none p-0 text-left transition-colors"
              >
                "{tip.example}" ↑
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Layer 6: Contextual examples */}
      {!hasTyped && (
        <div className="mt-4">
          <div className="font-mono text-[8px] tracking-[0.12em] uppercase text-ink-4 mb-2">
            {INTENT_TABS.find((t) => t.key === activeTab)?.label} examples
          </div>
          <div className="flex flex-col gap-1.5">
            {EXAMPLES[activeTab]?.map((example, i) => (
              <div
                key={i}
                onClick={() => fillQuery(example)}
                className="group border-l-2 border-ink/10 hover:border-red pl-3 py-2 cursor-pointer transition-all relative"
              >
                <p className="font-body text-[13px] italic text-ink-3 leading-[1.45] pr-[60px]">"{example}"</p>
                <span className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-[8px] text-red tracking-[0.08em] opacity-0 group-hover:opacity-100 transition-opacity">
                  Use this ↑
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Below input note (landing variant only) */}
      {variant === "landing" && !hasTyped && (
        <div className="font-mono text-[8px] text-ink-4 tracking-[0.06em] mt-4 text-center">
          No account needed · First report free · 60–90 seconds
        </div>
      )}
    </div>
  );
};

export default SearchInput;
