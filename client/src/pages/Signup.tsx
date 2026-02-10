import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import GoogleSignInButton from "../components/GoogleSignInButton";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Signup failed");
      }

      // Success
      window.location.href = "/";
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--lg-bg-page)] flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.05),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(96,165,250,0.05),transparent_50%)]">
      
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
        <Link to="/" className="flex items-center gap-3 mb-12 justify-center group">
          <div className="w-10 h-10 rounded-xl bg-[var(--lg-accent)] flex items-center justify-center text-white font-black text-lg shadow-2xl shadow-blue-500/40 transform group-hover:-rotate-6 transition-transform">FB</div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-[0.05em] text-[var(--lg-text-heading)] leading-none uppercase">Protocol</span>
            <span className="text-[9px] font-black tracking-[0.3em] text-[var(--lg-text-muted)] opacity-60 uppercase mt-1">Intelligence System</span>
          </div>
        </Link>

        <div className="lg-card p-8 md:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--lg-accent)] to-transparent opacity-50" />
          
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-black tracking-tighter text-[var(--lg-text-heading)] mb-2 uppercase">Create Account</h2>
            <p className="text-sm font-medium text-[var(--lg-text-secondary)] opacity-60">Initialize your strategic link</p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <GoogleSignInButton label="Google" />
              <a
                href="/api/auth/yahoo"
                className="flex items-center justify-center gap-2 w-full h-11 px-4 rounded-xl bg-[#6001d2]/10 border border-[#6001d2]/20 hover:bg-[#6001d2]/20 hover:border-[#6001d2]/30 text-white font-medium transition-all duration-200"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-[#6001d2] rounded-full text-[10px] font-bold">Y</span>
                Yahoo
              </a>
            </div>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em]">
                <span className="bg-[#0f172a] px-3 text-[var(--lg-text-muted)] font-black">Or register credentials</span>
              </div>
            </div>

            <form onSubmit={handleSignup} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-[var(--lg-text-muted)] uppercase tracking-[0.2em] mb-2 ml-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 focus:border-[var(--lg-accent)] focus:ring-1 focus:ring-[var(--lg-accent)] outline-none transition-all text-sm font-medium"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-[var(--lg-text-muted)] uppercase tracking-[0.2em] mb-2 ml-1">
                  Agent ID (Email)
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 focus:border-[var(--lg-accent)] focus:ring-1 focus:ring-[var(--lg-accent)] outline-none transition-all placeholder:text-white/10 text-sm font-medium"
                  placeholder="agent@protocol.fbst"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-[var(--lg-text-muted)] uppercase tracking-[0.2em] mb-2 ml-1">
                  Access Key
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 pl-4 pr-11 rounded-xl bg-white/5 border border-white/10 focus:border-[var(--lg-accent)] focus:ring-1 focus:ring-[var(--lg-accent)] outline-none transition-all text-sm font-medium"
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

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold animate-in shake-in duration-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-[var(--lg-accent)] hover:bg-[var(--lg-accent-hover)] text-white font-black uppercase tracking-[0.1em] text-sm rounded-xl transition-all shadow-2xl shadow-blue-500/30 disabled:opacity-50 active:scale-[0.98]"
              >
                {loading ? "Initializing..." : "Register Strategic Asset"}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs font-medium text-[var(--lg-text-muted)] opacity-60 flex items-center justify-center gap-2">
            Already registered? 
            <Link 
              to="/login"
              className="font-black text-[var(--lg-accent)] hover:text-[var(--lg-accent-hover)] transition-colors uppercase tracking-widest"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
