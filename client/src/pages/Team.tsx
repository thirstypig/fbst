// client/src/pages/Teams.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  getTeams,
  getPlayers,
  type Team,
  type PlayerSeasonRow,
} from "@/lib/api";

const Teams: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<PlayerSeasonRow[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [teamsData, playersData] = await Promise.all([
          getTeams(),
          getPlayers(),
        ]);

        if (cancelled) return;

        setTeams(teamsData);
        setPlayers(playersData);

        if (teamsData.length > 0) {
          setActiveTeamId(teamsData[0].id);
        }
      } catch (err: any) {
        console.error("Failed to load teams/players", err);
        if (!cancelled) {
          setError(err?.message ?? "Failed to load teams");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeTeam = useMemo(
    () => teams.find((t) => t.id === activeTeamId) ?? null,
    [teams, activeTeamId]
  );

  // Players whose CSV `team` value matches the fantasy team name
  const activeRoster: PlayerSeasonRow[] = useMemo(() => {
    if (!activeTeam) return [];
    const target = activeTeam.name.trim().toLowerCase();

    return players.filter((p) => {
      const teamName = (p.team ?? "").trim().toLowerCase();
      return teamName === target;
    });
  }, [players, activeTeam]);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-100">
          OGBA 2026 – Fantasy Baseball Stat Tool
        </h1>
        <p className="text-sm text-slate-400">
          View OGBA fantasy teams, season summaries, and each team&apos;s roster
          from the 2025 stats CSV.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-500/60 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          Failed to load teams: {error}
        </div>
      )}

      {/* Team selector */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-slate-100">Teams</h2>

        {loading && !teams.length ? (
          <p className="text-sm text-slate-400">Loading teams…</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {teams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => setActiveTeamId(team.id)}
                className={`px-4 py-2 rounded-lg border text-sm transition ${
                  team.id === activeTeamId
                    ? "bg-sky-600 border-sky-500 text-white"
                    : "bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
                }`}
              >
                {team.name.trim()}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Season summary (still stubbed) */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-slate-100">
          Season Summary{activeTeam ? ` – ${activeTeam.name.trim()}` : ""}
        </h2>

        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60">
          <table className="w-full text-xs md:text-sm border-collapse">
            <thead className="bg-slate-900 text-slate-300">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Period</th>
                <th className="px-4 py-2 text-right font-medium">Period Pts</th>
                <th className="px-4 py-2 text-right font-medium">Season Pts</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800 text-slate-100">
                <td className="px-4 py-2">Period 1</td>
                <td className="px-4 py-2 text-right">0.0</td>
                <td className="px-4 py-2 text-right">0.0</td>
              </tr>
              <tr className="text-slate-100">
                <td className="px-4 py-2 font-semibold">Season Total</td>
                <td className="px-4 py-2 text-right font-semibold">0.0</td>
                <td className="px-4 py-2 text-right font-semibold">0.0</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Roster */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-slate-100">
          Roster{activeTeam ? ` – ${activeTeam.name.trim()}` : ""}
        </h2>
        <p className="text-xs text-slate-400">
          Players are pulled from <code>/api/players</code>. Any rows with an
          empty <code>team</code> field are treated as free agents and won&apos;t
          appear here.
        </p>

        {!activeTeam && !loading && (
          <p className="text-sm text-slate-400">
            No team selected. Choose a team above.
          </p>
        )}

        {activeTeam && (
          <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60">
            <table className="w-full text-xs md:text-sm border-collapse">
              <thead className="bg-slate-900 text-slate-300">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Player</th>
                  <th className="px-4 py-2 text-center font-medium">Pos</th>
                  <th className="px-4 py-2 text-center font-medium">R</th>
                  <th className="px-4 py-2 text-center font-medium">HR</th>
                  <th className="px-4 py-2 text-center font-medium">RBI</th>
                  <th className="px-4 py-2 text-center font-medium">SB</th>
                  <th className="px-4 py-2 text-center font-medium">AVG</th>
                  <th className="px-4 py-2 text-center font-medium">W</th>
                  <th className="px-4 py-2 text-center font-medium">S</th>
                  <th className="px-4 py-2 text-center font-medium">K</th>
                  <th className="px-4 py-2 text-center font-medium">ERA</th>
                  <th className="px-4 py-2 text-center font-medium">WHIP</th>
                </tr>
              </thead>
              <tbody>
                {activeRoster.map((p, idx) => {
                  const anyPlayer = p as any;
                  const displayName: string =
                    anyPlayer.name ??
                    anyPlayer.player_name ??
                    anyPlayer.Player ??
                    anyPlayer.full_name ??
                    "";

                  return (
                    <tr
                      key={`${p.mlb_id ?? "no-id"}-${idx}`}
                      className="border-b border-slate-800 hover:bg-slate-800/40 text-slate-100"
                    >
                      <td className="px-4 py-2 text-left">
                        {displayName || "—"}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {p.pos ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-center">{p.R ?? "—"}</td>
                      <td className="px-4 py-2 text-center">{p.HR ?? "—"}</td>
                      <td className="px-4 py-2 text-center">{p.RBI ?? "—"}</td>
                      <td className="px-4 py-2 text-center">{p.SB ?? "—"}</td>
                      <td className="px-4 py-2 text-center">
                        {typeof p.AVG === "number"
                          ? p.AVG.toFixed(3)
                          : p.AVG ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-center">{p.W ?? "—"}</td>
                      <td className="px-4 py-2 text-center">{p.S ?? "—"}</td>
                      <td className="px-4 py-2 text-center">{p.K ?? "—"}</td>
                      <td className="px-4 py-2 text-center">
                        {p.ERA ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {p.WHIP ?? "—"}
                      </td>
                    </tr>
                  );
                })}

                {activeRoster.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-4 py-6 text-center text-slate-400"
                    >
                      No roster data for this team yet. Once the 2025 stats CSV
                      has a <code>team</code> value matching this fantasy team
                      name, players will appear here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default Teams;
