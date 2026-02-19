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
  validate: "Describe what you're building or the problem you're investigating…",
  gaps: "Name a product category or competitors…",
  competitor: "Name the competitors to investigate…",
  audience: "Describe who your audience is…",
  build: "Describe what you're considering building…",
};

const HINT_TEXT: Record<string, string> = {
  validate: "Describe what you're building",
  gaps: "Name a product category or competitors",
  competitor: "Name the competitors to investigate",
  audience: "Describe who your audience is",
  build: "Describe what you're building",
};

const EXAMPLES: Record<string, string[]> = {
  validate: [
    "An app that helps solo founders know if the problem they're solving actually exists, using real conversations online instead of AI-generated validation",
    "A mental health tool for remote workers who feel isolated — is this problem real and underserved or already saturated?",
    "A B2B invoicing tool for freelance designers. Is there genuine unmet need or is the market already well served by FreshBooks and Wave?",
  ],
  gaps: [
    "What are users of Notion, Linear, and Asana actually frustrated about that no project management tool has addressed yet?",
    "What do people wish existed in the mental health app space that Headspace, Calm, and Woebot are completely missing?",
    "What features are small agency owners desperate for that no CRM currently offers — based on what they're saying in forums and reviews?",
  ],
  competitor: [
    "What are the biggest complaints users have about Brandwatch, Mention, and SparkToro — and what would make them switch?",
    "What are Shopify merchants saying about its limitations compared to WooCommerce and BigCommerce in the last 12 months?",
    "What do developers hate about Vercel and Netlify's pricing and feature gaps that a new competitor could exploit?",
  ],
  audience: [
    "How do anxious people describe their experience of trying meditation apps — what words and phrases do they actually use?",
    "How do solo founders talk about the frustration of not knowing if their idea is validated — what exact language do they use?",
    "How do small business owners describe the problem of managing client communication across too many tools?",
  ],
  build: [
    "I'm building a market intelligence tool for founders. What should I build first based on what people are asking for right now?",
    "For a mental health app focused on interoceptive training — what feature would have the highest immediate impact based on real user signal?",
    "I'm building a B2B async communication tool. Should I prioritise Slack integration, a mobile app, or AI summarisation first?",
  ],
};

const EXAMPLE_LABELS: Record<string, string> = {
  validate: "Validation examples",
  gaps: "Gap-finding examples",
  competitor: "Competitor intel examples",
  audience: "Language examples",
  build: "Build priority examples",
};

const TIPS = [
  {
    label: "→ Be specific",
    title: "Name your user, not your product",
    body: "Describe who feels the pain, not just what you're building.",
    example: "An app for solo founders who can't afford a market researcher and need to know if their idea is real before spending months building it",
  },
  {
    label: "→ Add competitors",
    title: "Name what people use today",
    body: "Mentioning competitors tells Tethyr where to find complaints and gaps.",
    example: "What are users of Notion, Linear and Asana frustrated about that no productivity tool has solved yet? Looking for genuine gaps.",
  },
  {
    label: "→ Ask the hard question",
    title: "Ask if it's already solved",
    body: "The most valuable report is one that tells you not to build something.",
    example: "Is the problem of founders not knowing if their startup idea is real already solved? What tools exist and what are people saying about them?",
  },
  {
    label: "→ Include context",
    title: "Specify market and stage",
    body: "B2B vs B2C, early adopters vs mainstream — it changes which sources we search.",
    example: "A B2B SaaS tool for small agency owners who struggle to track client feedback across email, Slack, and calls. Looking for what existing tools miss.",
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

  // Character quality state
  const charState = charCount === 0 ? "empty" : charCount < 80 ? "warn" : charCount < 200 ? "good" : "great";

  const contextualNudge = () => {
    if (charCount < 20 || charCount >= 80) return null;
    const hasCompetitor = /compared to|vs |versus |competitor|notion|linear|calm|headspace|shopify|figma|like |instead |alternative/i.test(query);
    if (charCount < 50) {
      return 'Good start. <strong>Add who your user is</strong> — "solo founders", "remote teams", "parents of toddlers" — and Tethyr searches where they actually talk.';
    }
    if (!hasCompetitor) {
      return 'Try adding a competitor. <strong>"What are [Competitor] users frustrated about?"</strong> is one of the most powerful queries you can run.';
    }
    return 'Getting better. <strong>Name a competitor or two</strong> — even saying "unlike Notion" or "instead of a spreadsheet" helps Tethyr find the right complaints.';
  };

  const wrapperClass = variant === "landing" ? "max-w-[680px] mx-auto w-full" : "w-full";

  return (
    <div className={wrapperClass}>
      {/* Layer 1: Intent tabs */}
      {!hasTyped && (
        <div className="flex flex-wrap gap-1.5 mb-3 transition-opacity duration-300">
          {INTENT_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 font-mono text-[9px] tracking-[0.1em] uppercase border rounded-sm cursor-pointer transition-all select-none ${
                activeTab === tab.key
                  ? "bg-ink text-paper border-ink"
                  : "border-ink/[0.22] bg-white/50 text-ink-3 hover:border-ink-3 hover:text-ink hover:bg-white/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Layer 2: Input block (textarea + hint + footer) */}
      <div
        className={`bg-white/65 border border-ink/[0.22] rounded-sm overflow-hidden transition-all duration-200 ${
          isFocused ? "border-ink-3 shadow-[0_2px_24px_rgba(28,25,23,0.1)]" : "shadow-[0_2px_16px_rgba(28,25,23,0.06)]"
        }`}
      >
        {/* Hint bar */}
        <div
          className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ${
            isFocused ? "opacity-100 max-h-[32px] px-4 pt-2.5" : "opacity-0 max-h-0 px-4 pt-0"
          }`}
        >
          <span className="w-[5px] h-[5px] rounded-full bg-amber flex-shrink-0" />
          <span className="font-mono text-[9px] tracking-[0.08em] text-amber uppercase">
            {HINT_TEXT[activeTab]}
          </span>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          className={`w-full bg-transparent border-none outline-none px-[18px] py-3 font-body text-[17px] font-light text-ink resize-none leading-[1.55] placeholder:text-ink-5 placeholder:italic transition-all ${
            isFocused ? "min-h-[110px]" : "min-h-[72px]"
          }`}
          placeholder={PLACEHOLDERS[activeTab]}
          value={query}
          onChange={(e) => updateQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {/* Input footer row */}
        <div className="px-[14px] py-2.5 border-t border-ink/10 flex items-center justify-between gap-3">
          {/* Left: char count + label */}
          <div className="flex items-center gap-[7px] flex-shrink-0">
            <span
              className={`font-mono text-[9px] tracking-[0.06em] transition-colors ${
                charState === "warn" ? "text-red-soft" : charState === "good" || charState === "great" ? "text-green" : "text-ink-5"
              }`}
            >
              {charCount}
            </span>
            {charState !== "empty" && (
              <span
                className={`font-mono text-[8px] tracking-[0.1em] uppercase px-[7px] py-[2px] rounded-sm transition-all ${
                  charState === "warn"
                    ? "bg-red/[0.06] text-red-soft border border-red/[0.15]"
                    : charState === "good"
                    ? "bg-green/[0.07] text-green border border-green/[0.2]"
                    : "bg-green/[0.07] text-green border border-green/[0.2]"
                }`}
              >
                {charState === "warn" ? "More detail needed" : charState === "good" ? "Good" : "Detailed"}
              </span>
            )}
          </div>

          {/* Right: tips toggle + run button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTips(!showTips)}
              className="font-mono text-[9px] tracking-[0.08em] uppercase text-ink-4 hover:text-ink-2 cursor-pointer bg-transparent border-none flex items-center gap-[5px] transition-colors"
            >
              <span className="w-[14px] h-[14px] border border-ink/[0.22] rounded-full flex items-center justify-center text-[8px] text-ink-4 hover:border-ink-3 transition-all">
                {showTips ? "×" : "?"}
              </span>
              <span>{showTips ? "Hide tips" : "How to get a better report"}</span>
            </button>
            <button
              onClick={handleSubmit}
              className={`bg-ink text-paper border-none py-[9px] px-[18px] rounded-sm font-mono text-[9px] tracking-[0.12em] uppercase cursor-pointer flex items-center gap-2 transition-all ${
                isEnabled ? "opacity-100 hover:bg-red" : "opacity-40 pointer-events-none"
              }`}
            >
              <span>{isSearching ? "Searching…" : isComplete ? "New Report" : "Run Report"}</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Layer 5: Tips panel */}
      <div
        className={`overflow-hidden transition-all duration-300 ${
          showTips ? "max-h-[320px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="grid grid-cols-2 gap-2 pt-4 pb-1">
          {TIPS.map((tip, i) => (
            <div key={i} className="bg-white/45 border border-ink/10 rounded-sm p-3">
              <div className="font-mono text-[8px] tracking-[0.12em] uppercase text-red-soft mb-1.5">{tip.label}</div>
              <div className="font-display text-[13px] font-semibold text-ink mb-1">{tip.title}</div>
              <p className="font-body text-[13px] text-ink-3 leading-[1.45] font-light mb-2">{tip.body}</p>
              <div
                onClick={() => fillQuery(tip.example)}
                className="font-body text-[12.5px] italic text-ink-4 border-l-2 border-paper-darker pl-2.5 leading-[1.4] cursor-pointer transition-all hover:border-red-soft hover:text-ink-2"
              >
                <span className="font-mono text-[9px] tracking-[0.06em] text-ink-5 not-italic">e.g. </span>
                {tip.example}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Layer 4: Contextual nudge (20-79 chars) */}
      {contextualNudge() && (
        <div className="mt-2.5 px-[14px] py-[11px] bg-amber/[0.07] border border-amber/[0.15] rounded-sm flex items-start gap-2.5 transition-all">
          <span className="font-mono text-[10px] text-amber flex-shrink-0 mt-[1px]">→</span>
          <span
            className="font-body text-[14px] text-ink-3 leading-[1.5] font-light [&_strong]:text-ink-2 [&_strong]:font-medium"
            dangerouslySetInnerHTML={{ __html: contextualNudge()! }}
          />
        </div>
      )}

      {/* Query ready state (80+ chars) */}
      {charCount >= 80 && !contextualNudge() && (
        <div className="mt-2.5 flex items-center gap-2.5 transition-opacity">
          <span className="w-[6px] h-[6px] rounded-full bg-green animate-badge-pulse" />
          <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-green">
            Good query — Tethyr will select the best sources for this
          </span>
        </div>
      )}

      {/* Layer 6: Contextual examples (before typing) */}
      {!hasTyped && (
        <div className="mt-2.5 transition-opacity duration-300">
          <div className="font-mono text-[8.5px] tracking-[0.12em] uppercase text-ink-5 mb-[7px]">
            {EXAMPLE_LABELS[activeTab] || "Try one of these"}
          </div>
          <div className="flex flex-col gap-1">
            {EXAMPLES[activeTab]?.map((example, i) => (
              <div
                key={i}
                onClick={() => fillQuery(example)}
                className="group flex items-baseline gap-2.5 px-3 py-2 border-l-2 border-paper-darker hover:border-red-soft hover:bg-white/40 cursor-pointer transition-all rounded-r-sm"
              >
                <span className="font-body text-[14px] italic text-ink-3 leading-[1.4] flex-1">
                  {example}
                </span>
                <span className="font-mono text-[8px] tracking-[0.1em] uppercase text-red-soft flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  Use this ↑
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom note (landing variant only) */}
      {variant === "landing" && !hasTyped && (
        <div className="mt-3 flex items-center justify-center gap-4 font-mono text-[8.5px] tracking-[0.08em] text-ink-5">
          <span>No account needed</span>
          <span className="w-px h-[10px] bg-ink/10" />
          <span>First report free</span>
          <span className="w-px h-[10px] bg-ink/10" />
          <span>60–90 seconds</span>
        </div>
      )}
    </div>
  );
};

export default SearchInput;
