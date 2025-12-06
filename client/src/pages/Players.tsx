// client/src/pages/Players.tsx
import { useEffect, useState } from "react";
import { getPlayers, type PlayerSeasonRow } from "../lib/api";

function formatNumber(
  value: number | null | undefined,
  decimals: number = 0
): string {
  if (value === null || value === undefined) return "–";
  return value.toFixed(decimals);
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<PlayerSeasonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showOnlyRostered, setShowOnlyRostered] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getPlayers();
        setPlayers(data);
      } catch (err) {
        console.error("Failed to load players", err);
        setError("Failed to load players");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Basic filtering: search by name / team / position, optional “only rostered”
  const filtered = players.filter((p) => {
    const inLeague = showOnlyRostered ? !!p.team?.trim() : true;

    if (!inLeague) return false;

    if (!search.trim()) return true;

    const q = search.trim().toLowerCase();
    const haystack = [
      p.name ?? "",
      p.team ?? "",
      p.pos ?? "",
      p.mlb_id ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });

  return (
    <>
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Players</h1>
          <p className="mt-1 text-sm text-slate-400">
            2025 OGBA player pool – hitters and pitchers with season totals.
          </p>
        </div>
      </header>

      {/* Controls */}
      <section className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, team, position…"
          className="w-full sm:w-72 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/70"
        />

        <label className="inline-flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500"
            checked={showOnlyRostered}
            onChange={(e) => setShowOnlyRostered(e.target.checked)}
          />
          Show only rostered players
        </label>
      </section>

      {/* Error */}
      {error && (
        <div className="mb-4 text-red-400 text-sm bg-red-950/40 border border-red-700 px-3 py-2 rounded">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-sm text-slate-300">Loading players…</div>
      ) : (
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="min-w-full text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-900">
              <tr>
                <th className="border border-slate-800 px-2 py-2 text-left">
                  MLB ID
                </th>
                <th className="border border-slate-800 px-2 py-2 text-left">
                  Name
                </th>
                <th className="border border-slate-800 px-2 py-2 text-left">
                  OGBA team
                </th>
                <th className="border border-slate-800 px-2 py-2 text-left">
                  Pos
                </th>
                <th className="border border-slate-800 px-2 py-2 text-right">
                  R
                </th>
                <th className="border border-slate-800 px-2 py-2 text-right">
                  HR
                </th>
                <th className="border border-slate-800 px-2 py-2 text-right">
                  RBI
                </th>
                <th className="border border-slate-800 px-2 py-2 text-right">
                  SB
                </th>
                <th className="border border-slate-800 px-2 py-2 text-right">
                  AVG
                </th>
                <th className="border border-slate-800 px-2 py-2 text-right">
                  W
                </th>
                <th className="border border-slate-800 px-2 py-2 text-right">
                  S
                </th>
                <th className="border border-slate-800 px-2 py-2 text-right">
                  K
                </th>
                <th className="border border-slate-800 px-2 py-2 text-right">
                  ERA
                </th>
                <th className="border border-slate-800 px-2 py-2 text-right">
                  WHIP
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => (
                <tr
                  key={`${row.mlb_id ?? "na"}-${index}`}
                  className="odd:bg-slate-950"
                >
                  <td className="border border-slate-800 px-2 py-1.5">
                    {row.mlb_id ?? "—"}
                  </td>
                  <td className="border border-slate-800 px-2 py-1.5">
                    {row.name && row.name.trim() !== "" ? row.name : "—"}
                  </td>
                  <td className="border border-slate-800 px-2 py-1.5">
                    {row.team && row.team.trim() !== "" ? row.team : "FA"}
                  </td>
                  <td className="border border-slate-800 px-2 py-1.5">
                    {row.pos ?? "—"}
                  </td>
                  <td className="border border-slate-800 px-2 py-1.5 text-right">
                    {formatNumber(row.R)}
                  </td>
                  <td className="border border-slate-800 px-2 py-1.5 text-right">
                    {formatNumber(row.HR)}
                  </td>
                  <td className="border border-slate-800 px-2 py-1.5 text-right">
                    {formatNumber(row.RBI)}
                  </td>
                  <td className="border border-slate-800 px-2 py-1.5 text-right">
                    {formatNumber(row.SB)}
                  </td>
                  <td className="border border-slate-800 px-2 py-1.5 text-right">
                    {formatNumber(row.AVG, 3)}
                  </td>
                  <td className="border border-slate-800 px-2 py-1.5 text-right">
                    {formatNumber(row.W)}
                  </td>
                  <td className="border border-slate-800 px-2 py-1.5 text-right">
                    {formatNumber(row.S)}
                  </td>
                  <td className="border border-slate-800 px-2 py-1.5 text-right">
                    {formatNumber(row.K)}
                  </td>
                  <td className="border border-slate-800 px-2 py-1.5 text-right">
                    {formatNumber(row.ERA, 2)}
                  </td>
                  <td className="border border-slate-800 px-2 py-1.5 text-right">
                    {formatNumber(row.WHIP, 2)}
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={14}
                    className="border border-slate-800 px-3 py-4 text-center text-sm text-slate-400"
                  >
                    No players match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
