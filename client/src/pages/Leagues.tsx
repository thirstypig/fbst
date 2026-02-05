// client/src/pages/Leagues.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { adminCreateLeague, getLeagues, getMe, type LeagueListItem } from "../api";

import PageHeader from "../components/ui/PageHeader";

// ... existing imports

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

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
        title="Leagues" 
        subtitle="Select a league to access commissioner tools."
        rightElement={
             <button
              className={cls("rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm", "text-white/80 hover:bg-white/10 transition-colors")}
              onClick={refresh}
            >
              Refresh
            </button>
        }
      />

      <div className="px-10 py-8 mx-auto max-w-5xl w-full">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          {meLoading ? (
            <div className="text-sm text-white/60">Loading user…</div>
          ) : !me ? (
            <div className="text-sm text-white/70">
              You are not logged in. Use the top-right header control to sign in.
              <span className="ml-2 text-white/50">(You can still browse, but league access requires login.)</span>
            </div>
          ) : (
            <div className="text-sm text-white/70">
              Signed in as <span className="text-white">{me.email}</span>
              {me.isAdmin ? <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">Admin</span> : null}
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
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-white">
                        {l.name} <span className="text-white/50">({l.season})</span>
                      </div>

                      <div className="mt-1 text-xs text-white/60">
                        draftMode: {l.draftMode}
                        {role ? (
                          <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5">role: {role}</span>
                        ) : isPublicViewer ? (
                          <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5">public</span>
                        ) : (
                          <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5">no access</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {role && (
                          <Link
                            to={`/leagues/${l.id}/keepers`}
                            className="rounded-xl bg-emerald-600/80 px-3 py-2 text-sm text-white hover:bg-emerald-600"
                          >
                            Keepers
                          </Link>
                      )}
                      {canCommissioner ? (
                        <Link
                          to={`/commissioner/${l.id}`}
                          className="rounded-xl bg-sky-600/80 px-3 py-2 text-sm text-white hover:bg-sky-600"
                        >
                          Commissioner
                        </Link>
                      ) : (
                        <button
                          className="cursor-not-allowed rounded-xl bg-white/5 px-3 py-2 text-sm text-white/40"
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
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-3 text-lg font-semibold text-white">Admin: create league</div>

            <form onSubmit={onCreateLeague} className="grid gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="block text-xs text-white/60">Name</label>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs text-white/60">Season</label>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                  value={season}
                  type="number"
                  onChange={(e) => setSeason(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-xs text-white/60">Draft mode</label>
                <select
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                  value={draftMode}
                  onChange={(e) => setDraftMode(e.target.value as any)}
                >
                  <option value="AUCTION">AUCTION</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
              </div>

              <div className="md:col-span-2">
                 <label className="block text-xs text-white/60">Renewal: Copy Settings From...</label>
                 <select 
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                    onChange={(e) => setCopyFromId(Number(e.target.value) || null)}
                 >
                    <option value="">Start Fresh (Default)</option>
                    {Array.isArray(leagues) && leagues.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.season})</option>
                    ))}
                 </select>
                 {copyFromId && <div className="mt-1 text-xs text-sky-400">Teams, Members, and Rules will be copied from selected league.</div>}
              </div>

              <div className="md:col-span-2 flex items-center gap-2 pt-2">
                <input id="isPublic" type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                <label htmlFor="isPublic" className="text-sm text-white/70">
                  Public (viewer)
                </label>
              </div>

              <div className="md:col-span-4 flex justify-end">
                <button type="submit" className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15">
                  Create league
                </button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="mt-6 text-center text-xs text-white/40">
          Baseline workflow: Leagues → Commissioner (no more DevTools fetches).
        </div>
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-3 text-lg font-semibold text-white">Admin: Auction Data Import</div>
          <div className="text-sm text-white/60 mb-4">
             Upload a CSV (with header: Player, MLB, Team, Cost, Keeper, Pos) to populate rosters.
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
        
        setStatus(`Success! Imported ${result.count} entries.`);
        if (result.errors?.length) {
            setError(`Warnings:\n${result.errors.join("\n")}`);
        }
        setFile(null);
        // Clear file input visually? Harder with react state but ok.
        (document.getElementById("csvInput") as HTMLInputElement).value = "";
        
        onRefresh();
    } catch (err: any) {
        setError(err?.message || "Upload failed");
    } finally {
        setLoading(false);
    }
  }

  return (
    <form onSubmit={handleUpload} className="space-y-4 max-w-xl">
        <div>
            <label className="block text-xs text-white/60 mb-1">Target League</label>
            <select 
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                value={leagueId}
                onChange={e => setLeagueId(Number(e.target.value) || "")}
                required
            >
                <option value="">Select League...</option>
                {leagues.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.season})</option>
                ))}
            </select>
        </div>

        <div>
            <label className="block text-xs text-white/60 mb-1">CSV File</label>
            <input 
                id="csvInput"
                type="file" 
                accept=".csv"
                className="block w-full text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20"
                onChange={e => setFile(e.target.files?.[0] || null)}
                required
            />
        </div>

        <button 
            type="submit" 
            disabled={loading || !leagueId || !file}
            className="rounded-xl bg-green-600/80 px-4 py-2 text-sm text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {loading ? "Importing..." : "Upload Rosters"}
        </button>

        {status && <div className="p-3 rounded-lg bg-green-500/20 text-green-200 text-sm">{status}</div>}
        {error && <div className="p-3 rounded-lg bg-red-500/20 text-red-200 text-sm whitespace-pre-wrap">{error}</div>}
    </form>
  );
}
