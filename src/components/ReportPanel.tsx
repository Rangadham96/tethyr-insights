import CopyButton from "@/components/CopyButton";
import TierGate from "@/components/TierGate";
import { SOURCE_REGISTRY } from "@/constants/sources";
import { exportReportPdf } from "@/lib/exportPdf";
import type { ReportData, UserTier, Verdict } from "@/types/report";

interface ReportPanelProps {
  reportData: ReportData;
  userTier: UserTier;
  onNewReport?: () => void;
}

const VERDICT_CONFIG: Record<Verdict, { bg: string; border: string; textColor: string; icon: string; fallback: string }> = {
  CONFIRMED: {
    bg: "bg-green/[0.07]",
    border: "border-green",
    textColor: "text-green",
    icon: "↑",
    fallback: "",
  },
  PARTIAL: {
    bg: "bg-amber/[0.07]",
    border: "border-amber",
    textColor: "text-amber",
    icon: "↔",
    fallback: "Limited signal found — treat this report as directional, not definitive.",
  },
  UNCLEAR: {
    bg: "bg-red/[0.07]",
    border: "border-red",
    textColor: "text-red",
    icon: "?",
    fallback: "We found insufficient signal to validate this problem. This may mean the problem is too niche, too new, or genuinely doesn't exist yet.",
  },
  INVALIDATED: {
    bg: "bg-red/[0.07]",
    border: "border-red",
    textColor: "text-red",
    icon: "↓",
    fallback: "Strong evidence suggests this problem is already well solved. Read the competitor section carefully before building.",
  },
};

const ReportPanel = ({ reportData, userTier, onNewReport }: ReportPanelProps) => {
  const { meta, problem_validation, feature_gaps, competitor_weaknesses, audience_language, build_recommendations } = reportData;
  const vc = VERDICT_CONFIG[meta.verdict];

  // Build sources string
  const sourcesStr = meta.sources_used.map((s) => SOURCE_REGISTRY[s.platform]?.display_name || s.display_name).join(", ");

  return (
    <div className="flex flex-col overflow-y-auto overflow-x-hidden flex-1" style={{ scrollbarWidth: "thin" }}>
      <div className="flex-1" style={{ animation: "report-in 0.4s ease forwards" }}>
        {/* Top bar */}
        <div className="px-12 py-[13px] border-b-2 border-ink flex items-center justify-between sticky top-0 bg-paper z-50">
          <span className="font-mono text-[8.5px] tracking-[0.15em] text-ink-4 uppercase">
            Report #{meta.report_id}
          </span>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[8.5px] text-ink-3 tracking-[0.06em]">
              Searched {sourcesStr}
            </span>
            <span className="font-mono text-[8.5px] text-ink-3 tracking-[0.06em]">
              {meta.data_points.toLocaleString()} data points
            </span>
            <span className={`font-mono text-[8.5px] font-medium tracking-[0.06em] ${vc.textColor}`}>
              {vc.icon} {meta.verdict}
            </span>
            <button
              onClick={() => exportReportPdf(reportData)}
              className="font-mono text-[8.5px] tracking-[0.1em] uppercase text-ink-3 cursor-pointer border-b border-ink/[0.22] pb-[1px] transition-colors hover:text-red hover:border-red bg-transparent border-t-0 border-l-0 border-r-0 p-0"
            >
              Export PDF ↗
            </button>
          </div>
        </div>

        {/* Query area */}
        <div className="px-12 pt-9 pb-7 border-b border-ink/10">
          <div className="font-mono text-[8.5px] tracking-[0.15em] uppercase text-ink-4 mb-[10px]">
            Intelligence report for
          </div>
          <div className="font-display text-[clamp(18px,2vw,24px)] font-normal italic leading-[1.35] text-ink max-w-[700px]">
            "{meta.query}"
          </div>
        </div>

        {/* Report body */}
        <div className="px-12 pb-[60px]">
          {/* 01 - Problem Validation */}
          <section className="py-8 border-b border-ink/10 opacity-0" style={{ animation: "section-in 0.5s ease forwards", animationDelay: "0.05s" }}>
            <div className="flex items-center gap-3.5 mb-[18px]">
              <span className="font-mono text-[8.5px] tracking-[0.16em] text-ink-4 uppercase flex-shrink-0">01</span>
              <div className="flex-1 h-px bg-ink/10" />
            </div>
            <h2 className="font-display text-[19px] font-semibold text-ink mb-4 tracking-tight">
              Problem Validation
            </h2>

            {/* Verdict block */}
            <div className={`flex items-start gap-3.5 px-[18px] py-3.5 ${vc.bg} border-l-[3px] ${vc.border} mb-[22px]`}>
              <span className={`${vc.textColor} text-[15px] flex-shrink-0 mt-[1px]`}>{vc.icon}</span>
              <span className={`font-body text-[16px] font-medium ${vc.textColor} leading-[1.45]`}>
                {meta.verdict_statement || vc.fallback}
              </span>
            </div>

            {problem_validation.quotes.map((q, i) => (
              <div key={i} className={`group grid grid-cols-[100px_1fr] gap-[18px] items-start mb-3.5 pb-3.5 ${i < problem_validation.quotes.length - 1 ? "border-b border-ink/10" : ""}`}>
                <div className="font-mono text-[8.5px] tracking-[0.07em] text-ink-4 leading-[1.5] text-right border-r border-ink/[0.22] pr-3.5 uppercase">
                  {q.source}
                  <br />
                  <span className="text-[8px] text-ink-5 normal-case">{SOURCE_REGISTRY[q.platform]?.display_name || q.platform}</span>
                </div>
                <div className="font-body text-[16px] italic text-ink-2 leading-[1.6] font-light relative">
                  "{q.text}"
                  <CopyButton text={q.text} attribution={`${q.source} — ${SOURCE_REGISTRY[q.platform]?.display_name || q.platform}`} />
                </div>
              </div>
            ))}
          </section>

          {/* 02 - Feature Gaps */}
          <section className="py-8 border-b border-ink/10 opacity-0" style={{ animation: "section-in 0.5s ease forwards", animationDelay: "0.4s" }}>
            <div className="flex items-center gap-3.5 mb-[18px]">
              <span className="font-mono text-[8.5px] tracking-[0.16em] text-ink-4 uppercase flex-shrink-0">02</span>
              <div className="flex-1 h-px bg-ink/10" />
            </div>
            <h2 className="font-display text-[19px] font-semibold text-ink mb-4 tracking-tight">
              What people actually want — ranked by frequency
            </h2>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-ink">
                  <th className="font-mono text-[8px] tracking-[0.14em] uppercase text-ink-3 pb-[9px] pr-3.5 text-left font-normal w-7">#</th>
                  <th className="font-mono text-[8px] tracking-[0.14em] uppercase text-ink-3 pb-[9px] pr-3.5 text-left font-normal">Gap</th>
                  <th className="font-mono text-[8px] tracking-[0.14em] uppercase text-ink-3 pb-[9px] pr-3.5 text-left font-normal">Frequency</th>
                  <th className="font-mono text-[8px] tracking-[0.14em] uppercase text-ink-3 pb-[9px] text-left font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {feature_gaps.gaps.map((g, i) => (
                  <tr key={i} className={i < feature_gaps.gaps.length - 1 ? "border-b border-ink/10" : ""}>
                    <td className="font-mono text-[9px] text-ink-4 whitespace-nowrap py-3 pr-3.5 align-top">{String(i + 1).padStart(2, "0")}</td>
                    <td className="text-[14.5px] text-ink-2 leading-[1.5] py-3 pr-3.5 align-top">{g.title}: {g.description}</td>
                    <td className="font-mono text-[9px] text-ink-4 whitespace-nowrap py-3 pr-3.5 align-top">{g.frequency}</td>
                    <td className={`font-mono text-[8.5px] tracking-[0.07em] uppercase whitespace-nowrap py-3 align-top ${g.status === "Unaddressed" ? "text-red" : "text-ink-4"}`}>
                      {g.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* 03 - Competitor Weaknesses */}
          <section className="py-8 border-b border-ink/10 opacity-0" style={{ animation: "section-in 0.5s ease forwards", animationDelay: "0.9s" }}>
            <div className="flex items-center gap-3.5 mb-[18px]">
              <span className="font-mono text-[8.5px] tracking-[0.16em] text-ink-4 uppercase flex-shrink-0">03</span>
              <div className="flex-1 h-px bg-ink/10" />
            </div>
            <h2 className="font-display text-[19px] font-semibold text-ink mb-4 tracking-tight">
              Competitor weaknesses — from their users' own words
            </h2>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-ink">
                  <th className="font-mono text-[8px] tracking-[0.14em] uppercase text-ink-3 pb-[9px] pr-[18px] text-left font-normal">Competitor</th>
                  <th className="font-mono text-[8px] tracking-[0.14em] uppercase text-ink-3 pb-[9px] pr-[18px] text-left font-normal">What users value</th>
                  <th className="font-mono text-[8px] tracking-[0.14em] uppercase text-ink-3 pb-[9px] pr-[18px] text-left font-normal">What users hate</th>
                  <th className="font-mono text-[8px] tracking-[0.14em] uppercase text-ink-3 pb-[9px] text-left font-normal">Your opening</th>
                </tr>
              </thead>
              <tbody>
                {competitor_weaknesses.competitors.map((c, i) => (
                  <tr key={i} className={`transition-colors hover:bg-white/30 ${i < competitor_weaknesses.competitors.length - 1 ? "border-b border-ink/10" : ""}`}>
                    <td className="font-medium text-ink text-[15px] py-3 pr-[18px] align-top">{c.name}</td>
                    <td className="text-[14px] text-ink-2 leading-[1.5] py-3 pr-[18px] align-top">{c.pros.join(". ")}</td>
                    <td className="text-[14px] text-red leading-[1.5] py-3 pr-[18px] align-top">{c.cons.join(". ")}</td>
                    <td className="text-[14px] text-green italic leading-[1.5] py-3 align-top">{c.opportunity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* 04 - Audience Language (tier-gated) */}
          <TierGate requiredTier="founder" currentTier={userTier} description="Unlock audience language — the exact phrases your users use to describe their problems.">
            <section className="py-8 border-b border-ink/10 opacity-0" style={{ animation: "section-in 0.5s ease forwards", animationDelay: "1.5s" }}>
              <div className="flex items-center gap-3.5 mb-[18px]">
                <span className="font-mono text-[8.5px] tracking-[0.16em] text-ink-4 uppercase flex-shrink-0">04</span>
                <div className="flex-1 h-px bg-ink/10" />
              </div>
              <h2 className="font-display text-[19px] font-semibold text-ink mb-4 tracking-tight">
                How your market actually describes this problem
              </h2>
              <p className="font-mono text-[9px] text-ink-4 tracking-[0.06em] mb-4">
                Use these phrases in your landing page, pitch deck, and App Store description.
              </p>
              <div className="columns-2 gap-6" style={{ columnRule: "1px solid hsl(24 11% 10% / 0.1)" }}>
                {audience_language.phrases.map((p, i) => (
                  <div key={i} className="group break-inside-avoid flex items-baseline justify-between gap-[10px] py-[9px] border-b border-ink/10 cursor-default transition-colors">
                    <span className="font-display italic text-[14.5px] text-ink-2 leading-[1.4]">
                      "{p.phrase}"
                      <CopyButton text={p.phrase} attribution={`${p.source} — ${SOURCE_REGISTRY[p.platform]?.display_name || p.platform}`} />
                    </span>
                    <span className="font-mono text-[8px] text-ink-5 flex-shrink-0">
                      {p.source}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </TierGate>

          {/* 05 - Build Recommendations (tier-gated) */}
          <TierGate requiredTier="founder" currentTier={userTier} description="Unlock build recommendations — what to build first, ranked by evidence strength.">
            <section className="py-8 opacity-0" style={{ animation: "section-in 0.5s ease forwards", animationDelay: "2.1s" }}>
              <div className="flex items-center gap-3.5 mb-[18px]">
                <span className="font-mono text-[8.5px] tracking-[0.16em] text-ink-4 uppercase flex-shrink-0">05</span>
                <div className="flex-1 h-px bg-ink/10" />
              </div>
              <h2 className="font-display text-[19px] font-semibold text-ink mb-4 tracking-tight">
                What to build first — ranked by evidence strength
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 border border-ink/[0.22]">
                {build_recommendations.recommendations.map((r, i) => (
                  <div key={i} className={`px-5 py-[18px] ${i < build_recommendations.recommendations.length - 1 ? "md:border-r border-ink/[0.22]" : ""}`}>
                    <div className="font-display text-[44px] font-bold text-paper-darker leading-none mb-[10px]">
                      {i + 1}
                    </div>
                    <div className="font-body text-[14.5px] font-medium text-ink mb-[7px] leading-[1.4]">
                      {r.title}
                    </div>
                    <div className="text-[13px] text-ink-3 leading-[1.6] font-light">
                      {r.body}
                    </div>
                    <div className="mt-[9px] font-mono text-[8.5px] text-red tracking-[0.06em] uppercase">
                      {r.priority} priority
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </TierGate>
        </div>

        {/* Report footer */}
        <div className="px-12 py-5 border-t-2 border-ink flex items-center justify-between bg-paper">
          <span className="font-mono text-[8.5px] text-ink-4 tracking-[0.06em]">
            Want this delivered every morning for your company?{" "}
            <a href="#" className="text-red no-underline hover:underline">Set up a workspace →</a>
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => exportReportPdf(reportData)}
              className="border border-ink/[0.22] bg-transparent text-ink-3 px-3.5 py-[7px] font-mono text-[8.5px] tracking-[0.1em] uppercase cursor-pointer rounded-sm transition-all hover:border-ink hover:text-ink"
            >
              Export PDF
            </button>
            <button
              onClick={onNewReport}
              className="border-none bg-ink text-paper px-3.5 py-[7px] font-mono text-[8.5px] tracking-[0.1em] uppercase cursor-pointer rounded-sm transition-colors hover:bg-red"
            >
              New Report →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPanel;
