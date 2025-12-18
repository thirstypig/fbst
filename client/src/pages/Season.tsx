// client/src/pages/Season.tsx
import React, { useEffect, useMemo, useState } from "react";
import { getSeasonStandings } from "../lib/api";
import { classNames } from "../lib/classNames";

type SeasonStandingsApiRow = {
  teamId: number;
  teamName: string;
  owner?: string;
  totalPoints?: number;
  periodPoints?: number[];
  // Optional P1..P10 style fields – we’ll read them via periodIds
  [key: string]: any;
};

type SeasonStandingsApiResponse = {
  periodIds: number[];
  rows: SeasonStandingsApiRow[];
};

type NormalizedSeasonRow = {
  teamId: number;
  teamName: string;
  owner?: string;
  periodPoints: number[];
  totalPoints: number;
};

function normalizeSeasonRow(
  row: SeasonStandingsApiRow,
  periodIds: number[]
): NormalizedSeasonRow {
  let periodPoints: number[] = [];

  if (Array.isArray(row.periodPoints) && row.periodPoints.length) {
    periodPoints = periodIds.map(
      (_pid, idx) => row.periodPoints![idx] ?? 0
    );
  } else {
    periodPoints = periodIds.map((pid) => {
      const key = `P${pid}`;
      const v = row[key];
      return typeof v === "number" ? v : 0;
    });
  }

  const totalPoints =
    typeof row.totalPoints === "number"
      ? row.totalPoints
      : periodPoints.reduce((sum, v) => sum + v, 0);

  return {
    teamId: row.teamId,
    teamName: row.teamName,
    owner: row.owner,
    periodPoints,
    totalPoints,
  };
}

const SeasonPage: React.FC = () => {
  const [periodIds, setPeriodIds] = useState<number[]>([]);
  const [rows, setRows] = useState<NormalizedSeasonRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const apiData =
          (await getSeasonStandings()) as SeasonStandingsApiResponse;

        if (cancelled) return;

        const pids =
          apiData.periodIds && apiData.periodIds.length
            ? apiData.periodIds
            : [1, 2, 3, 4, 5, 6];

        const normalized =
          apiData.rows?.map((row) => normalizeSeasonRow(row, pids)) ?? [];

        setPeriodIds(pids);
        setRows(normalized);
      } catch (err: any) {
        if (cancelled) return;
        console.error("Failed to load season standings", err);
        setError("Failed to load season standings");
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => b.totalPoints - a.totalPoints),
    [rows]
  );

  return (
    <div className="flex-1 min-h-screen bg-slate-950 text-slate-50">
      <main className="max-w-6xl mx-auto px-6 py-10">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight mb-1">
            Season Standings
          </h1>
          <p className="text-sm text-slate-400">
            Roto points by period for the full season (higher total is better).
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70 shadow-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/80 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 text-left w-10 text-xs font-medium uppercase tracking-wide text-slate-400">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  Team
                </th>
                {periodIds.map((pid) => (
                  <th
                    key={pid}
                    className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400"
                  >
                    P{pid}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={2 + periodIds.length + 1}
                    className="px-4 py-6 text-center text-sm text-slate-400"
                  >
                    Loading season standings…
                  </td>
                </tr>
              )}

              {!loading && sortedRows.length === 0 && (
                <tr>
                  <td
                    colSpan={2 + periodIds.length + 1}
                    className="px-4 py-6 text-center text-sm text-slate-400"
                  >
                    No season standings available.
                  </td>
                </tr>
              )}

              {!loading &&
                sortedRows.map((row, index) => {
                  const cumulative: number[] = [];
                  let running = 0;
                  row.periodPoints.forEach((pts) => {
                    running += pts;
                    cumulative.push(running);
                  });

                  return (
                    <tr
                      key={row.teamId}
                      className={classNames(
                        "border-t border-slate-800/70",
                        index % 2 === 0 ? "bg-slate-950" : "bg-slate-950/60"
                      )}
                    >
                      <td className="px-4 py-3 text-xs text-slate-400 align-top">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="text-sm font-medium text-slate-100">
                          {row.teamName}
                        </div>
                      </td>
                      {periodIds.map((pid, idx) => (
                        <td
                          key={pid}
                          className="px-3 py-3 text-right align-top text-slate-100"
                        >
                          {row.periodPoints[idx]?.toFixed(1).replace(/\.0$/, "")}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right align-top">
                        <span className="text-sm font-semibold text-slate-50">
                          {row.totalPoints.toFixed(1).replace(/\.0$/, "")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default SeasonPage;
