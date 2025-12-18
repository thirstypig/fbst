// client/src/pages/Period.tsx
import React, { useEffect, useState } from "react";
import { classNames } from "../lib/classNames";
import { getPeriodStandings } from "../api";

type CategoryId = "R" | "HR" | "RBI" | "SB" | "AVG" | "W" | "S" | "K" | "ERA" | "WHIP";

type ApiPeriodRow = {
  teamId: number;
  teamName: string;
  owner?: string;
  stats: Record<string, number>;
  points: Record<string, number>;
  totalPoints: number;
};

type ApiPeriodResponse = {
  periodId: number;
  periodName?: string;
  rows: ApiPeriodRow[];
};

type PeriodRow = {
  teamId: number;
  teamName: string;
  stats: Record<CategoryId, number>;
  points: Record<CategoryId, number>;
  totalPoints: number;
};

const PERIOD_IDS = [1, 2, 3, 4, 5, 6];

const CATEGORIES: {
  id: CategoryId;
  label: string;
  decimals: number;
  format?: (v: number) => string;
}[] = [
  { id: "R", label: "R", decimals: 0 },
  { id: "HR", label: "HR", decimals: 0 },
  { id: "RBI", label: "RBI", decimals: 0 },
  { id: "SB", label: "SB", decimals: 0 },
  { id: "AVG", label: "AVG", decimals: 3, format: (v) => v.toFixed(3).replace(/^0/, "") },
  { id: "W", label: "W", decimals: 0 },
  { id: "S", label: "S", decimals: 0 },
  { id: "K", label: "K", decimals: 0 },
  { id: "ERA", label: "ERA", decimals: 2 },
  { id: "WHIP", label: "WHIP", decimals: 3 },
];

function normalizeRow(row: ApiPeriodRow): PeriodRow {
  const stats: Record<CategoryId, number> = {
    R: 0,
    HR: 0,
    RBI: 0,
    SB: 0,
    AVG: 0,
    W: 0,
    S: 0,
    K: 0,
    ERA: 0,
    WHIP: 0,
  };

  const points: Record<CategoryId, number> = {
    R: 0,
    HR: 0,
    RBI: 0,
    SB: 0,
    AVG: 0,
    W: 0,
    S: 0,
    K: 0,
    ERA: 0,
    WHIP: 0,
  };

  for (const cat of Object.keys(stats) as CategoryId[]) {
    const s = row.stats?.[cat];
    const p = row.points?.[cat];
    stats[cat] = typeof s === "number" ? s : 0;
    points[cat] = typeof p === "number" ? p : 0;
  }

  return {
    teamId: row.teamId,
    teamName: row.teamName,
    stats,
    points,
    totalPoints: row.totalPoints ?? 0,
  };
}

function formatPoints(v: number): string {
  return v.toFixed(1).replace(/\.0$/, "");
}

function formatStat(catId: CategoryId, value: number): string {
  const cfg = CATEGORIES.find((c) => c.id === catId)!;
  if (cfg.format) return cfg.format(value);
  return value.toFixed(cfg.decimals);
}

const PeriodPage: React.FC = () => {
  const [currentPeriodId, setCurrentPeriodId] = useState<number>(1);
  const [rows, setRows] = useState<PeriodRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const apiResp = (await getPeriodStandings(currentPeriodId)) as ApiPeriodResponse;
        if (cancelled) return;

        const normalized = apiResp.rows?.map(normalizeRow) ?? [];
        normalized.sort((a, b) => b.totalPoints - a.totalPoints);
        setRows(normalized);
      } catch (err: any) {
        if (cancelled) return;
        console.error("Failed to load periods", err);
        setError("Failed to load period standings");
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [currentPeriodId]);

  return (
    <div className="flex-1 min-h-screen bg-slate-950 text-slate-50">
      <main className="max-w-6xl mx-auto px-6 py-10">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight mb-1">Period standings</h1>
          <p className="text-sm text-slate-400">Roto points by period (higher total is better).</p>
        </header>

        <section className="mb-6">
          <h2 className="text-xs font-medium tracking-[0.2em] text-slate-500 text-center mb-3 uppercase">
            Select period
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {PERIOD_IDS.map((pid) => (
              <button
                key={pid}
                type="button"
                onClick={() => setCurrentPeriodId(pid)}
                className={classNames(
                  "px-3 py-1.5 rounded-full text-sm border transition-colors",
                  currentPeriodId === pid
                    ? "bg-sky-500 text-slate-900 border-sky-400"
                    : "bg-slate-900/60 text-slate-200 border-slate-700 hover:bg-slate-800"
                )}
              >
                Period {pid}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <section>
          <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950/70 shadow-xl">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-slate-400">#</th>
                  <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-slate-400">Team</th>
                  {CATEGORIES.map((cat) => (
                    <th
                      key={cat.id}
                      className="px-3 py-3 text-right font-medium uppercase tracking-wide text-slate-400"
                    >
                      {cat.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium uppercase tracking-wide text-slate-400">Total</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={2 + CATEGORIES.length + 1} className="px-4 py-6 text-center text-sm text-slate-400">
                      Loading period standings…
                    </td>
                  </tr>
                )}

                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={2 + CATEGORIES.length + 1} className="px-4 py-6 text-center text-sm text-slate-400">
                      No data available for this period.
                    </td>
                  </tr>
                )}

                {!loading &&
                  rows.map((row, idx) => (
                    <tr key={row.teamId} className="border-t border-slate-800/70 bg-slate-950">
                      <td className="px-4 py-3 text-left text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3 text-left text-slate-100">{row.teamName}</td>

                      {CATEGORIES.map((cat) => {
                        const pts = row.points[cat.id] ?? 0;
                        const stat = row.stats[cat.id] ?? 0;

                        return (
                          <td key={cat.id} className="px-3 py-3 text-right align-top">
                            <div className="text-[11px] font-semibold text-sky-400 leading-tight">
                              {formatPoints(pts)}
                            </div>
                            <div className="text-[11px] text-slate-300 leading-tight">
                              {formatStat(cat.id, stat)}
                            </div>
                          </td>
                        );
                      })}

                      <td className="px-4 py-3 text-right align-top">
                        <div className="text-sm font-semibold text-sky-400">{formatPoints(row.totalPoints)}</div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default PeriodPage;
