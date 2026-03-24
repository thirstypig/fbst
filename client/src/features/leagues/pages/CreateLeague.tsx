import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Copy, Check } from "lucide-react";
import { Button } from "../../../components/ui/button";
import PageHeader from "../../../components/ui/PageHeader";
import { useToast } from "../../../contexts/ToastContext";
import { createLeague, type CreateLeagueInput } from "../api";

export default function CreateLeague() {
  const nav = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState<CreateLeagueInput>({
    name: "",
    season: new Date().getFullYear(),
    leagueType: "NL",
    draftMode: "AUCTION",
    isPublic: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ leagueId: number; inviteCode: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast("League name is required", "error"); return; }
    setSubmitting(true);
    try {
      const res = await createLeague(form);
      setResult({ leagueId: res.league.id, inviteCode: res.inviteCode });
      toast("League created!", "success");
    } catch (err) {
      toast((err as Error)?.message || "Failed to create league", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const copyInviteCode = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (result) {
    return (
      <div className="max-w-xl mx-auto px-4 py-6 md:px-6 md:py-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <Trophy size={32} className="text-emerald-500" />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--lg-text-heading)] mb-2">League Created!</h1>
          <p className="text-sm text-[var(--lg-text-muted)]">Share the invite code below with your league members.</p>
        </div>

        <div className="rounded-2xl border border-[var(--lg-border-subtle)] bg-[var(--lg-tint)] p-6 mb-6">
          <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--lg-text-muted)] mb-2">Invite Code</div>
          <div className="flex items-center gap-3">
            <code className="flex-1 px-4 py-3 rounded-xl bg-[var(--lg-bg-card)] border border-[var(--lg-border-faint)] text-sm font-mono font-bold text-[var(--lg-text-primary)] tracking-wider select-all">
              {result.inviteCode}
            </code>
            <Button variant="outline" size="sm" onClick={copyInviteCode}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <Button onClick={() => nav(`/commissioner/${result.leagueId}`)}>
            Set Up League
          </Button>
          <Button variant="outline" onClick={() => nav("/")}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 md:px-6 md:py-10">
      <PageHeader title="Create a League" subtitle="Set up a new fantasy league. You'll be the commissioner." />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* League Info */}
        <div className="rounded-2xl border border-[var(--lg-border-subtle)] bg-[var(--lg-tint)] p-5 space-y-4">
          <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--lg-text-muted)]">League Info</div>

          <div>
            <label className="block text-xs font-medium text-[var(--lg-text-secondary)] mb-1">League Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g., OGBA Fantasy Baseball"
              className="w-full h-10 px-3 rounded-xl bg-[var(--lg-bg-card)] border border-[var(--lg-border-faint)] text-sm text-[var(--lg-text-primary)] placeholder:text-[var(--lg-text-muted)] outline-none focus:border-[var(--lg-accent)] transition-colors"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--lg-text-secondary)] mb-1">Season Year</label>
              <input
                type="number"
                value={form.season}
                onChange={e => setForm(f => ({ ...f, season: Number(e.target.value) }))}
                min={2020}
                max={2100}
                className="w-full h-10 px-3 rounded-xl bg-[var(--lg-bg-card)] border border-[var(--lg-border-faint)] text-sm text-[var(--lg-text-primary)] outline-none focus:border-[var(--lg-accent)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--lg-text-secondary)] mb-1">League Type</label>
              <select
                value={form.leagueType}
                onChange={e => setForm(f => ({ ...f, leagueType: e.target.value as "NL" | "AL" | "MIXED" }))}
                className="w-full h-10 px-3 rounded-xl bg-[var(--lg-bg-card)] border border-[var(--lg-border-faint)] text-sm text-[var(--lg-text-primary)] outline-none focus:border-[var(--lg-accent)] transition-colors cursor-pointer"
              >
                <option value="NL">NL Only</option>
                <option value="AL">AL Only</option>
                <option value="MIXED">Mixed (Both Leagues)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Format */}
        <div className="rounded-2xl border border-[var(--lg-border-subtle)] bg-[var(--lg-tint)] p-5 space-y-4">
          <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--lg-text-muted)]">Format</div>

          <div>
            <label className="block text-xs font-medium text-[var(--lg-text-secondary)] mb-2">Draft Type</label>
            <div className="grid grid-cols-2 gap-3">
              {(["AUCTION", "DRAFT"] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, draftMode: mode }))}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    form.draftMode === mode
                      ? "border-[var(--lg-accent)] bg-[var(--lg-accent)]/10 text-[var(--lg-accent)]"
                      : "border-[var(--lg-border-faint)] bg-[var(--lg-bg-card)] text-[var(--lg-text-muted)] hover:border-[var(--lg-accent)]/30"
                  }`}
                >
                  <div className="text-sm font-semibold">{mode === "AUCTION" ? "Auction" : "Snake Draft"}</div>
                  <div className="text-[10px] mt-0.5 opacity-70">
                    {mode === "AUCTION" ? "Budget-based bidding on all players" : "Turn-based pick order"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-[var(--lg-text-muted)] italic">
            Scoring: 10-category Rotisserie (R, HR, RBI, SB, AVG | W, SV, K, ERA, WHIP)
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={submitting || !form.name.trim()}>
          {submitting ? "Creating..." : "Create League"}
        </Button>
      </form>
    </div>
  );
}
