// client/src/pages/Players.tsx
import React, { useEffect, useMemo, useState } from "react";
import { getPlayers, type PlayerSeasonRow } from "@/lib/api";

type PlayerFilter = "all" | "hitters" | "pitchers";

/**
 * Simple helper: treat anything with a "P" in the position as a pitcher.
 * (SP/RP/CL/etc. will all be considered pitchers.)
 */
function isPitcher(pos: string | null | undefined): boolean {
  if (!pos) return false;
  return pos.toUpperCase().includes("P");
}

const Players: React.FC = () => {
  const [players, setPlayers] = useState<PlayerSeasonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<PlayerFilter>("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getPlayers();
        if (!cancelled) {
          setPlayers(data);
        }
      } catch (err: any) {
        console.error("Failed to load players", err);
        if (!cancelled) {
          setError(err?.message ?? "Failed to load players");
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

  // Build OGBA team list from data
  const ogbaTeams = useMemo(() => {
    const set = new Set<string>();
    for (const p of players) {
      if (p.team) set.add(p.team);
    }
    return Array.from(set).sort();
  }, [players]);

  const filtered = useMemo(() => {
    return players.filter((p) => {
      const anyPlayer = p as any;
      const displayName: string =
        anyPlayer.name ??
        anyPlayer.player_name ??
        anyPlayer.Player ??
        anyPlayer.full_name ??
        "";

      // Search by name (case-insensitive)
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        if (!displayName.toLowerCase().includes(s)) {
          return false;
        }
      }

      // Filter by OGBA fantasy team code
      if (teamFilter !== "all" && p.team !== teamFilter) {
        return false;
      }

      // Hitters / pitchers toggle
      if (typeFilter === "hitters" && isPitcher(p.pos)) {
        return false;
      }
      if (typeFilter === "pitchers" && !isPitcher(p.pos)) {
        return false;
      }

      return true;
    });
  }, [players, search, teamFilter, typeFilter]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-100">
          2025 Player Pool
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          All OGBA players from the 2025 season stats CSV. Filter by fantasy
          team, hitter/pitcher, and name.
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by player name..."
          className="px-3 py-2 rounded-md bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />

        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="px-3 py-2 rounded-md bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="all">All OGBA teams</option>
          {ogbaTeams.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>

        <div className="inline-flex rounded-md overflow-hidden border border-slate-700 text-sm">
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-2 ${
              typeFilter === "all"
                ? "bg-sky-600 text-white"
                : "bg-slate-900 text-slate-200"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("hitters")}
            className={`px-3 py-2 border-l border-slate-700 ${
              typeFilter === "hitters"
                ? "bg-sky-600 text-white"
                : "bg-slate-900 text-slate-200"
            }`}
          >
            Hitters
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("pitchers")}
            className={`px-3 py-2 border-l border-slate-700 ${
              typeFilter === "pitchers"
                ? "bg-sky-600 text-white"
                : "bg-slate-900 text-slate-200"
            }`}
          >
            Pitchers
          </button>
        </div>
      </div>

      {/* Error / loading states */}
      {loading && (
        <p className="text-sm text-slate-400">Loading players…</p>
      )}
      {error && !loading && (
        <p className="text-sm text-red-400">
          Error loading players: {error}
        </p>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60">
          <table className="w-full text-xs md:text-sm border-collapse">
            <thead className="bg-slate-900">
              <tr className="text-slate-300">
                <th className="px-4 py-2 text-left font-medium">Player</th>
                <th className="px-4 py-2 text-center font-medium">
                  OGBA Team
                </th>
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
              {filtered.map((p, idx) => {
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
                      {p.team ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-center">{p.pos}</td>
                    <td className="px-4 py-2 text-center">{p.R}</td>
                    <td className="px-4 py-2 text-center">{p.HR}</td>
                    <td className="px-4 py-2 text-center">{p.RBI}</td>
                    <td className="px-4 py-2 text-center">{p.SB}</td>
                    <td className="px-4 py-2 text-center">
                      {typeof p.AVG === "number"
                        ? p.AVG.toFixed(3)
                        : p.AVG ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-center">{p.W}</td>
                    <td className="px-4 py-2 text-center">{p.S}</td>
                    <td className="px-4 py-2 text-center">{p.K}</td>
                    <td className="px-4 py-2 text-center">
                      {p.ERA ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {p.WHIP ?? "—"}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={13}
                    className="px-4 py-6 text-center text-slate-400"
                  >
                    No players match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Players;
