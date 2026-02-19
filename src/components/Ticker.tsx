const tickerItems = [
  { text: "Reddit r/startups — 34 threads found", live: true, dot: "red" },
  { text: "HackerNews — 12 relevant discussions", live: true, dot: "red" },
  { text: "X/Twitter — scanning 1,204 posts", live: false, dot: "red" },
  { text: "App Store — extracting Calm reviews", live: false },
  { text: "G2 — 312 reviews processed", live: false },
  { text: "Reddit r/SaaS — complete", live: false, dot: "green" },
  { text: "Product Hunt — reading comments", live: false },
  { text: "Trustpilot — live extraction", live: true, dot: "red" },
  { text: "YouTube comments — queued", live: false },
];

const Ticker = () => {
  const items = [...tickerItems, ...tickerItems]; // duplicate for seamless loop

  return (
    <div className="fixed top-0 left-0 right-0 z-[300] h-[26px] bg-ink flex items-center overflow-hidden">
      <div className="flex-shrink-0 h-full px-3.5 bg-red flex items-center font-mono text-[8.5px] tracking-[0.18em] uppercase text-paper border-r border-white/10">
        Tethyr Live
      </div>
      <div className="overflow-hidden flex-1">
        <div className="flex animate-ticker-scroll w-max">
          {items.map((item, i) => (
            <span
              key={i}
              className={`font-mono text-[8.5px] tracking-[0.09em] px-[22px] border-r border-white/[0.07] h-[26px] flex items-center gap-[7px] whitespace-nowrap ${
                item.live ? "text-paper/90" : "text-paper/50"
              }`}
            >
              {item.dot && (
                <span
                  className={`w-[5px] h-[5px] rounded-full flex-shrink-0 ${
                    item.dot === "green"
                      ? "bg-[#3D9970]"
                      : "bg-red-soft animate-blink"
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
