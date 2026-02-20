import { useNavigate } from "react-router-dom";

const AuthCTA = () => {
  const navigate = useNavigate();

  return (
    <div className="border-t-2 border-red bg-red/[0.04] px-6 py-5 flex items-center justify-between gap-4 flex-shrink-0">
      <div>
        <div className="font-display text-[15px] font-bold text-ink tracking-tight">
          Sign up to save this report
        </div>
        <p className="font-body text-[13px] text-ink-3 font-light mt-0.5">
          Create a free account to keep your reports, run more searches, and unlock team features.
        </p>
      </div>
      <button
        onClick={() => navigate("/auth")}
        className="flex-shrink-0 bg-ink text-paper px-5 py-2.5 font-mono text-[9px] tracking-[0.14em] uppercase border-none rounded-sm cursor-pointer transition-all hover:bg-red"
      >
        Sign up free →
      </button>
    </div>
  );
};

export default AuthCTA;
