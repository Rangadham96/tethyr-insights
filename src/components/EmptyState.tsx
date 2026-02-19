interface EmptyStateProps {
  onQuerySelect: (text: string) => void;
}

const EXAMPLES = [
  "A tool that helps solo founders know if the problem they're solving is real, using real internet signal — not AI guessing",
  "What are users of Notion, Linear, and Asana actually complaining about that nobody has solved yet?",
  "How many people are talking about burnout from remote work and what solutions are they asking for?",
];

const EmptyState = ({ onQuerySelect }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center h-full px-12 max-w-[600px] mx-auto">
      <h1 className="font-display text-[32px] text-ink leading-[1.25] mb-1 text-center">
        Find out if what you're building
      </h1>
      <h2 className="font-display text-[32px] italic text-red leading-[1.25] mb-6 text-center">
        is actually needed.
      </h2>
      <p className="font-body text-[16px] text-ink-3 leading-[1.6] font-light text-center mb-10">
        Describe your idea, and Tethyr will search Reddit, App Stores, YouTube, patient forums,
        and 25+ other sources to tell you what real people actually say — with evidence.
      </p>

      <div className="w-full">
        <div className="font-mono text-[8px] tracking-[0.12em] uppercase text-ink-4 mb-3">
          Try one of these
        </div>
        <div className="flex flex-col gap-2">
          {EXAMPLES.map((example, i) => (
            <div
              key={i}
              onClick={() => onQuerySelect(example)}
              className="group border-l-2 border-ink/10 hover:border-red pl-4 py-3 cursor-pointer transition-all"
            >
              <p className="font-body text-[14px] italic text-ink-3 leading-[1.5] font-light">
                "{example}"
              </p>
              <span className="font-mono text-[8px] text-red tracking-[0.08em] opacity-0 group-hover:opacity-100 transition-opacity mt-1 inline-block">
                Click to use ↑
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
