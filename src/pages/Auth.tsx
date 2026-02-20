import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Mode = "login" | "signup";

const Auth = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "signup") {
      const { error } = await signUp(email, password, displayName);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Check your email to confirm your account.");
        setMode("login");
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
      } else {
        navigate("/");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-5 relative z-[1]">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] text-ink">
            Teth<span className="text-red">y</span>r
          </h1>
          <p className="font-body text-[14px] text-ink-3 mt-1 font-light">
            {mode === "login" ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "signup" && (
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[8px] tracking-[0.14em] uppercase text-ink-4">
                Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2.5 bg-white/50 border border-ink/[0.15] rounded-sm font-body text-[14px] text-ink placeholder:text-ink-4 focus:outline-none focus:border-ink/40 transition-colors"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[8px] tracking-[0.14em] uppercase text-ink-4">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 bg-white/50 border border-ink/[0.15] rounded-sm font-body text-[14px] text-ink placeholder:text-ink-4 focus:outline-none focus:border-ink/40 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[8px] tracking-[0.14em] uppercase text-ink-4">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 bg-white/50 border border-ink/[0.15] rounded-sm font-body text-[14px] text-ink placeholder:text-ink-4 focus:outline-none focus:border-ink/40 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 bg-ink text-paper font-mono text-[9px] tracking-[0.14em] uppercase border-none rounded-sm cursor-pointer transition-all hover:bg-red disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Sign in →"
                : "Create account →"}
          </button>
        </form>

        {/* Toggle mode */}
        <div className="h-px bg-ink/10 my-6" />
        <p className="text-center font-body text-[13px] text-ink-3 font-light">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-red font-medium bg-transparent border-none cursor-pointer underline underline-offset-2 hover:text-ink transition-colors"
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
