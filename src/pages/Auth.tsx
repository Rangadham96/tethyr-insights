import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
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

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-ink/10" />
          <span className="font-mono text-[8px] tracking-[0.14em] uppercase text-ink-5">or</span>
          <div className="flex-1 h-px bg-ink/10" />
        </div>

        {/* Google sign-in */}
        <button
          onClick={async () => {
            const { error } = await lovable.auth.signInWithOAuth("google", {
              redirect_uri: window.location.origin,
            });
            if (error) toast.error(error.message);
          }}
          className="w-full py-2.5 bg-white border border-ink/[0.15] rounded-sm font-mono text-[9px] tracking-[0.14em] uppercase text-ink cursor-pointer transition-all hover:border-ink/40 flex items-center justify-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>

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
