// client/src/pages/Period.tsx
import { useEffect, useState } from "react";
import {
  getPeriodStandings,
  type PeriodStandingsResponse,
} from "../lib/api";

type PeriodRow = PeriodStandingsResponse["rows"][number];

const PERIOD_OPTIONS = [1, 2, 3, 4, 5, 6];

export default function PeriodPage() {
  const [activePeriod, setActivePeriod] = useState<number>(1);
  const [data, setData] = useState<PeriodStandingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await getPeriodStandings(activePeriod);
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        console.error("Failed to load period standings", err);
        if (!cancelled) {
          setError("Failed to load period standings");
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [activePeriod]);

  const rows: PeriodRow[] = data?.rows ?? [];

  return (
    <div>
      <header className="flex items-baseline justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Period standings
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            7×7 roto-style points by period (higher is better).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            Period
          </span>
          <div className="inline-flex rounded-full bg-slate-900 p-1 border border-slate-700">
            {PERIOD_OPTIONS.map((p) => {
              const selected = p === activePeriod;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setActivePeriod(p)}
                  className={[
                    "px-3 py-1 text-xs rounded-full transition-colors",
                    selected
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-300 hover:bg-slate-800",
                  ].join(" ")}
                >
                  P{p}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-4 text-red-400 text-sm bg-red-950/40 border border-red-700 px-3 py-2 rounded">
          {error}
        </div>
      )}

      <section className="mt-4">
        {loading && (
          <div className="text-sm text-slate-300">Loading standings…</div>
        )}

        {!loading && rows.length === 0 && !error && (
          <div className="text-sm text-slate-400">
            No data found for this period.
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950/60">
            <table className="min-w-full text-sm border-collapse">
              <thead className="bg-slate-900">
                <tr className="text-slate-300">
                  <th className="px-3 py-2 text-left border border-slate-800 w-10">
                    #
                  </th>
                  <th className="px-3 py-2 text-left border border-slate-800">
                    Team
                  </th>
                  <th className="px-3 py-2 text-left border border-slate-800">
                    Owner
                  </th>
                  <th className="px-3 py-2 text-right border border-slate-800">
                    R
                  </th>
                  <th className="px-3 py-2 text-right border border-slate-800">
                    HR
                  </th>
                  <th className="px-3 py-2 text-right border border-slate-800">
                    RBI
                  </th>
                  <th className="px-3 py-2 text-right border border-slate-800">
                    SB
                  </th>
                  <th className="px-3 py-2 text-right border border-slate-800">
                    W
                  </th>
                  <th className="px-3 py-2 text-right border border-slate-800">
                    S
                  </th>
                  <th className="px-3 py-2 text-right border border-slate-800">
                    K
                  </th>
                  <th className="px-3 py-2 text-right border border-slate-800">
                    Pts
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={row.teamId}
                    className={
                      idx % 2 === 0 ? "bg-slate-950" : "bg-slate-900/60"
                    }
                  >
                    <td className="px-3 py-2 text-left border border-slate-800">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2 text-left border border-slate-800">
                      {row.teamName}
                    </td>
                    <td className="px-3 py-2 text-left border border-slate-800 text-slate-300">
                      {row.owner ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right border border-slate-800">
                      {row.R}
                    </td>
                    <td className="px-3 py-2 text-right border border-slate-800">
                      {row.HR}
                    </td>
                    <td className="px-3 py-2 text-right border border-slate-800">
                      {row.RBI}
                    </td>
                    <td className="px-3 py-2 text-right border border-slate-800">
                      {row.SB}
                    </td>
                    <td className="px-3 py-2 text-right border border-slate-800">
                      {row.W}
                    </td>
                    <td className="px-3 py-2 text-right border border-slate-800">
                      {row.S}
                    </td>
                    <td className="px-3 py-2 text-right border border-slate-800">
                      {row.K}
                    </td>
                    <td className="px-3 py-2 text-right border border-slate-800 font-semibold">
                      {row.totalPoints.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
