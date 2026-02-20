import { useState, useEffect, useRef } from "react";
import SearchInput from "@/components/SearchInput";
import { getSourcesByCategory, SOURCE_CATEGORIES, type SourceCategory } from "@/constants/sources";
import type { AppState } from "@/types/report";

interface LandingPageProps {
  onRunReport: (query: string, intents: string[]) => void;
  isSearching: boolean;
  appState: AppState;
}

// IntersectionObserver hook for fade-up
function useFadeUp() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, className: `transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}` };
}

// ── Section rule component ──
const SectionRule = ({ num, title, light = false }: { num: string; title: string; light?: boolean }) => (
  <div className="flex items-center gap-3 md:gap-4 mb-8 md:mb-[60px]">
    <span className={`font-mono text-[9px] tracking-[0.18em] uppercase flex-shrink-0 ${light ? "text-paper/30" : "text-ink-4"}`}>
      {num}
    </span>
    <div className={`flex-1 h-px ${light ? "bg-paper/10" : "bg-ink/[0.22]"}`} />
    <span className={`font-mono text-[8px] md:text-[9px] tracking-[0.18em] uppercase flex-shrink-0 ${light ? "text-paper/30" : "text-ink-4"}`}>
      {title}
    </span>
  </div>
);

const CLAIMS = [
  { label: "→ Live Data", title: "Real-time, not historical", body: "Competitors like Brandwatch use cached API data. Tethyr deploys live browser agents that read the internet as it exists right now — not last month's snapshot." },
  { label: "→ Evidence", title: "Every claim sourced and linked", body: "No insight without a receipt. Every finding in your report links back to the exact post, review, or thread that produced it. Click through and verify anything." },
  { label: "→ Honest", title: "Will tell you not to build it", body: "If the problem is already well solved, your verdict comes back INVALIDATED. No AI hedging. No false encouragement. The most valuable thing we can tell you is the truth." },
  { label: "→ Routing", title: "Searches where your audience lives", body: "A consumer health query routes to patient communities and YouTube. A developer tool query routes to Stack Overflow and HackerNews. Source selection is intelligent, not generic." },
  { label: "→ Language", title: "Your audience's exact words", body: "The Audience Language section gives you the exact phrases real humans use to describe your problem — ready to paste into your landing page, pitch deck, or App Store description." },
  { label: "→ Price", title: "Built for founders, not enterprises", body: "Brandwatch costs $1,000+/month. Tethyr starts at $29. Enterprise-grade intelligence at a price that makes sense when you're pre-revenue and every decision matters." },
];

const REPORT_SECTIONS = [
  { num: "01", title: "Problem Validation", desc: "A clear verdict — CONFIRMED, PARTIAL, UNCLEAR, or INVALIDATED — with supporting quotes from real humans, each linked to its source.", tier: "free" },
  { num: "02", title: "Feature Gaps", desc: "What people actually want ranked by how often it appears across discussions — with status: Unbuilt, Partial, or Already exists.", tier: "free" },
  { num: "03", title: "Competitor Weaknesses", desc: "What users hate about existing solutions, in their own words. Your opening against each competitor, grounded in evidence not opinion.", tier: "free" },
  { num: "04", title: "Audience Language", desc: "The exact phrases your target users use to describe this problem. Paste them directly into your landing page or pitch deck.", tier: "founder" },
  { num: "05", title: "Build Recommendations", desc: "Three things to build, ranked by evidence strength. Each recommendation traces back to specific discussion counts — never generic startup advice.", tier: "founder" },
  { num: "+", title: "Daily Digest", desc: "For teams — automated morning intelligence on your market, competitors, and audience. Delivered to your dashboard and Slack every day.", tier: "team" },
];

const PRICING = [
  {
    name: "Free", price: "$0", period: "forever · no card needed", dark: false,
    features: ["One complete report", "All 3 free sections unlocked", "Source links included", "No account required"],
    cta: "Run free report →",
  },
  {
    name: "Founder", price: "$29", period: "per month", dark: true,
    features: ["Unlimited reports", "All 5 sections unlocked", "Report history saved", "PDF export", "Priority source coverage"],
    cta: "Start founder plan →",
  },
  {
    name: "Team", price: "$99", period: "per month", dark: false,
    features: ["Everything in Founder", "Daily morning digest", "Up to 5 seats", "Slack integration", "Workspace dashboard"],
    cta: "Start team plan →",
  },
  {
    name: "Studio", price: "$299", period: "per month", dark: false,
    features: ["Everything in Team", "Unlimited seats", "Custom source config", "White-label PDF reports", "API access"],
    cta: "Contact us →",
  },
];

const HOW_STEPS = [
  { num: "1", label: "Classify", title: "Tethyr reads your query", body: "Gemini classifies your query — market type, audience, problem maturity — and selects the exact sources most likely to contain real signal for your specific context." },
  { num: "2", label: "Search", title: "Live web agents search 25+ sources", body: "TinyFish browser agents fan out across selected platforms simultaneously — reading threads, extracting reviews, pulling comments — in real time, not from a cached database." },
  { num: "3", label: "Filter", title: "Signal separated from noise", body: "A quality filter strips spam, bots, and off-topic content. Every item that passes is scored by relevance, recency, and emotional signal strength before synthesis begins." },
  { num: "4", label: "Report", title: "Structured intelligence, not a summary", body: "Five sections. Every claim sourced and linked. Problem validation with a clear verdict. Feature gaps ranked by frequency. Competitor weaknesses in users' own words." },
];

const LandingPage = ({ onRunReport, isSearching, appState }: LandingPageProps) => {
  const [scrolled, setScrolled] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<SourceCategory | null>("discussion");

  useEffect(() => {
    const el = document.getElementById("landing-scroll-container");
    if (!el) return;
    const handleScroll = () => setScrolled(el.scrollTop > 40);
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const sourcesByCategory = getSourcesByCategory();

  const s2 = useFadeUp();
  const s3 = useFadeUp();
  const s4 = useFadeUp();
  const s5 = useFadeUp();
  const s6 = useFadeUp();
  const s7 = useFadeUp();
  const s8 = useFadeUp();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div id="landing-scroll-container" className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-paper z-[100]" style={{ scrollbarWidth: "thin" }}>
      {/* Sticky nav */}
      <nav
        className={`fixed top-0 left-0 right-0 z-[200] flex items-center justify-between px-4 md:px-12 py-3 md:py-5 transition-all duration-300 ${
          scrolled ? "bg-paper/[0.92] backdrop-blur-md border-b border-ink/10" : "border-b border-transparent"
        }`}
      >
        <div className="font-display text-[18px] md:text-[20px] font-bold tracking-tight text-ink" style={{ letterSpacing: "-0.025em" }}>
          Teth<span className="text-red">y</span>r
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {/* Hide nav links on mobile */}
          <button onClick={() => scrollTo("how-it-works")} className="hidden md:block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 hover:text-ink cursor-pointer bg-transparent border-none transition-colors">
            How it works
          </button>
          <button onClick={() => scrollTo("sources")} className="hidden md:block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 hover:text-ink cursor-pointer bg-transparent border-none transition-colors">
            Sources
          </button>
          <button onClick={() => scrollTo("pricing")} className="hidden md:block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 hover:text-ink cursor-pointer bg-transparent border-none transition-colors">
            Pricing
          </button>
          <button
            onClick={() => scrollTo("hero-input")}
            className="bg-ink text-paper px-3 md:px-[18px] py-2 md:py-[9px] rounded-sm font-mono text-[9px] md:text-[10px] tracking-[0.1em] uppercase border-none cursor-pointer hover:bg-red transition-colors"
          >
            Start free →
          </button>
        </div>
      </nav>

      {/* Section 1: Hero */}
      <section className="relative flex flex-col items-center min-h-screen px-5 md:px-12 pt-[80px] md:pt-[100px] pb-6 md:pb-8 z-[1] overflow-hidden">
        {/* Background TRUTH text */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none" aria-hidden="true">
          <span className="font-display font-bold text-ink/[0.03] whitespace-nowrap" style={{ fontSize: "clamp(80px, 20vw, 260px)", letterSpacing: "-0.04em" }}>
            TRUTH
          </span>
        </div>

        {/* Spacer to push content to center */}
        <div className="flex-1" />

        <div className="relative z-10 text-center max-w-[900px] mx-auto">
          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-2 md:gap-3 mb-4 md:mb-6">
            <div className="w-6 md:w-10 h-px bg-ink/[0.22]" />
            <span className="font-mono text-[8px] md:text-[9px] tracking-[0.2em] uppercase text-ink-4">
              Real Signal · Not AI Opinion
            </span>
            <div className="w-6 md:w-10 h-px bg-ink/[0.22]" />
          </div>

          {/* Headline */}
          <h1 className="font-display font-normal leading-[1.1] mb-2 md:mb-3" style={{ fontSize: "clamp(32px, 8vw, 80px)", letterSpacing: "-0.025em" }}>
            Stop building what <em className="italic text-red">AI thinks</em>
            <br className="hidden md:block" />
            {" "}people need.
          </h1>
          <p className="font-display italic leading-[1.15] text-ink-3 mb-5 md:mb-7" style={{ fontSize: "clamp(28px, 7vw, 72px)", letterSpacing: "-0.025em" }}>
            Start building what they actually say.
          </p>

          {/* Subtitle */}
          <p className="font-body text-[15px] md:text-[18px] text-ink-3 leading-[1.65] md:leading-[1.7] font-light max-w-[520px] mx-auto mb-8 md:mb-12">
            Tethyr searches Reddit, App Store reviews, academic research,
            patient communities, job postings, and 25+ more sources to give
            you a structured intelligence report grounded in real human signal
            — not AI inference.
          </p>

          {/* Search input */}
          <div id="hero-input">
            <SearchInput
              variant="landing"
              onRunReport={onRunReport}
              isSearching={isSearching}
              appState={appState}
            />
          </div>
        </div>

        {/* Spacer — larger portion of gap above hint */}
        <div className="flex-[3]" />

        {/* Scroll hint */}
        <div className="flex flex-col items-center gap-1.5 opacity-50 animate-scroll-bounce">
          <span className="font-mono text-[8px] tracking-[0.14em] uppercase text-ink-4">Scroll to learn more</span>
          <div className="w-px h-4 md:h-6 bg-ink-4" />
        </div>

        {/* Smaller bottom spacer */}
        <div className="flex-[2]" />
      </section>

      {/* Section 2: The Problem */}
      <section ref={s2.ref} className={`py-[60px] md:py-[100px] px-5 md:px-12 max-w-[1100px] mx-auto relative z-[1] ${s2.className}`}>
        <SectionRule num="01" title="The Problem" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-[60px] items-start">
          <div>
            <h2 className="font-display font-normal leading-[1.2] mb-4 md:mb-6" style={{ fontSize: "clamp(26px, 3.5vw, 48px)", letterSpacing: "-0.02em" }}>
              Every AI tool tells you your idea is <em className="italic text-red">great.</em>
            </h2>
            <p className="font-body text-[15px] md:text-[17px] text-ink-3 leading-[1.7] md:leading-[1.75] font-light mb-4 md:mb-5">
              ChatGPT, Claude, Gemini — they pattern-match against
              every startup they've ever seen and produce confident,
              optimistic, indistinguishable advice. Founders are
              building the same products for the same assumed problems
              without ever touching actual human signal.
            </p>
            <p className="font-body text-[15px] md:text-[17px] text-ink-3 leading-[1.7] md:leading-[1.75] font-light">
              The honest truth about your idea isn't in an AI's
              training data. It's in a Reddit thread at 2am.
              It's in a one-star App Store review. It's in a
              HackerNews comment that got 47 upvotes and then
              disappeared. Tethyr finds it.
            </p>
          </div>
          <div className="border border-ink/[0.22]">
            {[
              { stat: "73%", label: "of founders say they built the wrong thing first because they validated with AI tools or friends instead of real market signal" },
              { stat: "8mo", label: "average time wasted building a product before discovering the core assumption was wrong" },
              { stat: "0", label: "existing tools combine live web scraping with structured product intelligence for founders at an accessible price" },
            ].map((item, i) => (
              <div key={i} className={`px-5 md:px-7 py-5 md:py-6 ${i < 2 ? "border-b border-ink/10" : ""}`}>
                <div className="font-display text-[32px] md:text-[42px] font-bold text-red leading-none mb-1.5">{item.stat}</div>
                <div className="font-body text-[13px] md:text-[15px] text-ink-3 font-light leading-[1.4]">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: How It Works */}
      <section id="how-it-works" ref={s3.ref} className={`py-[60px] md:py-[100px] px-5 md:px-12 bg-ink relative z-[1] overflow-hidden ${s3.className}`}>
        <div className="max-w-[1100px] mx-auto">
          <SectionRule num="02" title="How It Works" light />
          <h2 className="font-display font-normal leading-[1.2] text-paper mb-8 md:mb-[60px] max-w-[600px]" style={{ fontSize: "clamp(26px, 3.5vw, 48px)", letterSpacing: "-0.02em" }}>
            Four stages. <em className="italic" style={{ color: "rgba(201,168,76,0.9)" }}>One report.</em>
            <br />Built from what real humans say.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-paper/10">
            {HOW_STEPS.map((step, i) => (
              <div key={i} className={`px-5 md:px-7 py-6 md:py-8 relative ${i < 3 ? "md:border-r border-b md:border-b-0 border-paper/10" : ""}`}>
                <div className="font-display text-[40px] md:text-[56px] font-bold text-paper/[0.06] leading-none mb-3 md:mb-4">{step.num}</div>
                <div className="font-mono text-[9px] tracking-[0.14em] uppercase mb-2 md:mb-3" style={{ color: "rgba(201,168,76,0.8)" }}>→ {step.label}</div>
                <div className="font-display text-[16px] md:text-[18px] font-semibold text-paper mb-2 leading-[1.3]">{step.title}</div>
                <p className="font-body text-[13px] md:text-[14px] text-paper/50 leading-[1.6] font-light">{step.body}</p>
                {/* Connector arrow */}
                {i < 3 && (
                  <span className="absolute right-[-12px] top-8 font-mono text-[14px] text-paper/[0.15] z-[2] hidden md:block">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Sources */}
      <section id="sources" ref={s4.ref} className={`py-[60px] md:py-[100px] px-5 md:px-12 max-w-[1100px] mx-auto relative z-[1] ${s4.className}`}>
        <SectionRule num="03" title="Sources" />
        <h2 className="font-display font-normal leading-[1.2] mb-3 max-w-[600px]" style={{ fontSize: "clamp(24px, 3vw, 40px)", letterSpacing: "-0.02em" }}>
          We search where people are <em className="italic text-red">actually honest.</em>
        </h2>
        <p className="font-body text-[14px] md:text-[16px] text-ink-3 leading-[1.65] font-light max-w-[520px] mb-8 md:mb-12">
          Not just Reddit and Twitter. Tethyr selects from 25+ source
          categories based on your query type — routing a health app
          query to patient communities and academic research, a B2B
          tool query to G2 and HackerNews, a consumer product to
          App Store reviews and YouTube comments.
        </p>

        <div className="border border-ink/[0.22]">
          {(Object.keys(sourcesByCategory) as SourceCategory[]).map((cat) => {
            const sources = sourcesByCategory[cat];
            if (!sources || sources.length === 0) return null;
            const isOpen = expandedCategory === cat;
            return (
              <div key={cat} className="border-b border-ink/10 last:border-b-0">
                <button
                  onClick={() => setExpandedCategory(isOpen ? null : cat)}
                  className="w-full flex items-center justify-between px-4 md:px-6 py-3 md:py-4 cursor-pointer bg-transparent border-none text-left transition-colors hover:bg-white/40 select-none"
                >
                  <div className="flex items-center gap-2 md:gap-[14px] min-w-0">
                    <span className="font-mono text-[7px] md:text-[8px] tracking-[0.12em] uppercase text-red bg-red/[0.06] border border-red/[0.15] px-1.5 md:px-2 py-[2px] md:py-[3px] rounded-sm flex-shrink-0">
                      {cat.replace(/_/g, " ")}
                    </span>
                    <span className="font-display text-[14px] md:text-[16px] font-semibold text-ink truncate">{SOURCE_CATEGORIES[cat]}</span>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                    <span className="font-mono text-[8px] md:text-[9px] text-ink-4 tracking-[0.08em]">{sources.length}</span>
                    <span className={`font-mono text-[12px] text-ink-4 transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}>+</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 md:px-6 pb-4 md:pb-5 flex flex-wrap gap-1.5 md:gap-2">
                    {sources.map((s) => (
                      <span
                        key={s.key}
                        className="font-mono text-[8px] md:text-[9px] tracking-[0.06em] text-ink-3 border border-ink/10 rounded-sm px-2 md:px-2.5 py-[4px] md:py-[5px] bg-white/40 transition-all hover:border-ink-3 hover:text-ink hover:bg-white/80"
                      >
                        {s.display_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 md:mt-5 font-mono text-[8px] md:text-[9px] text-ink-4 tracking-[0.08em] leading-[1.7] border-l-2 border-paper-darker pl-3 md:pl-[14px]">
          Sources are selected dynamically based on your query type — not every source is searched every time.<br />
          A mental health app query routes to patient communities and academic research.<br />
          A B2B SaaS query routes to G2, HackerNews, and Indie Hackers.
        </div>
      </section>

      {/* Section 5: What Makes Tethyr Different */}
      <section ref={s5.ref} className={`py-[60px] md:py-[100px] px-5 md:px-12 bg-paper-dark border-t border-b border-ink/[0.22] relative z-[1] ${s5.className}`}>
        <div className="max-w-[1100px] mx-auto">
          <SectionRule num="04" title="What Makes Tethyr Different" />
          <h2 className="font-display font-normal leading-[1.2] mb-8 md:mb-12 max-w-[600px]" style={{ fontSize: "clamp(24px, 3vw, 40px)", letterSpacing: "-0.02em" }}>
            Built for the question every founder is <em className="italic text-red">afraid to ask.</em>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-ink/[0.22]">
            {CLAIMS.map((claim, i) => (
              <div
                key={i}
                className={`px-5 md:px-7 py-6 md:py-8 ${
                  i % 3 !== 2 ? "md:border-r border-ink/[0.22]" : ""
                } ${i < CLAIMS.length - 1 ? "border-b md:border-b-0 border-ink/[0.22]" : ""} ${i < 3 ? "md:border-b md:border-ink/[0.22]" : ""}`}
              >
                <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-red mb-2 md:mb-3">{claim.label}</div>
                <div className="font-display text-[16px] md:text-[18px] font-semibold text-ink mb-2 leading-[1.3]">{claim.title}</div>
                <p className="font-body text-[13px] md:text-[14.5px] text-ink-3 leading-[1.6] md:leading-[1.65] font-light">{claim.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6: What's In Your Report */}
      <section ref={s6.ref} className={`py-[60px] md:py-[100px] px-5 md:px-12 max-w-[1100px] mx-auto relative z-[1] ${s6.className}`}>
        <SectionRule num="05" title="What's In Your Report" />
        <h2 className="font-display font-normal leading-[1.2] mb-3" style={{ fontSize: "clamp(24px, 3vw, 40px)", letterSpacing: "-0.02em" }}>
          Five sections. Every claim <em className="italic text-red">evidenced.</em>
        </h2>
        <p className="font-body text-[14px] md:text-[16px] text-ink-3 leading-[1.65] font-light max-w-[480px] mb-8 md:mb-12">
          Not a dashboard. Not a chart. A structured intelligence document
          written from real human signal, formatted like a research brief.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-ink/[0.22]">
          {REPORT_SECTIONS.map((sec, i) => (
            <div
              key={sec.num}
              className={`grid grid-cols-[40px_1fr] md:grid-cols-[48px_1fr] transition-colors hover:bg-white/50 ${
                i < REPORT_SECTIONS.length - 1 ? "border-b border-ink/10" : ""
              } ${i % 2 === 0 ? "md:border-r border-ink/[0.22]" : ""}`}
            >
              <div className="px-0 py-4 md:py-5 pl-3 md:pl-5 font-mono text-[9px] text-red tracking-[0.12em] border-r border-ink/10">
                {sec.num}
              </div>
              <div className="px-4 md:px-5 py-3 md:py-[18px]">
                <div className="font-display text-[14px] md:text-[16px] font-semibold text-ink mb-[4px] md:mb-[5px]">{sec.title}</div>
                <p className="font-body text-[12px] md:text-[13.5px] text-ink-3 leading-[1.5] font-light">{sec.desc}</p>
                <span
                  className={`inline-block mt-1.5 font-mono text-[7px] md:text-[8px] tracking-[0.1em] uppercase px-[6px] md:px-[7px] py-[2px] rounded-sm ${
                    sec.tier === "free"
                      ? "bg-green/[0.07] text-green border border-green/[0.2]"
                      : "bg-red/[0.06] text-red-soft border border-red/[0.15]"
                  }`}
                >
                  {sec.tier === "free" ? "Free tier" : sec.tier === "founder" ? "Founder+ only" : "Team plan only"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 7: Pricing */}
      <section id="pricing" ref={s7.ref} className={`py-[60px] md:py-[100px] px-5 md:px-12 bg-paper-dark border-t border-ink/[0.22] relative z-[1] ${s7.className}`}>
        <div className="max-w-[1100px] mx-auto">
          <SectionRule num="06" title="Pricing" />
          <h2 className="font-display font-normal leading-[1.2] mb-8 md:mb-12" style={{ fontSize: "clamp(24px, 3vw, 40px)", letterSpacing: "-0.02em" }}>
            Start free. <em className="italic text-red">Pay when it's proven.</em>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-ink/[0.22]">
            {PRICING.map((plan, i) => (
              <div
                key={plan.name}
                className={`px-4 md:px-6 py-5 md:py-7 ${i % 2 === 0 ? "border-r border-ink/[0.22]" : ""} ${i < 2 ? "border-b md:border-b-0 border-ink/[0.22]" : ""} ${i < 3 ? "md:border-r border-ink/[0.22]" : ""} ${
                  plan.dark ? "bg-ink" : ""
                }`}
              >
                <div className={`font-mono text-[8px] md:text-[9px] tracking-[0.14em] uppercase mb-3 md:mb-4 ${plan.dark ? "text-paper/40" : "text-ink-4"}`}>
                  {plan.name}
                </div>
                <div className={`font-display text-[24px] md:text-[36px] font-bold leading-none mb-1 ${plan.dark ? "text-paper/95" : "text-ink"}`}>
                  {plan.price}
                </div>
                <div className={`font-mono text-[7px] md:text-[9px] tracking-[0.06em] mb-4 md:mb-5 ${plan.dark ? "text-paper/35" : "text-ink-4"}`}>
                  {plan.period}
                </div>
                <div className={`h-px mb-4 md:mb-5 ${plan.dark ? "bg-paper/10" : "bg-ink/10"}`} />
                <div className="flex flex-col gap-1.5 md:gap-2 mb-4 md:mb-6">
                  {plan.features.map((f, j) => (
                    <div key={j} className={`font-body text-[11px] md:text-[13.5px] leading-[1.4] flex items-start gap-1.5 md:gap-2 ${plan.dark ? "text-paper/60" : "text-ink-3"}`}>
                      <span className={`font-mono text-[9px] md:text-[10px] flex-shrink-0 mt-[1px] md:mt-[2px] ${plan.dark ? "text-amber/70" : "text-red-soft"}`}>→</span>
                      {f}
                    </div>
                  ))}
                </div>
                <button
                  className={`w-full py-2 md:py-2.5 rounded-sm font-mono text-[8px] md:text-[9px] tracking-[0.12em] uppercase cursor-pointer transition-all ${
                    plan.dark
                      ? "bg-amber/[0.15] border border-amber/30 text-paper/80 hover:bg-amber/25"
                      : "bg-transparent border border-ink/[0.22] text-ink-3 hover:border-ink hover:text-ink"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 8: Final CTA */}
      <section ref={s8.ref} className={`py-[60px] md:py-[120px] px-5 md:px-12 text-center border-t-2 border-ink relative z-[1] ${s8.className}`}>
        <div className="max-w-[700px] mx-auto">
          <div className="font-mono text-[8px] md:text-[9px] tracking-[0.2em] uppercase text-ink-4 mb-4 md:mb-6">
            Start now · No account needed
          </div>
          <h2 className="font-display font-normal leading-[1.15] mb-4 md:mb-5" style={{ fontSize: "clamp(28px, 5vw, 64px)", letterSpacing: "-0.025em" }}>
            Your idea deserves an <em className="italic text-red">honest answer.</em>
          </h2>
          <p className="font-body text-[15px] md:text-[17px] text-ink-3 leading-[1.65] md:leading-[1.7] font-light max-w-[440px] mx-auto mb-8 md:mb-10">
            Type what you're building. We'll search the internet and tell
            you what real humans actually need — not what AI thinks they need.
          </p>
          <SearchInput
            variant="landing"
            onRunReport={onRunReport}
            isSearching={isSearching}
            appState={appState}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink/[0.22] px-5 md:px-12 py-5 md:py-6 flex flex-col md:flex-row items-center justify-between gap-2 relative z-[1]">
        <div className="font-display text-[16px] font-bold text-ink">
          Teth<span className="text-red">y</span>r
        </div>
        <div className="font-mono text-[8px] md:text-[9px] text-ink-4 tracking-[0.08em]">
          Real signal. Not AI opinion. © 2026 Tethyr
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
