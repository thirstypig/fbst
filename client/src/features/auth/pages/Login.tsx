// client/src/pages/Login.tsx
import React, { useState } from "react";
import GoogleSignInButton from "../../../components/GoogleSignInButton";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../../auth/AuthProvider";
import { Logo } from "../../../components/ui/Logo";
import { supabase } from "../../../lib/supabase";
import { track } from "../../../lib/posthog";

export default function Login() {
  const [searchParams] = useSearchParams();
  const urlError = searchParams.get("error");

  const { loginWithGoogle, loginWithPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(urlError === "not_approved" ? "not_approved" : "");
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResendSuccess(false);
    setLoading(true);

    try {
      await loginWithPassword(email, password);
      track("login", { method: "password" });
      window.location.href = "/";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      // Detect "email not confirmed" from Supabase error
      if (msg.includes("not confirmed") || msg.includes("email_not_confirmed"))
        setError("email_not_confirmed");
      else if (msg.includes("Invalid login credentials"))
        setError("Invalid email or password. Please check your credentials.");
      else
        setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setResendLoading(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (resendError) throw resendError;
      setResendSuccess(true);
    } catch {
      setError("Failed to resend confirmation email. Try again in a few minutes.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left panel — marketing / value prop */}
      <div className="hidden md:flex md:w-[45%] lg:w-[50%] bg-gradient-to-br from-[var(--lg-bg)] via-[var(--lg-tint)] to-[var(--lg-bg)] border-r border-[var(--lg-border-faint)] flex-col justify-between p-10 lg:p-16">
        <div>
          <a href="https://www.thefantasticleagues.com" rel="noopener noreferrer" className="flex items-center gap-3 group">
            <Logo size={36} />
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-[var(--lg-text-heading)] leading-none">TFL</span>
              <span className="text-[10px] font-bold tracking-wide text-[var(--lg-text-muted)] opacity-60 uppercase mt-0.5">The Fantastic Leagues</span>
            </div>
          </a>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-[var(--lg-text-heading)] leading-tight mb-3">
              Fantasy baseball,<br />powered by AI.
            </h1>
            <p className="text-sm text-[var(--lg-text-secondary)] leading-relaxed max-w-sm">
              Real-time stats, AI-powered insights, live auction drafts, and everything you need to run your league.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--lg-accent)]/10 border border-[var(--lg-accent)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm">⚾</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--lg-text-primary)]">Live MLB Stats</div>
                <div className="text-xs text-[var(--lg-text-muted)]">Real-time scoring synced with MLB API, updated daily.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--lg-accent)]/10 border border-[var(--lg-accent)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm">🤖</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--lg-text-primary)]">AI Insights</div>
                <div className="text-xs text-[var(--lg-text-muted)]">Weekly team grades, trade analysis, and draft reports.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--lg-accent)]/10 border border-[var(--lg-accent)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm">📊</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--lg-text-primary)]">Auction & Snake Drafts</div>
                <div className="text-xs text-[var(--lg-text-muted)]">Live drafts with bid tracking, auto-pick, and spending pace.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 text-xs text-[var(--lg-text-muted)] opacity-60">
            <Link to="/discover" className="hover:text-[var(--lg-text-primary)] transition-colors">Discover Leagues</Link>
            <span>·</span>
            <Link to="/pricing" className="hover:text-[var(--lg-text-primary)] transition-colors">Pricing</Link>
            <span>·</span>
            <a href="https://www.thefantasticleagues.com" rel="noopener noreferrer" className="hover:text-[var(--lg-text-primary)] transition-colors">About</a>
          </div>
          <a
            href="https://www.thefantasticleagues.com" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--lg-text-muted)] opacity-40 hover:opacity-70 transition-opacity"
          >
            ← thefantasticleagues.com
          </a>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10">
        {/* Mobile-only logo (hidden on desktop where it's in the left panel) */}
        <div className="md:hidden mb-10">
          <Link to="/" className="flex items-center gap-3 justify-center">
            <Logo size={40} />
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-[var(--lg-text-heading)] leading-none">TFL</span>
              <span className="text-xs font-bold tracking-wide text-[var(--lg-text-muted)] opacity-60 uppercase mt-0.5">The Fantastic Leagues</span>
            </div>
          </Link>
        </div>

        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="lg-card p-8 md:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--lg-accent)] to-transparent opacity-50" />

            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[var(--lg-text-heading)] mb-2">Log In</h2>
              <p className="text-sm font-medium text-[var(--lg-text-secondary)] opacity-60">Sign in to your account</p>
            </div>

            <div className="space-y-6">
              <div>
                <GoogleSignInButton label="Continue with Google" onClick={() => { track("login", { method: "google" }); loginWithGoogle(); }} />
              </div>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--lg-border-faint)]"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wide">
                  <span className="bg-[var(--lg-card-bg)] px-3 text-[var(--lg-text-muted)] font-bold">Or sign in with email</span>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-[var(--lg-text-muted)] mb-2 ml-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-[var(--lg-tint)] border border-[var(--lg-border-subtle)] focus:border-[var(--lg-accent)] focus:ring-1 focus:ring-[var(--lg-accent)] outline-none transition-all placeholder:text-white/20 text-sm font-medium"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2 ml-1">
                    <label className="block text-xs font-bold text-[var(--lg-text-muted)]">
                      Password
                    </label>
                    <Link to="/forgot-password" title="Forgot Password" className="text-xs font-bold text-[var(--lg-accent)] hover:underline">
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-12 pl-4 pr-11 rounded-xl bg-[var(--lg-tint)] border border-[var(--lg-border-subtle)] focus:border-[var(--lg-accent)] focus:ring-1 focus:ring-[var(--lg-accent)] outline-none transition-all text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--lg-text-muted)] hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error === 'not_approved' && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
                    Your email is not approved. Contact your league admin for access.
                  </div>
                )}

                {error === 'email_not_confirmed' && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="mb-2">Please check your email for a confirmation link before logging in.</p>
                    {resendSuccess ? (
                      <p className="text-xs text-green-400">Confirmation email sent! Check your inbox.</p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={resendLoading || !email}
                        className="text-xs font-bold text-[var(--lg-accent)] hover:underline disabled:opacity-50"
                      >
                        {resendLoading ? "Sending..." : "Resend confirmation email"}
                      </button>
                    )}
                  </div>
                )}

                {error && error !== 'not_approved' && error !== 'email_not_confirmed' && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-[var(--lg-accent)] hover:bg-[var(--lg-accent-hover)] text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-[0.98]"
                >
                  {loading ? "Logging in..." : "Log In"}
                </button>
              </form>

              {import.meta.env.DEV && (
                <div className="pt-6 border-t border-[var(--lg-border-faint)]">
                  <button
                    type="button"
                    disabled={devLoading}
                    onClick={async () => {
                      setDevLoading(true);
                      setError("");
                      try {
                        const res = await fetch("/api/auth/dev-login", { method: "POST" });
                        const { email: devEmail, password: devPwd, error: apiErr } = await res.json();
                        if (apiErr) throw new Error(apiErr);
                        await loginWithPassword(devEmail, devPwd);
                        window.location.href = "/";
                      } catch (err: unknown) {
                        setError(err instanceof Error ? err.message : "Dev login failed");
                      } finally {
                        setDevLoading(false);
                      }
                    }}
                    className="flex items-center justify-center gap-2 w-full h-12 px-6 rounded-xl bg-[var(--lg-tint)] border border-[var(--lg-border-subtle)] hover:bg-[var(--lg-tint-hover)] hover:border-[var(--lg-border-subtle)] text-white font-bold text-xs uppercase tracking-wide transition-all disabled:opacity-50"
                  >
                    <span className="text-amber-400">⚡</span> {devLoading ? "Logging in..." : "Dev Login"}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm font-medium text-[var(--lg-text-muted)] opacity-60 flex items-center justify-center gap-2">
              Don't have an account?
              <Link
                to="/signup"
                className="font-bold text-[var(--lg-accent)] hover:text-[var(--lg-accent-hover)] transition-colors"
              >
                Sign Up
              </Link>
            </p>
          </div>

          {/* Mobile-only footer links (hidden on desktop where they're in left panel) */}
          <div className="md:hidden mt-10 pt-6 border-t border-[var(--lg-border-faint)] text-center space-y-3">
            <div className="flex items-center justify-center gap-4 text-xs text-[var(--lg-text-muted)] opacity-60">
              <Link to="/discover" className="hover:text-[var(--lg-text-primary)] transition-colors">Discover Leagues</Link>
              <span>·</span>
              <Link to="/pricing" className="hover:text-[var(--lg-text-primary)] transition-colors">Pricing</Link>
              <span>·</span>
              <a href="https://www.thefantasticleagues.com" rel="noopener noreferrer" className="hover:text-[var(--lg-text-primary)] transition-colors">About</a>
            </div>
            <a
              href="https://www.thefantasticleagues.com" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--lg-text-muted)] opacity-40 hover:opacity-70 transition-opacity"
            >
              ← thefantasticleagues.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
