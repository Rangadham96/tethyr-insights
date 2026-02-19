import { useState, useEffect, useRef } from "react";
import SearchInput from "@/components/SearchInput";
import { SOURCE_REGISTRY, getSourcesByCategory, SOURCE_CATEGORIES, type SourceCategory } from "@/constants/sources";
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
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, className: `transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}` };
}

const CLAIMS = [
  { label: "Real-time", title: "Real-time, not historical", body: "Tethyr searches live platforms right now — not cached data from six months ago. Every report is fresh." },
  { label: "Sourced", title: "Every claim sourced and linked", body: "Every quote, stat, and insight links back to the original post, review, or comment. Nothing is fabricated." },
  { label: "Honest", title: "Will tell you not to build it", body: "If the problem is already solved, Tethyr says so. Most tools tell you what you want to hear — we tell you what's true." },
  { label: "Targeted", title: "Searches where your audience lives", body: "A health query searches patient forums. A B2B query searches G2 and HackerNews. Sources are selected per query." },
  { label: "Language", title: "Your audience's exact words", body: "See the actual phrases, complaints, and wishes your users use. Build your copy from real language, not guesswork." },
  { label: "Founders", title: "Built for founders, not enterprises", body: "No 14-day onboarding. No team of analysts required. One query, one report, real signal in 90 seconds." },
];

const REPORT_SECTIONS = [
  { num: "01", title: "Problem Validation", desc: "Real quotes from real people describing the problem you're solving. Sourced and linked.", tier: "free" },
  { num: "02", title: "Feature Gaps", desc: "What's missing from existing solutions, ranked by how often users mention it.", tier: "free" },
  { num: "03", title: "Competitor Weaknesses", desc: "Pros, cons, and opportunities from competitor reviews and discussions.", tier: "free" },
  { num: "04", title: "Audience Language", desc: "The exact words and phrases your target audience uses to describe their problems.", tier: "founder" },
  { num: "05", title: "Build Recommendations", desc: "What to build first based on signal strength, gap severity, and competitor vulnerability.", tier: "founder" },
  { num: "06", title: "Daily Digest", desc: "A daily intelligence briefing for your configured company — delivered every morning.", tier: "team" },
];

const PRICING = [
  {
    name: "Free", price: "$0", period: "forever", dark: false,
    features: ["1 complete report", "Sections 01–03 unlocked", "No account needed", "No credit card"],
    cta: "Start free",
  },
  {
    name: "Founder", price: "$29", period: "/month", dark: true,
    features: ["Unlimited reports", "All sections unlocked", "Report history", "PDF export"],
    cta: "Start trial",
  },
  {
    name: "Team", price: "$99", period: "/month", dark: false,
    features: ["Everything in Founder", "Daily digest dashboard", "Up to 5 seats", "Slack integration"],
    cta: "Start trial",
  },
  {
    name: "Studio", price: "$299", period: "/month", dark: false,
    features: ["Everything in Team", "Unlimited seats", "Custom source config", "API access"],
    cta: "Contact us",
  },
];

const HOW_STEPS = [
  { num: "01", label: "Classify", title: "Understand your query", body: "Tethyr reads your query, identifies the market type, audience, and problem maturity — then selects the best sources to search." },
  { num: "02", label: "Search", title: "Search 29 platforms live", body: "Reddit, App Stores, YouTube, G2, patient forums, job boards — searched in real time based on your specific query." },
  { num: "03", label: "Filter", title: "Extract real signal", body: "Thousands of posts filtered to dozens of relevant quotes, complaints, feature requests, and competitor insights." },
  { num: "04", label: "Report", title: "Deliver your verdict", body: "A structured intelligence report with evidence for every claim. Confirmed, partial, unclear, or invalidated." },
];

const LandingPage = ({ onRunReport, isSearching, appState }: LandingPageProps) => {
  const [scrolled, setScrolled] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<SourceCategory | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const sourcesByCategory = getSourcesByCategory();

  // Section refs for fade-up
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
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-paper z-[100]" style={{ scrollbarWidth: "thin" }}>
      {/* Sticky nav */}
      <nav
        className={`fixed top-0 left-0 right-0 z-[200] h-[52px] flex items-center justify-between px-8 transition-all duration-300 ${
          scrolled ? "bg-paper/90 backdrop-blur-md border-b border-ink/10" : "bg-transparent"
        }`}
      >
        <div className="font-display text-[18px] font-bold tracking-tight text-ink">
          Teth<span className="text-red">y</span>r
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => scrollTo("how-it-works")} className="font-mono text-[9px] tracking-[0.1em] uppercase text-ink-3 hover:text-ink cursor-pointer bg-transparent border-none transition-colors">
            How it works
          </button>
          <button onClick={() => scrollTo("sources")} className="font-mono text-[9px] tracking-[0.1em] uppercase text-ink-3 hover:text-ink cursor-pointer bg-transparent border-none transition-colors">
            Sources
          </button>
          <button onClick={() => scrollTo("pricing")} className="font-mono text-[9px] tracking-[0.1em] uppercase text-ink-3 hover:text-ink cursor-pointer bg-transparent border-none transition-colors">
            Pricing
          </button>
        </div>
        <button
          onClick={() => scrollTo("hero-input")}
          className="bg-ink text-paper px-4 py-2 font-mono text-[9px] tracking-[0.12em] uppercase border-none cursor-pointer hover:bg-red transition-colors"
        >
          Start free
        </button>
      </nav>

      {/* Section 1: Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-[52px]">
        {/* Background TRUTH text */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
          aria-hidden="true"
        >
          <span className="font-display text-[200px] font-bold text-ink opacity-[0.03] tracking-tight">
            TRUTH
          </span>
        </div>

        <div className="relative z-10 text-center max-w-[720px] mx-auto">
          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-px w-8 bg-ink/[0.15]" />
            <span className="font-mono text-[8px] tracking-[0.2em] uppercase text-ink-4">
              Real Signal · Not AI Opinion
            </span>
            <div className="h-px w-8 bg-ink/[0.15]" />
          </div>

          {/* Headline */}
          <h1 className="font-display text-[42px] md:text-[54px] font-bold text-ink leading-[1.1] mb-2">
            Stop building what AI
            <br />
            thinks people need.
          </h1>
          <p className="font-display text-[24px] md:text-[30px] italic text-ink-4 leading-[1.3] mb-6">
            Start building what they actually say.
          </p>

          {/* Subtitle */}
          <p className="font-body text-[17px] text-ink-3 leading-[1.6] font-light max-w-[540px] mx-auto mb-10">
            Tethyr searches Reddit, App Stores, YouTube, patient communities, and 25+ other platforms in real time —
            then delivers a structured intelligence report with evidence for every claim.
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

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="font-mono text-[8px] text-ink-4 tracking-[0.1em] uppercase">Scroll to learn more</span>
          <span className="text-ink-4 animate-scroll-bounce inline-block">↓</span>
        </div>
      </section>

      {/* Section 2: The Problem */}
      <section ref={s2.ref} className={`py-20 px-8 max-w-[1100px] mx-auto ${s2.className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="font-display text-[30px] text-ink leading-[1.2] mb-5">
              Every AI tool tells you your idea is{" "}
              <span className="italic text-red">great.</span>
            </h2>
            <p className="font-body text-[16px] text-ink-3 leading-[1.65] font-light mb-4">
              ChatGPT will validate anything. Market research firms charge $10k for a PDF nobody reads.
              Your advisor's opinion is anecdotal. None of these tell you what real users actually say
              when they think nobody's listening.
            </p>
            <p className="font-body text-[16px] text-ink-3 leading-[1.65] font-light">
              The internet is full of honest signal — Reddit threads, App Store reviews, patient forums,
              YouTube comments. The problem isn't access — it's extraction. That's what Tethyr does.
            </p>
          </div>
          <div className="border border-ink/[0.15] rounded-sm overflow-hidden">
            {[
              { stat: "73%", label: "of startups fail because they build something nobody needs" },
              { stat: "8mo", label: "average time wasted before founders discover the problem" },
              { stat: "0", label: "AI chatbots that will tell you your idea is bad" },
            ].map((item, i) => (
              <div key={i} className={`px-6 py-5 ${i < 2 ? "border-b border-ink/10" : ""}`}>
                <div className="font-display text-[36px] text-red leading-none mb-1">{item.stat}</div>
                <div className="font-body text-[13px] text-ink-3 font-light">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: How It Works */}
      <section id="how-it-works" ref={s3.ref} className={`py-20 px-8 bg-ink ${s3.className}`}>
        <div className="max-w-[1100px] mx-auto">
          <h2 className="font-display text-[28px] text-paper leading-[1.25] mb-3 text-center">
            Four stages. One report.
          </h2>
          <p className="font-body text-[16px] text-paper/60 text-center font-light mb-12">
            Built from what real humans say.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-0">
            {HOW_STEPS.map((step, i) => (
              <div key={i} className={`px-5 py-6 ${i < 3 ? "md:border-r border-paper/10" : ""}`}>
                <div className="font-display text-[48px] text-paper/[0.06] leading-none mb-3">{step.num}</div>
                <div className="font-mono text-[8px] tracking-[0.14em] uppercase text-amber mb-2">→ {step.label}</div>
                <div className="font-display text-[16px] text-paper mb-2">{step.title}</div>
                <p className="font-body text-[13px] text-paper/50 leading-[1.55] font-light">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Sources */}
      <section id="sources" ref={s4.ref} className={`py-20 px-8 max-w-[1100px] mx-auto ${s4.className}`}>
        <h2 className="font-display text-[28px] text-ink leading-[1.25] mb-2 text-center">
          29 platforms. Searched in real time.
        </h2>
        <p className="font-body text-[16px] text-ink-3 text-center font-light mb-10">
          Tethyr selects the best sources for each query — not every platform every time.
        </p>

        <div className="border border-ink/[0.15] rounded-sm overflow-hidden">
          {(Object.keys(sourcesByCategory) as SourceCategory[]).map((cat) => {
            const sources = sourcesByCategory[cat];
            if (!sources || sources.length === 0) return null;
            const isOpen = expandedCategory === cat;
            return (
              <div key={cat} className={`border-b border-ink/10 last:border-b-0`}>
                <button
                  onClick={() => setExpandedCategory(isOpen ? null : cat)}
                  className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer bg-transparent border-none text-left transition-colors hover:bg-white/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[8px] tracking-[0.1em] uppercase text-red">{cat.replace(/_/g, " ")}</span>
                    <span className="font-display text-[15px] text-ink">{SOURCE_CATEGORIES[cat]}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[9px] text-ink-4">{sources.length}</span>
                    <span className="font-mono text-[14px] text-ink-4">{isOpen ? "−" : "+"}</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 flex flex-wrap gap-1.5">
                    {sources.map((s) => (
                      <span
                        key={s.key}
                        className="font-mono text-[9px] tracking-[0.04em] text-ink-3 border border-ink/10 rounded-sm px-2.5 py-1.5 bg-white/40"
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

        <p className="font-mono text-[9px] text-ink-4 tracking-[0.04em] mt-4 text-center leading-[1.6]">
          Sources are selected dynamically based on your query. A health query routes to patient communities and App Store reviews.
          A B2B query routes to G2, HackerNews, and LinkedIn. You see which sources were chosen and why.
        </p>
      </section>

      {/* Section 5: What Makes Tethyr Different */}
      <section ref={s5.ref} className={`py-20 px-8 max-w-[1100px] mx-auto ${s5.className}`}>
        <h2 className="font-display text-[28px] text-ink leading-[1.25] mb-10 text-center">
          What makes Tethyr different
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CLAIMS.map((claim, i) => (
            <div key={i} className="border border-ink/10 rounded-sm p-5">
              <div className="font-mono text-[7.5px] tracking-[0.14em] uppercase text-red mb-2">{claim.label}</div>
              <div className="font-display text-[16px] text-ink mb-2">{claim.title}</div>
              <p className="font-body text-[13px] text-ink-3 leading-[1.55] font-light">{claim.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 6: What's In Your Report */}
      <section ref={s6.ref} className={`py-20 px-8 max-w-[1100px] mx-auto ${s6.className}`}>
        <h2 className="font-display text-[28px] text-ink leading-[1.25] mb-10 text-center">
          What's in your report
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REPORT_SECTIONS.map((sec) => (
            <div key={sec.num} className="border border-ink/10 rounded-sm p-5 flex items-start gap-4">
              <span className="font-mono text-[10px] text-red tracking-[0.08em] flex-shrink-0 mt-1">{sec.num}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-display text-[15px] text-ink">{sec.title}</span>
                  <span
                    className={`font-mono text-[7px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-sm ${
                      sec.tier === "free"
                        ? "bg-green/[0.08] text-green border border-green/[0.15]"
                        : sec.tier === "founder"
                        ? "bg-red/[0.08] text-red border border-red/[0.15]"
                        : "bg-amber/[0.08] text-amber border border-amber/[0.15]"
                    }`}
                  >
                    {sec.tier === "free" ? "Free tier" : sec.tier === "founder" ? "Founder+" : "Team only"}
                  </span>
                </div>
                <p className="font-body text-[13px] text-ink-3 leading-[1.5] font-light">{sec.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 7: Pricing */}
      <section id="pricing" ref={s7.ref} className={`py-20 px-8 max-w-[1100px] mx-auto ${s7.className}`}>
        <h2 className="font-display text-[28px] text-ink leading-[1.25] mb-10 text-center">
          Pricing
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {PRICING.map((plan) => (
            <div
              key={plan.name}
              className={`border rounded-sm p-5 flex flex-col ${
                plan.dark ? "bg-ink border-ink text-paper" : "border-ink/10"
              }`}
            >
              <div className={`font-mono text-[9px] tracking-[0.12em] uppercase mb-3 ${plan.dark ? "text-paper/60" : "text-ink-4"}`}>
                {plan.name}
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className={`font-display text-[36px] leading-none ${plan.dark ? "text-paper" : "text-ink"}`}>
                  {plan.price}
                </span>
                <span className={`font-mono text-[9px] ${plan.dark ? "text-paper/40" : "text-ink-4"}`}>
                  {plan.period}
                </span>
              </div>
              <div className={`h-px my-4 ${plan.dark ? "bg-paper/10" : "bg-ink/10"}`} />
              <div className="flex flex-col gap-2 flex-1 mb-5">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={`font-mono text-[9px] flex-shrink-0 mt-px ${plan.dark ? "text-paper/40" : "text-ink-4"}`}>→</span>
                    <span className={`font-body text-[13px] font-light ${plan.dark ? "text-paper/80" : "text-ink-3"}`}>{f}</span>
                  </div>
                ))}
              </div>
              <button
                className={`w-full py-2.5 font-mono text-[9px] tracking-[0.12em] uppercase border cursor-pointer transition-colors ${
                  plan.dark
                    ? "bg-paper text-ink border-paper hover:bg-paper-dark"
                    : "bg-ink text-paper border-ink hover:bg-red hover:border-red"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Section 8: Final CTA */}
      <section ref={s8.ref} className={`py-20 px-8 text-center ${s8.className}`}>
        <div className="max-w-[640px] mx-auto">
          <h2 className="font-display text-[32px] text-ink leading-[1.2] mb-3">
            Your idea deserves an{" "}
            <span className="italic text-red">honest answer.</span>
          </h2>
          <p className="font-body text-[16px] text-ink-3 leading-[1.6] font-light mb-8">
            Stop guessing. Stop asking ChatGPT. Find out what real people actually say about the
            problem you're solving — in 90 seconds, with evidence.
          </p>
          <SearchInput
            variant="landing"
            onRunReport={onRunReport}
            isSearching={isSearching}
            appState={appState}
          />
          <div className="font-mono text-[8px] text-ink-4 tracking-[0.06em] mt-6">
            First report free · 60–90 seconds · No card required
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink/10 px-8 py-6 flex items-center justify-between">
        <div className="font-display text-[15px] font-bold text-ink">
          Teth<span className="text-red">y</span>r
        </div>
        <div className="font-mono text-[8px] text-ink-4 tracking-[0.06em]">
          © 2025 Tethyr. Real signal, not AI opinion.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
