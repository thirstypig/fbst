// client/src/pages/Leagues.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { adminCreateLeague, getLeagues, getMe, type LeagueListItem } from "../api";

import PageHeader from "../components/ui/PageHeader";

// ... existing imports



export default function Leagues() {
  const [meLoading, setMeLoading] = useState(true);
  const [me, setMe] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<LeagueListItem[]>([]);

  // Admin create form (simple)
  const [name, setName] = useState("OGBA");
  const [season, setSeason] = useState<number>(2025);
  const [draftMode, setDraftMode] = useState<"AUCTION" | "DRAFT">("AUCTION");
  const [isPublic, setIsPublic] = useState(false);
  const [copyFromId, setCopyFromId] = useState<number | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      // If not logged in, show a clean state (do not treat as an error).
      const meResp = await getMe().catch(() => ({ user: null }));
      setMe(meResp.user ?? null);

      if (!meResp.user) {
        setLeagues([]);
        return;
      }

      const leaguesResp = await getLeagues();
      setLeagues(leaguesResp.leagues ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load leagues.");
    } finally {
      setLoading(false);
      setMeLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAdminUser = Boolean(me?.isAdmin);

  const sorted = useMemo(() => {
    if (!Array.isArray(leagues)) {
      console.warn("Leagues is not an array:", leagues);
      return [];
    }
    const xs = [...leagues];
    xs.sort((a, b) => {
      if (b.season !== a.season) return b.season - a.season;
      return String(a.name).localeCompare(String(b.name));
    });
    return xs;
  }, [leagues]);

  async function onCreateLeague(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(null);
      await adminCreateLeague({
        name: String(name || "").trim(),
        season: Number(season),
        draftMode,
        isPublic,
        copyFromLeagueId: copyFromId || undefined,
      });
      await refresh();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create league.");
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--fbst-surface-primary)]">
      <PageHeader 
        title="Leagues Hub" 
        subtitle="Select a league to manage or access commissioner tools."
        rightElement={
             <button
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-widest text-white/80 hover:bg-white/10 transition-all hover:scale-105"
              onClick={refresh}
            >
              Sync Data
            </button>
        }
      />

      <div className="px-10 py-8 mx-auto max-w-5xl w-full">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 liquid-glass">
          {meLoading ? (
            <div className="text-sm text-[var(--fbst-text-muted)] font-bold uppercase tracking-widest animate-pulse">Loading identity…</div>
          ) : !me ? (
            <div className="text-sm text-[var(--fbst-text-muted)] font-bold uppercase tracking-widest leading-relaxed">
              Connectivity: <span className="text-red-400">GUEST</span>
              <p className="mt-1 text-[10px] opacity-60">Authorize via the command center to access personal leagues.</p>
            </div>
          ) : (
            <div className="text-sm text-[var(--fbst-text-muted)] font-black uppercase tracking-widest flex items-center justify-between">
              <div>
                Identity: <span className="text-[var(--fbst-text-primary)]">{me.email}</span>
              </div>
              {me.isAdmin ? <span className="rounded-full bg-[var(--fbst-accent)]/20 border border-[var(--fbst-accent)]/30 px-3 py-1 text-[10px] text-[var(--fbst-accent)]">ADMINISTRATOR</span> : null}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-lg font-semibold text-white">Available leagues</div>
            {/* Refresh moved to header */}
          </div>

          {!me ? (
            <div className="py-10 text-center text-sm text-white/60">Sign in to see your leagues.</div>
          ) : loading ? (
            <div className="py-6 text-center text-sm text-white/60">Loading…</div>
          ) : error ? (
            <div className="py-6 text-center text-sm text-red-300">{error}</div>
          ) : sorted.length === 0 ? (
            <div className="py-6 text-center text-sm text-white/60">No leagues found.</div>
          ) : (
            <div className="space-y-3">
              {sorted.map((l) => {
                const access = (l as any).access;
                const role = access?.type === "MEMBER" ? access.role : null;
                const isPublicViewer = access?.type === "PUBLIC";
                const canCommissioner = role === "COMMISSIONER" || Boolean(me?.isAdmin);

                return (
                  <div
                    key={l.id}
                    className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.02] liquid-glass px-6 py-5 hover:bg-white/[0.04] transition-all group"
                  >
                    <div className="min-w-0">
                      <div className="text-lg font-black text-[var(--fbst-text-primary)] tracking-tight">
                        {l.name} <span className="text-[var(--fbst-text-muted)] opacity-50 ml-2 font-bold font-mono">({l.season})</span>
                      </div>

                      <div className="mt-1 text-[10px] uppercase font-black tracking-widest text-[var(--fbst-text-muted)] flex items-center gap-3">
                        <span className="bg-white/5 px-2 py-0.5 rounded-md">{l.draftMode}</span>
                        {role ? (
                          <span className="text-[var(--fbst-accent)]">ROLE: {role}</span>
                        ) : isPublicViewer ? (
                          <span className="text-sky-400">PUBLIC ACCESS</span>
                        ) : (
                          <span className="text-red-400">NO ACCESS</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {role && (
                          <Link
                            to={`/leagues/${l.id}/keepers`}
                            className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/20 transition-all"
                          >
                            Keepers
                          </Link>
                      )}
                      {canCommissioner ? (
                        <Link
                          to={`/commissioner/${l.id}`}
                          className="rounded-xl bg-[var(--fbst-accent)] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:brightness-110 shadow-lg shadow-red-500/20 transition-all"
                        >
                          Commissioner
                        </Link>
                      ) : (
                        <button
                          className="cursor-not-allowed rounded-xl bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/20 border border-white/5"
                          title="You are not a commissioner for this league."
                          disabled
                        >
                          Commissioner
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isAdminUser ? (
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-8 liquid-glass">
            <div className="mb-6 text-xl font-black uppercase tracking-tighter text-[var(--fbst-text-heading)]">Orchestrator: New League</div>

            <form onSubmit={onCreateLeague} className="grid gap-6 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)] mb-2">Identifier</label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[var(--fbst-accent)] transition-all font-bold"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. OGBA 2025"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)] mb-2">Cycle</label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[var(--fbst-accent)] transition-all font-bold font-mono"
                  value={season}
                  type="number"
                  onChange={(e) => setSeason(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)] mb-2">Protocol</label>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[var(--fbst-accent)] transition-all font-bold"
                  value={draftMode}
                  onChange={(e) => setDraftMode(e.target.value as any)}
                >
                  <option value="AUCTION">AUCTION</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
              </div>

              <div className="md:col-span-2">
                 <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)] mb-2">Inheritance (Copy From)</label>
                 <select 
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[var(--fbst-accent)] transition-all font-bold"
                    onChange={(e) => setCopyFromId(Number(e.target.value) || null)}
                 >
                    <option value="">Start Fresh (Default)</option>
                    {Array.isArray(leagues) && leagues.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.season})</option>
                    ))}
                 </select>
                 {copyFromId && <div className="mt-2 text-[10px] text-sky-400 font-bold uppercase tracking-wider">Settings, Members, and Rules will be cloned.</div>}
              </div>

              <div className="md:col-span-2 flex items-center gap-3 pt-4">
                <input 
                  id="isPublic" 
                  type="checkbox" 
                  checked={isPublic} 
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-5 h-5 rounded-lg border-white/10 bg-white/5 text-[var(--fbst-accent)] focus:ring-0"
                />
                <label htmlFor="isPublic" className="text-xs font-black uppercase tracking-widest text-[var(--fbst-text-muted)]">
                  Public Manifest
                </label>
              </div>

              <div className="md:col-span-4 flex justify-end mt-4">
                <button type="submit" className="rounded-2xl bg-[var(--fbst-accent)] px-8 py-4 text-xs font-black uppercase tracking-widest text-white hover:brightness-110 shadow-xl shadow-red-500/20 transition-all">
                  Initialize League
                </button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="mt-12 text-center text-[10px] font-black uppercase tracking-[0.3em] text-[var(--fbst-text-muted)] opacity-30">
          Baseline workflow: Leagues Hub → Commissioner Command Center
        </div>
      <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-8 liquid-glass">
          <div className="mb-6 text-xl font-black uppercase tracking-tighter text-[var(--fbst-text-heading)]">Orchestrator: Data Ingestion</div>
          <div className="text-xs text-[var(--fbst-text-muted)] font-bold uppercase tracking-widest mb-8 leading-relaxed">
             Import a standardized CSV Manifest to populate league rosters and costs.
             <p className="mt-1 opacity-60">Required Headers: Player, MLB, Team, Cost, Keeper, Pos</p>
          </div>
          
          <CsvUploader leagues={sorted} onRefresh={refresh} />
      </div>
      </div>
    </div>
  );
}

// Subcomponent for CSV Upload
function CsvUploader({ leagues, onRefresh }: { leagues: any[]; onRefresh: () => void }) {
  const [leagueId, setLeagueId] = useState<number | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!leagueId || !file) return;

    setLoading(true);
    setStatus(null);
    setError(null);

    try {
        const text = await file.text();
        // Dynamic import to avoid circular dependencies if any? No, import from api directly.
        const { adminImportRosters } = await import("../api"); 
        
        const result = await adminImportRosters(Number(leagueId), text);
        
        setStatus(`ORCHESTRATION COMPLETE: ${result.count} ENTRIES INGESTED`);
        if (result.errors?.length) {
            setError(`Ingestion Warnings:\n${result.errors.join("\n")}`);
        }
        setFile(null);
        // Clear file input visually? Harder with react state but ok.
        (document.getElementById("csvInput") as HTMLInputElement).value = "";
        
        onRefresh();
    } catch (err: any) {
        setError(err?.message || "Ingestion failed");
    } finally {
        setLoading(false);
    }
  }

  return (
    <form onSubmit={handleUpload} className="space-y-6 max-w-xl">
        <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)] mb-2">Target League Manifest</label>
            <select 
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[var(--fbst-accent)] transition-all font-bold"
                value={leagueId}
                onChange={e => setLeagueId(Number(e.target.value) || "")}
                required
            >
                <option value="">Select Target...</option>
                {leagues.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.season})</option>
                ))}
            </select>
        </div>

        <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)] mb-2">Manifest File (CSV)</label>
            <input 
                id="csvInput"
                type="file" 
                accept=".csv"
                className="block w-full text-xs text-white/70 file:mr-6 file:py-3 file:px-6 file:rounded-2xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-white/10 file:text-white hover:file:bg-white/20 transition-all cursor-pointer"
                onChange={e => setFile(e.target.files?.[0] || null)}
                required
            />
        </div>

        <div className="pt-4">
          <button 
              type="submit" 
              disabled={loading || !leagueId || !file}
              className="w-full md:w-auto rounded-2xl bg-emerald-500 px-8 py-4 text-xs font-black uppercase tracking-widest text-white hover:brightness-110 shadow-xl shadow-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
              {loading ? "PROCESSING MANIFEST..." : "UPLOAD MANIFEST"}
          </button>
        </div>

        {status && <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">{status}</div>}
        {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest whitespace-pre-wrap">{error}</div>}
    </form>
  );
}
