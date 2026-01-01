// client/src/pages/Commissioner.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { API_BASE, getLeagues, getMe, type LeagueListItem } from "../api";

type CommissionerUser = {
  id: number;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
};

type CommissionerMembership = {
  id: number;
  leagueId: number;
  userId: number;
  role: "COMMISSIONER" | "OWNER" | "VIEWER";
  user: CommissionerUser;
};

type CommissionerTeam = {
  id: number;
  leagueId: number;
  name: string;
  code?: string | null;
  owner?: string | null;
  budget?: number | null;
  ownerUserId?: number | null;
  ownerUser?: CommissionerUser | null;
};

type CommissionerLeague = {
  id: number;
  name: string;
  season: number;
  draftMode: "AUCTION" | "DRAFT";
  draftOrder?: "SNAKE" | "LINEAR" | null;
  isPublic: boolean;
  publicSlug?: string | null;
};

type CommissionerOverviewResponse = {
  league: any;
  teams?: any[];
  memberships?: any[];
};

type RosterRow = {
  id: number;
  teamId: number;
  playerId: number;
  acquiredAt?: string;
  releasedAt?: string | null;
  source?: string | null;
  price?: number | null;
  player?: {
    id: number;
    mlbId?: number | null;
    name: string;
    posPrimary: string;
    posList: string;
  };
};

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });

  const text = await res.text();
  const json = (() => {
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  })();

  if (!res.ok) {
    const msg = (json && (json.error || json.message)) || (text ? text.slice(0, 180) : `HTTP ${res.status}`);
    throw new Error(msg);
  }

  return (json ?? ({} as any)) as T;
}

function normalizeOverview(resp: CommissionerOverviewResponse): {
  league: CommissionerLeague;
  teams: CommissionerTeam[];
  memberships: CommissionerMembership[];
} {
  // Support either shape:
  // A) { league, teams, memberships }
  // B) { league: { ..., teams: [...], memberships: [...] } }
  const leagueRaw = resp?.league ?? {};
  const teamsRaw = (resp as any)?.teams ?? leagueRaw?.teams ?? [];
  const membershipsRaw = (resp as any)?.memberships ?? leagueRaw?.memberships ?? [];

  const league: CommissionerLeague = {
    id: Number(leagueRaw.id),
    name: String(leagueRaw.name ?? ""),
    season: Number(leagueRaw.season ?? 0),
    draftMode: leagueRaw.draftMode === "DRAFT" ? "DRAFT" : "AUCTION",
    draftOrder: leagueRaw.draftOrder ?? null,
    isPublic: Boolean(leagueRaw.isPublic),
    publicSlug: leagueRaw.publicSlug ?? null,
  };

  const teams: CommissionerTeam[] = (teamsRaw ?? []).map((t: any) => ({
    id: Number(t.id),
    leagueId: Number(t.leagueId),
    name: String(t.name ?? ""),
    code: t.code ?? null,
    owner: t.owner ?? null,
    budget: t.budget ?? null,
    ownerUserId: t.ownerUserId ?? null,
    ownerUser: t.ownerUser ?? null,
  }));

  const memberships: CommissionerMembership[] = (membershipsRaw ?? []).map((m: any) => ({
    id: Number(m.id),
    leagueId: Number(m.leagueId),
    userId: Number(m.userId),
    role: m.role,
    user: m.user,
  }));

  return { league, teams, memberships };
}

export default function Commissioner() {
  const { leagueId } = useParams();
  const lid = Number(leagueId);

  const [me, setMe] = useState<any>(null);
  const [leagues, setLeagues] = useState<LeagueListItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<{
    league: CommissionerLeague | null;
    teams: CommissionerTeam[];
    memberships: CommissionerMembership[];
  }>({ league: null, teams: [], memberships: [] });

  // Create team form
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [teamBudget, setTeamBudget] = useState<number>(400);

  // Add member form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"OWNER" | "VIEWER" | "COMMISSIONER">("OWNER");

  // Assign owner form
  const [ownerTeamId, setOwnerTeamId] = useState<number | "">("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");

  // Roster management
  const [rosterTeamId, setRosterTeamId] = useState<number | "">("");
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [rosterRows, setRosterRows] = useState<RosterRow[]>([]);

  const [pMlbId, setPMlbId] = useState<string>("");
  const [pName, setPName] = useState("");
  const [pPosPrimary, setPPosPrimary] = useState("OF");
  const [pPosList, setPPosList] = useState("OF");
  const [pPrice, setPPrice] = useState<number>(1);
  const [pSource, setPSource] = useState("manual");

  const leagueFromList = useMemo(() => (leagues ?? []).find((x) => x.id === lid) ?? null, [leagues, lid]);

  const accessRole =
    (leagueFromList as any)?.access?.type === "MEMBER" ? (leagueFromList as any).access.role : null;

  const canCommissioner = accessRole === "COMMISSIONER" || Boolean(me?.isAdmin);

  async function loadAll() {
    if (!Number.isFinite(lid)) {
      setError("Invalid leagueId.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [meResp, leaguesResp] = await Promise.all([getMe(), getLeagues()]);
      setMe(meResp.user ?? null);
      setLeagues(leaguesResp.leagues ?? []);

      // commissioner overview (server will enforce access; we also gate in UI)
      const resp = await fetchJson<CommissionerOverviewResponse>(`/commissioner/${lid}`);
      const norm = normalizeOverview(resp);
      setOverview({ league: norm.league, teams: norm.teams, memberships: norm.memberships });

      // default dropdowns
      if (norm.teams.length && ownerTeamId === "") setOwnerTeamId(norm.teams[0].id);
      if (norm.teams.length && rosterTeamId === "") setRosterTeamId(norm.teams[0].id);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load commissioner data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await loadAll();
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  async function refreshOverviewOnly() {
    const resp = await fetchJson<CommissionerOverviewResponse>(`/commissioner/${lid}`);
    const norm = normalizeOverview(resp);
    setOverview({ league: norm.league, teams: norm.teams, memberships: norm.memberships });
    return norm;
  }

  async function onCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: String(teamName || "").trim(),
        code: String(teamCode || "").trim() || undefined,
        budget: Number(teamBudget),
      };
      if (!payload.name) throw new Error("Team name is required.");

      await fetchJson(`/commissioner/${lid}/teams`, { method: "POST", body: JSON.stringify(payload) });

      setTeamName("");
      setTeamCode("");
      await refreshOverviewOnly();
    } catch (err: any) {
      setError(err?.message ?? "Create team failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const email = String(inviteEmail || "").trim().toLowerCase();
      if (!email) throw new Error("Email is required.");

      await fetchJson(`/commissioner/${lid}/members`, {
        method: "POST",
        body: JSON.stringify({ email, role: inviteRole }),
      });

      setInviteEmail("");
      await refreshOverviewOnly();
    } catch (err: any) {
      setError(err?.message ?? "Add member failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onAssignOwner(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const teamId = Number(ownerTeamId);
      if (!Number.isFinite(teamId)) throw new Error("Select a team.");
      const email = String(ownerEmail || "").trim().toLowerCase();
      if (!email) throw new Error("Owner email is required.");

      await fetchJson(`/commissioner/${lid}/teams/${teamId}/owner`, {
        method: "POST",
        body: JSON.stringify({ email, ownerName: String(ownerName || "").trim() || undefined }),
      });

      setOwnerEmail("");
      setOwnerName("");
      await refreshOverviewOnly();
    } catch (err: any) {
      setError(err?.message ?? "Assign owner failed.");
    } finally {
      setBusy(false);
    }
  }

  async function loadRoster(teamId: number) {
    setRosterLoading(true);
    setRosterError(null);
    try {
      const resp = await fetchJson<{ roster: RosterRow[] }>(`/commissioner/${lid}/teams/${teamId}/roster`);
      setRosterRows(resp.roster ?? []);
    } catch (e: any) {
      setRosterError(e?.message ?? "Failed to load roster.");
      setRosterRows([]);
    } finally {
      setRosterLoading(false);
    }
  }

  useEffect(() => {
    const teamId = Number(rosterTeamId);
    if (!Number.isFinite(teamId)) return;
    loadRoster(teamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterTeamId]);

  async function onAssignPlayer(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setRosterError(null);

    try {
      const teamId = Number(rosterTeamId);
      if (!Number.isFinite(teamId)) throw new Error("Select a team.");

      const name = String(pName || "").trim();
      const posPrimary = String(pPosPrimary || "").trim();
      const posList = String(pPosList || "").trim() || posPrimary;

      if (!name) throw new Error("Player name is required.");
      if (!posPrimary) throw new Error("posPrimary is required.");

      const mlbIdStr = String(pMlbId || "").trim();
      const mlbId = mlbIdStr ? Number(mlbIdStr) : undefined;

      await fetchJson(`/commissioner/${lid}/roster/assign`, {
        method: "POST",
        body: JSON.stringify({
          teamId,
          mlbId: mlbIdStr ? mlbId : undefined,
          name,
          posPrimary,
          posList,
          price: Number(pPrice),
          source: String(pSource || "manual").trim(),
        }),
      });

      setPMlbId("");
      setPName("");
      // keep pos fields for speed
      await loadRoster(teamId);
    } catch (err: any) {
      setError(err?.message ?? "Assign player failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onReleaseRosterRow(rosterId: number) {
    setBusy(true);
    setError(null);
    setRosterError(null);
    try {
      await fetchJson(`/commissioner/${lid}/roster/release`, {
        method: "POST",
        body: JSON.stringify({ rosterId }),
      });

      const teamId = Number(rosterTeamId);
      if (Number.isFinite(teamId)) await loadRoster(teamId);
    } catch (err: any) {
      setError(err?.message ?? "Release failed.");
    } finally {
      setBusy(false);
    }
  }

  const league = overview.league;

  return (
    <div className="px-10 py-8">
      <div className="mb-6 text-center">
        <div className="text-4xl font-semibold text-white">Commissioner</div>
        <div className="mt-2 text-sm text-white/60">League setup and manual season tools (MVP).</div>
      </div>

      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex items-center justify-between">
          <Link to="/leagues" className="text-sm text-white/70 hover:text-white">
            ← Back to Leagues
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAll}
              className={cls(
                "rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/5",
                busy && "opacity-60 cursor-not-allowed"
              )}
              disabled={busy}
            >
              Refresh
            </button>
            <div className="text-xs text-white/50">leagueId: {leagueId ?? "—"}</div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
            Loading…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-red-300">
            {error}
          </div>
        ) : !me ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/70">
            You are not logged in.
          </div>
        ) : !leagueFromList ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/70">
            League not found.
          </div>
        ) : !canCommissioner ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/70">
            You are not a commissioner for this league.
          </div>
        ) : !league ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/70">
            Commissioner data not available.
          </div>
        ) : (
          <>
            {/* League header */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-white">
                    {league.name} <span className="text-white/50">({league.season})</span>
                  </div>
                  <div className="mt-1 text-sm text-white/60">
                    draftMode: {league.draftMode}
                    {league.draftMode === "DRAFT" ? ` · draftOrder: ${league.draftOrder ?? "—"}` : null}
                    <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">role: {accessRole ?? "—"}</span>
                    {me.isAdmin ? <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">Admin</span> : null}
                  </div>
                </div>

                <div className="text-right text-xs text-white/50">
                  <div>Public: {league.isPublic ? "Yes" : "No"}</div>
                  <div>Slug: {league.publicSlug ?? "—"}</div>
                </div>
              </div>
            </div>

            {/* Grid */}
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Members */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-lg font-semibold text-white">Members</div>
                  <div className="text-xs text-white/50">{overview.memberships.length} total</div>
                </div>

                <div className="space-y-2">
                  {overview.memberships.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm text-white">
                          {m.user?.name || m.user?.email || `User ${m.userId}`}
                        </div>
                        <div className="truncate text-xs text-white/50">{m.user?.email}</div>
                      </div>
                      <div className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80">
                        {m.role}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="mb-2 text-sm font-semibold text-white">Add member (by email)</div>
                  <form onSubmit={onInvite} className="grid gap-2 md:grid-cols-3">
                    <input
                      className="md:col-span-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                      placeholder="owner@email.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                    <select
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      title={!me.isAdmin ? "Commissioner role requires Admin." : "Select role"}
                    >
                      <option value="OWNER">OWNER</option>
                      <option value="VIEWER">VIEWER</option>
                      <option value="COMMISSIONER" disabled={!me.isAdmin}>
                        COMMISSIONER (admin only)
                      </option>
                    </select>

                    <div className="md:col-span-3 flex justify-end">
                      <button
                        type="submit"
                        className={cls(
                          "rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15",
                          busy && "opacity-60 cursor-not-allowed"
                        )}
                        disabled={busy}
                      >
                        Add
                      </button>
                    </div>
                  </form>

                  <div className="mt-2 text-xs text-white/50">
                    Note: users must log in once before they can be added by email.
                  </div>
                </div>
              </div>

              {/* Teams */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-lg font-semibold text-white">Teams</div>
                  <div className="text-xs text-white/50">{overview.teams.length} total</div>
                </div>

                <div className="space-y-2">
                  {overview.teams.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm text-white">
                          {t.name}{" "}
                          <span className="text-white/50">
                            {t.code ? `(${t.code})` : ""}
                            {t.budget != null ? ` · $${t.budget}` : ""}
                          </span>
                        </div>
                        <div className="truncate text-xs text-white/50">
                          Owner: {t.ownerUser?.email || t.owner || "—"}
                        </div>
                      </div>
                      <div className="text-xs text-white/40">id: {t.id}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="mb-2 text-sm font-semibold text-white">Create team</div>
                  <form onSubmit={onCreateTeam} className="grid gap-2 md:grid-cols-3">
                    <input
                      className="md:col-span-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                      placeholder="Team name"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                    />
                    <input
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                      placeholder="Code (OGBA)"
                      value={teamCode}
                      onChange={(e) => setTeamCode(e.target.value)}
                    />

                    <div className="md:col-span-2">
                      <label className="block text-xs text-white/60">Budget</label>
                      <input
                        className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                        type="number"
                        value={teamBudget}
                        onChange={(e) => setTeamBudget(Number(e.target.value))}
                      />
                    </div>

                    <div className="md:col-span-1 flex items-end justify-end">
                      <button
                        type="submit"
                        className={cls(
                          "w-full rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15",
                          busy && "opacity-60 cursor-not-allowed"
                        )}
                        disabled={busy}
                      >
                        Create
                      </button>
                    </div>
                  </form>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="mb-2 text-sm font-semibold text-white">Assign team owner (by email)</div>

                  <form onSubmit={onAssignOwner} className="grid gap-2 md:grid-cols-3">
                    <select
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                      value={ownerTeamId}
                      onChange={(e) => setOwnerTeamId(e.target.value ? Number(e.target.value) : "")}
                    >
                      <option value="">Select team…</option>
                      {overview.teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.code ? `(${t.code})` : ""}
                        </option>
                      ))}
                    </select>

                    <input
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                      placeholder="owner@email.com"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                    />

                    <input
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                      placeholder="Owner display name (optional)"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                    />

                    <div className="md:col-span-3 flex justify-end">
                      <button
                        type="submit"
                        className={cls(
                          "rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15",
                          busy && "opacity-60 cursor-not-allowed"
                        )}
                        disabled={busy}
                      >
                        Assign owner
                      </button>
                    </div>
                  </form>

                  <div className="mt-2 text-xs text-white/50">
                    This also auto-adds the user as a league member (OWNER) if they weren’t already.
                  </div>
                </div>
              </div>
            </div>

            {/* Manual roster setup */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-lg font-semibold text-white">Manual roster setup (MVP)</div>
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                    value={rosterTeamId}
                    onChange={(e) => setRosterTeamId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">Select team…</option>
                    {overview.teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.code ? `(${t.code})` : ""}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      const teamId = Number(rosterTeamId);
                      if (Number.isFinite(teamId)) loadRoster(teamId);
                    }}
                    className={cls(
                      "rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/5",
                      (busy || rosterLoading) && "opacity-60 cursor-not-allowed"
                    )}
                    disabled={busy || rosterLoading}
                  >
                    Refresh roster
                  </button>
                </div>
              </div>

              {rosterError ? (
                <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-red-300">
                  {rosterError}
                </div>
              ) : null}

              <div className="grid gap-5 lg:grid-cols-2">
                {/* Assign player form */}
                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="mb-2 text-sm font-semibold text-white">Assign player to selected team</div>
                  <form onSubmit={onAssignPlayer} className="grid gap-2 md:grid-cols-2">
                    <input
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                      placeholder="MLB ID (optional)"
                      value={pMlbId}
                      onChange={(e) => setPMlbId(e.target.value)}
                    />
                    <input
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                      placeholder="Player name (required)"
                      value={pName}
                      onChange={(e) => setPName(e.target.value)}
                    />

                    <input
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                      placeholder="posPrimary (e.g., OF)"
                      value={pPosPrimary}
                      onChange={(e) => setPPosPrimary(e.target.value)}
                    />
                    <input
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                      placeholder="posList (e.g., OF/1B)"
                      value={pPosList}
                      onChange={(e) => setPPosList(e.target.value)}
                    />

                    <div>
                      <label className="block text-xs text-white/60">Price</label>
                      <input
                        className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                        type="number"
                        value={pPrice}
                        onChange={(e) => setPPrice(Number(e.target.value))}
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-white/60">Source</label>
                      <input
                        className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                        value={pSource}
                        onChange={(e) => setPSource(e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-2 flex justify-end">
                      <button
                        type="submit"
                        className={cls(
                          "rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15",
                          (busy || rosterLoading) && "opacity-60 cursor-not-allowed"
                        )}
                        disabled={busy || rosterLoading}
                      >
                        Assign
                      </button>
                    </div>
                  </form>

                  <div className="mt-2 text-xs text-white/50">
                    Assign will release any active roster row for that player, then create a new one for this team.
                  </div>
                </div>

                {/* Roster list */}
                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold text-white">Active roster</div>
                    <div className="text-xs text-white/50">
                      {rosterLoading ? "Loading…" : `${rosterRows.length} players`}
                    </div>
                  </div>

                  {rosterRows.length === 0 ? (
                    <div className="py-8 text-center text-sm text-white/60">
                      {rosterLoading ? "Loading…" : "No players assigned yet."}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {rosterRows.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm text-white">
                              {r.player?.name ?? `Player ${r.playerId}`}
                              <span className="ml-2 text-white/50">
                                {r.player?.posPrimary ? `· ${r.player.posPrimary}` : ""}
                                {r.player?.posList ? ` (${r.player.posList})` : ""}
                              </span>
                            </div>
                            <div className="truncate text-xs text-white/50">
                              mlbId: {r.player?.mlbId ?? "—"} · price: {r.price ?? "—"} · source: {r.source ?? "—"}
                            </div>
                          </div>

                          <button
                            onClick={() => onReleaseRosterRow(r.id)}
                            className={cls(
                              "shrink-0 rounded-xl border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5",
                              busy && "opacity-60 cursor-not-allowed"
                            )}
                            disabled={busy}
                            title="Release this player (sets releasedAt)"
                          >
                            Release
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
