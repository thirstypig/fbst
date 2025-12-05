// client/src/pages/AuctionValues.tsx
import React, { useEffect, useMemo, useState } from "react";
import { getAuctionValues, type AuctionValueRow } from "@/lib/api";

type PlayerKind = "all" | "hitters" | "pitchers";

function isPitcher(pos: string | undefined): boolean {
  if (!pos) return false;
  const p = pos.toUpperCase();
  return p === "P" || p.endsWith("P"); // P, SP, RP, etc.
}

const AuctionValues: React.FC = () => {
  const [rows, setRows] = useState<AuctionValueRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<PlayerKind>("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getAuctionValues();
        if (!cancelled) setRows(data);
      } catch (err) {
        console.error("Failed to load auction values", err);
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load auction values"
          );
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

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const nameMatch = r.name
          .toLowerCase()
          .includes(search.trim().toLowerCase());

        let kindMatch = true;
        if (kind === "hitters") kindMatch = !isPitcher(r.pos);
        if (kind === "pitchers") kindMatch = isPitcher(r.pos);

        return nameMatch && kindMatch;
      }),
    [rows, search, kind]
  );

  const maxValue = useMemo(
    () =>
      filtered.reduce((max, r) => {
        return r.value != null && r.value > max ? r.value : max;
      }, 0),
    [filtered]
  );

  return (
    // NOTE: no <Layout> here – Layout is applied by the router via <Outlet />
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-100">
          2025 Auction Values
        </h1>
        <p className="text-sm text-slate-400 max-w-xl">
          Dollar values from the 2025 OGBA auction sheet. Filter by name and
          hitter/pitcher. Values are static from the CSV.
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          className="rounded-md bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
          placeholder="Filter by player name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="inline-flex rounded-full bg-slate-900/60 p-1 border border-slate-700">
          <button
            type="button"
            onClick={() => setKind("all")}
            className={`px-3 py-1 text-xs font-medium rounded-full ${
              kind === "all"
                ? "bg-blue-500 text-white"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setKind("hitters")}
            className={`px-3 py-1 text-xs font-medium rounded-full ${
              kind === "hitters"
                ? "bg-blue-500 text-white"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            Hitters
          </button>
          <button
            type="button"
            onClick={() => setKind("pitchers")}
            className={`px-3 py-1 text-xs font-medium rounded-full ${
              kind === "pitchers"
                ? "bg-blue-500 text-white"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            Pitchers
          </button>
        </div>

        {loading && (
          <span className="text-xs text-slate-400">Loading values…</span>
        )}
        {error && (
          <span className="text-xs text-red-400">
            Error loading auction values: {error}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Player</th>
              <th className="px-3 py-2 text-left font-medium">Pos</th>
              <th className="px-3 py-2 text-left font-medium">Team</th>
              <th className="px-3 py-2 text-right font-medium">Value</th>
              <th className="px-3 py-2 text-left font-medium w-48">
                Rel. Value
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map((row) => {
              const value = row.value ?? null;
              const ratio =
                value != null && maxValue > 0 ? value / maxValue : 0;

              return (
                <tr
                  key={`${row.name}-${row.pos ?? "NA"}`}
                  className="hover:bg-slate-900/60"
                >
                  <td className="px-3 py-2 text-slate-100">{row.name}</td>
                  <td className="px-3 py-2 text-slate-300">{row.pos}</td>
                  <td className="px-3 py-2 text-slate-400">
                    {row.team ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-100 tabular-nums">
                    {value != null ? value.toFixed(1) : "-"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500/80"
                        style={{ width: `${ratio * 100}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}

            {!loading && !error && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-slate-400"
                >
                  No players match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuctionValues;
