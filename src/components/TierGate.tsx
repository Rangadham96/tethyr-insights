import type { UserTier } from "@/types/report";

const TIER_ORDER: Record<UserTier, number> = {
  free: 0,
  founder: 1,
  team: 2,
  studio: 3,
};

interface TierGateProps {
  requiredTier: UserTier;
  currentTier: UserTier;
  description: string;
  children: React.ReactNode;
}

const TierGate = ({ requiredTier, currentTier, description, children }: TierGateProps) => {
  const hasAccess = TIER_ORDER[currentTier] >= TIER_ORDER[requiredTier];

  if (hasAccess) return <>{children}</>;

  return (
    <div className="relative">
      <div className="filter blur-[6px] pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-paper/60 z-10">
        <div className="flex flex-col items-center gap-3 max-w-[320px] text-center">
          <div className="w-8 h-8 border border-ink/[0.22] rounded-sm flex items-center justify-center">
            <span className="font-mono text-[14px] text-ink-3">⊘</span>
          </div>
          <p className="font-body text-[14px] text-ink-3 leading-[1.5] font-light">{description}</p>
          <button className="bg-amber text-paper px-5 py-2.5 font-mono text-[9px] tracking-[0.14em] uppercase border-none cursor-pointer transition-colors hover:opacity-90">
            Start free trial
          </button>
        </div>
      </div>
    </div>
  );
};

export default TierGate;
