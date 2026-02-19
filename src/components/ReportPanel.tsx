const quotes = [
  {
    src: "Reddit\nr/startups",
    link: "Jan 2024 →",
    body: "\"I've been building this for 8 months. Just showed it to 5 real users last week. Every single assumption I had was wrong. I wish I'd done this on day one.\"",
  },
  {
    src: "HackerNews\nShow HN",
    link: "Nov 2023 →",
    body: "\"ChatGPT told me my idea was great. Turns out ChatGPT tells everyone their idea is great. I need something that gives me the truth.\"",
  },
  {
    src: "Reddit\nr/SaaS",
    link: "Mar 2024 →",
    body: "\"Every validation tool I've tried just reformats what I already told it. I want to know what's happening out there without me having to guide it.\"",
  },
];

const gaps = [
  { rank: "01", need: "Discover what problems exist without the founder describing them first — pure inbound signal", freq: "47 discussions", status: "Unbuilt" },
  { rank: "02", need: "Real quotes as evidence attached to every insight — not aggregated sentiment scores", freq: "31 discussions", status: "Partial" },
  { rank: "03", need: "A clear verdict: \"this is already solved\" vs \"genuine gap exists\" — not just competitor lists", freq: "28 discussions", status: "Unbuilt" },
  { rank: "04", need: "Exact language my audience uses — for copy, pitches, App Store descriptions", freq: "19 discussions", status: "Unbuilt" },
];

const competitors = [
  { name: "Brandwatch", value: "Scale and data volume", hate: "Enterprise pricing. Outputs charts, not decisions. No founder UX.", opp: "Affordable. Decision-ready output for small teams." },
  { name: "Perplexity", value: "Speed, familiar search feel", hate: "No structure for product decisions. No evidence depth.", opp: "Structured report with source evidence attached." },
  { name: "SparkToro", value: "Audience intelligence", hate: "No product validation angle. Doesn't say if your idea is viable.", opp: "Validation + audience language in one report." },
];

const phrases = [
  { phrase: "\"building in the dark\"", src: "r/startups" },
  { phrase: "\"ChatGPT just agrees with everything\"", src: "HN" },
  { phrase: "\"8 months wasted on the wrong thing\"", src: "r/SaaS" },
  { phrase: "\"real feedback not a framework\"", src: "r/startups" },
  { phrase: "\"solved a problem nobody actually has\"", src: "HN" },
  { phrase: "\"show me the receipts\"", src: "X" },
  { phrase: "\"assumptions were completely wrong\"", src: "r/SaaS" },
  { phrase: "\"AI told me it was a great idea\"", src: "r/Entrepreneur" },
];

const buildRecs = [
  { n: "1", title: "The evidence-first report before any dashboard features", body: "47 discussions asked for unprompted insight with real quotes attached. This creates the immediate aha moment on first use.", ev: "47 source discussions" },
  { n: "2", title: "The honest verdict — \"don't build this\" when warranted", body: "28 discussions flagged this as the single answer no tool gives honestly. Telling hard truths builds trust faster than any feature.", ev: "28 source discussions" },
  { n: "3", title: "Audience Language in the free tier — not paywalled", body: "Immediately usable — founders paste these phrases into their landing page today. Free creates word of mouth.", ev: "19 source discussions" },
];

const ReportPanel = () => {
  return (
    <div className="flex flex-col overflow-y-auto overflow-x-hidden flex-1" style={{ scrollbarWidth: "thin" }}>
      <div className="flex-1" style={{ animation: "report-in 0.4s ease forwards" }}>
        {/* Top bar */}
        <div className="px-12 py-[13px] border-b-2 border-ink flex items-center justify-between sticky top-0 bg-paper z-50">
          <span className="font-mono text-[8.5px] tracking-[0.15em] text-ink-4 uppercase">
            Report #TR-20260219-001
          </span>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[8.5px] text-ink-3 tracking-[0.06em]">6 platforms</span>
            <span className="font-mono text-[8.5px] text-ink-3 tracking-[0.06em]">1,247 data points</span>
            <span className="font-mono text-[8.5px] text-green font-medium tracking-[0.06em]">↑ Problem confirmed</span>
            <span className="font-mono text-[8.5px] text-ink-3 tracking-[0.06em]">19 Feb 2026 · 14:32</span>
            <span className="font-mono text-[8.5px] tracking-[0.1em] uppercase text-ink-3 cursor-pointer border-b border-ink/[0.22] pb-[1px] transition-colors hover:text-red hover:border-red">
              Export PDF ↗
            </span>
          </div>
        </div>

        {/* Query area */}
        <div className="px-12 pt-9 pb-7 border-b border-ink/10">
          <div className="font-mono text-[8.5px] tracking-[0.15em] uppercase text-ink-4 mb-[10px]">
            Intelligence report for
          </div>
          <div className="font-display text-[clamp(18px,2vw,24px)] font-normal italic leading-[1.35] text-ink max-w-[700px]">
            "An app that helps founders validate their startup idea against what real humans are saying online, before they build the wrong thing for months"
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
            <div className="flex items-start gap-3.5 px-[18px] py-3.5 bg-green/[0.07] border-l-[3px] border-green mb-[22px]">
              <span className="text-green text-[15px] flex-shrink-0 mt-[1px]">↑</span>
              <span className="font-body text-[16px] font-medium text-green leading-[1.45]">
                This problem is real and significantly underserved. Strong signal across 6 platforms. No existing tool addresses this specific combination of needs.
              </span>
            </div>
            {quotes.map((q, i) => (
              <div key={i} className={`grid grid-cols-[100px_1fr] gap-[18px] items-start mb-3.5 pb-3.5 ${i < quotes.length - 1 ? "border-b border-ink/10" : ""}`}>
                <div className="font-mono text-[8.5px] tracking-[0.07em] text-ink-4 leading-[1.5] text-right border-r border-ink/[0.22] pr-3.5 uppercase whitespace-pre-line">
                  {q.src}
                  <a href="#" className="text-red block mt-[3px] text-[8px] no-underline hover:underline">{q.link}</a>
                </div>
                <div className="font-body text-[16px] italic text-ink-2 leading-[1.6] font-light">
                  {q.body}
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
                  <th className="font-mono text-[8px] tracking-[0.14em] uppercase text-ink-3 pb-[9px] pr-3.5 text-left font-normal">Unmet need</th>
                  <th className="font-mono text-[8px] tracking-[0.14em] uppercase text-ink-3 pb-[9px] pr-3.5 text-left font-normal">Frequency</th>
                  <th className="font-mono text-[8px] tracking-[0.14em] uppercase text-ink-3 pb-[9px] text-left font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {gaps.map((g, i) => (
                  <tr key={i} className={i < gaps.length - 1 ? "border-b border-ink/10" : ""}>
                    <td className="font-mono text-[9px] text-ink-4 whitespace-nowrap py-3 pr-3.5 align-top">{g.rank}</td>
                    <td className="text-[14.5px] text-ink-2 leading-[1.5] py-3 pr-3.5 align-top">{g.need}</td>
                    <td className="font-mono text-[9px] text-ink-4 whitespace-nowrap py-3 pr-3.5 align-top">{g.freq}</td>
                    <td className={`font-mono text-[8.5px] tracking-[0.07em] uppercase whitespace-nowrap py-3 align-top ${g.status === "Unbuilt" ? "text-red" : "text-ink-4"}`}>
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
                {competitors.map((c, i) => (
                  <tr key={i} className={`transition-colors hover:bg-white/30 ${i < competitors.length - 1 ? "border-b border-ink/10" : ""}`}>
                    <td className="font-medium text-ink text-[15px] py-3 pr-[18px] align-top">{c.name}</td>
                    <td className="text-[14px] text-ink-2 leading-[1.5] py-3 pr-[18px] align-top">{c.value}</td>
                    <td className="text-[14px] text-red leading-[1.5] py-3 pr-[18px] align-top">{c.hate}</td>
                    <td className="text-[14px] text-green italic leading-[1.5] py-3 align-top">{c.opp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* 04 - Audience Language */}
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
              {phrases.map((p, i) => (
                <div key={i} className="break-inside-avoid flex items-baseline justify-between gap-[10px] py-[9px] border-b border-ink/10 cursor-default transition-colors">
                  <span className="font-display italic text-[14.5px] text-ink-2 leading-[1.4]">
                    {p.phrase}
                  </span>
                  <span className="font-mono text-[8px] text-ink-5 flex-shrink-0">
                    {p.src}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* 05 - Build Recommendations */}
          <section className="py-8 opacity-0" style={{ animation: "section-in 0.5s ease forwards", animationDelay: "2.1s" }}>
            <div className="flex items-center gap-3.5 mb-[18px]">
              <span className="font-mono text-[8.5px] tracking-[0.16em] text-ink-4 uppercase flex-shrink-0">05</span>
              <div className="flex-1 h-px bg-ink/10" />
            </div>
            <h2 className="font-display text-[19px] font-semibold text-ink mb-4 tracking-tight">
              What to build first — ranked by evidence strength
            </h2>
            <div className="grid grid-cols-3 border border-ink/[0.22]">
              {buildRecs.map((r, i) => (
                <div key={i} className={`px-5 py-[18px] ${i < buildRecs.length - 1 ? "border-r border-ink/[0.22]" : ""}`}>
                  <div className="font-display text-[44px] font-bold text-paper-darker leading-none mb-[10px]">
                    {r.n}
                  </div>
                  <div className="font-body text-[14.5px] font-medium text-ink mb-[7px] leading-[1.4]">
                    {r.title}
                  </div>
                  <div className="text-[13px] text-ink-3 leading-[1.6] font-light">
                    {r.body}
                  </div>
                  <div className="mt-[9px] font-mono text-[8.5px] text-red tracking-[0.06em]">
                    {r.ev}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Report footer */}
        <div className="px-12 py-5 border-t-2 border-ink flex items-center justify-between bg-paper">
          <span className="font-mono text-[8.5px] text-ink-4 tracking-[0.06em]">
            Want this delivered every morning for your company?{" "}
            <a href="#" className="text-red no-underline hover:underline">Set up a workspace →</a>
          </span>
          <div className="flex gap-2">
            <button className="border border-ink/[0.22] bg-transparent text-ink-3 px-3.5 py-[7px] font-mono text-[8.5px] tracking-[0.1em] uppercase cursor-pointer rounded-sm transition-all hover:border-ink hover:text-ink">
              Export PDF
            </button>
            <button className="border-none bg-ink text-paper px-3.5 py-[7px] font-mono text-[8.5px] tracking-[0.1em] uppercase cursor-pointer rounded-sm transition-colors hover:bg-red">
              New Report →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPanel;
