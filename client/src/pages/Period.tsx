// client/src/pages/Period.tsx
//
// Period page:
// - Uses server-computed /api/period-category-standings?periodId=...
// - TOP: "Standings" table with category POINTS (1..N; ties split) + TOTAL
// - BELOW: Per-category tables (also show full team names)
//
// Week-over-week (+/-) requires snapshot history; not implemented here.

import React, { useEffect, useMemo, useState } from "react";
import {
  getPeriodCategoryStandings,
  type PeriodCategoryStandingsResponse,
  type PeriodCategoryStandingTable,
  type PeriodCategoryKey,
} from "../lib/api";
import { classNames } from "../lib/classNames";
import { useTheme } from "../contexts/ThemeContext";
import { ThemedTable, ThemedThead } from "../components/ui/ThemedTable";
import { OGBA_TEAM_NAMES } from "../lib/ogbaTeams";
import PageHeader from "../components/ui/PageHeader";

// If you have canonical labels/dates elsewhere, replace this list.
// This is only a dropdown source.
const PERIOD_OPTIONS: Array<{ id: number; label: string }> = [
  { id: 1, label: "P1" },
  { id: 2, label: "P2" },
  { id: 3, label: "P3" },
  { id: 4, label: "P4" },
  { id: 5, label: "P5" },
  { id: 6, label: "P6" },
];

// Column order for the standings table
const STANDINGS_KEYS: PeriodCategoryKey[] = ["R", "HR", "RBI", "SB", "AVG", "W", "SV", "ERA", "WHIP", "K"];

const STANDINGS_LABELS: Record<PeriodCategoryKey, string> = {
  R: "R",
  HR: "HR",
  RBI: "RBI",
  SB: "SB",
  AVG: "AVG",
  W: "W",
  SV: "SV",
  ERA: "ERA",
  WHIP: "WHIP",
  K: "SO", // display as SO to match OGBA screenshot, while server key is K
};

function toNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmt1(n: any): string {
  const x = toNum(n);
  return x.toFixed(1).replace(/\.0$/, "");
}

function fmtValue(n: any): string {
  // Values can be large ints (counting) or ratios (AVG/ERA/WHIP).
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";

  // Heuristic: ratio stats tend to be < 10
  if (Math.abs(x) < 10 && x !== Math.floor(x)) return x.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  if (x !== Math.floor(x)) return x.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return String(Math.trunc(x));
}

function fullTeamName(teamCodeRaw: any, fallbackNameRaw?: any): string {
  const code = String(teamCodeRaw ?? "").trim().toUpperCase();
  if (code && OGBA_TEAM_NAMES[code]) return OGBA_TEAM_NAMES[code];
  const fb = String(fallbackNameRaw ?? "").trim();
  return fb || code || "—";
}

type StandingsRow = {
  teamCode: string;
  teamName: string; // FULL display name
  pointsByKey: Record<PeriodCategoryKey, number>;
  total: number;
};

function buildStandings(resp: PeriodCategoryStandingsResponse | null): StandingsRow[] {
  if (!resp) return [];

  const byCode = new Map<string, StandingsRow>();

  const ensure = (teamCodeRaw: any, teamNameRaw: any) => {
    const teamCode = String(teamCodeRaw ?? "").trim().toUpperCase();
    if (!teamCode) return null;

    if (!byCode.has(teamCode)) {
      const pointsByKey = {} as Record<PeriodCategoryKey, number>;
      for (const k of STANDINGS_KEYS) pointsByKey[k] = 0;

      byCode.set(teamCode, {
        teamCode,
        teamName: fullTeamName(teamCode, teamNameRaw),
        pointsByKey,
        total: 0,
      });
    } else {
      // Keep full name if possible
      const cur = byCode.get(teamCode)!;
      cur.teamName = fullTeamName(teamCode, cur.teamName || teamNameRaw);
    }

    return byCode.get(teamCode)!;
  };

  for (const cat of resp.categories ?? []) {
    const key = String((cat as any).key ?? "").trim().toUpperCase() as PeriodCategoryKey;
    if (!STANDINGS_KEYS.includes(key)) continue;

    for (const r of cat.rows ?? []) {
      const code = (r as any).teamCode;
      const name = (r as any).teamName;
      const row = ensure(code, name);
      if (!row) continue;

      const pts = toNum((r as any).points);
      row.pointsByKey[key] = pts; // one row per team per category
    }
  }

  // compute totals
  for (const row of byCode.values()) {
    row.total = STANDINGS_KEYS.reduce((sum, k) => sum + toNum(row.pointsByKey[k]), 0);
  }

  return Array.from(byCode.values()).sort((a, b) => b.total - a.total);
}

function expectedTotalPoints(teamCount: number, categoryCount: number): number {
  // Each category's roto points sum = 1+2+...+N = N*(N+1)/2
  return (teamCount * (teamCount + 1)) / 2 * categoryCount;
}

function splitCats(categories: PeriodCategoryStandingTable[]) {
  const hitting: PeriodCategoryStandingTable[] = [];
  const pitching: PeriodCategoryStandingTable[] = [];

  for (const c of categories ?? []) {
    const g = String((c as any).group ?? "").toUpperCase();
    if (g === "P") pitching.push(c);
    else hitting.push(c);
  }

  return { hitting, pitching };
}

export default function Period() {
  const [periodId, setPeriodId] = useState<number>(1);
  const [resp, setResp] = useState<PeriodCategoryStandingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await getPeriodCategoryStandings(periodId);
        if (cancelled) return;
        setResp(data);
      } catch (e: any) {
        if (cancelled) return;
        setResp(null);
        setError(e?.message || "Failed to load period category standings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [periodId]);

  const standingsRows = useMemo(() => buildStandings(resp), [resp]);

  const categories = useMemo(() => resp?.categories ?? [], [resp]);
  const { hitting: hittingCats, pitching: pitchingCats } = useMemo(() => splitCats(categories), [categories]);

  const teamCount = toNum((resp as any)?.teamCount);
  const catCount = (resp?.categories ?? []).length;

  const totalPointsAllTeams = useMemo(
    () => standingsRows.reduce((sum, r) => sum + toNum(r.total), 0),
    [standingsRows]
  );

  const expectedTotal = useMemo(
    () => (teamCount > 0 && catCount > 0 ? expectedTotalPoints(teamCount, catCount) : 0),
    [teamCount, catCount]
  );

  const periodLabel = PERIOD_OPTIONS.find((p) => p.id === periodId)?.label ?? `P${periodId}`;

  return (
    <div className={`flex-1 min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-slate-50' : 'bg-gray-50 text-gray-900'}`}>
      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Header row */}
        {/* Header row */}
        <PageHeader 
          title="Period" 
          subtitle={
            <div>
              <div>Category standings computed server-side from player-period totals.</div>
              {resp && (
                <div className="mt-1 text-slate-500">
                  Period: {String((resp as any).periodId ?? periodLabel)}
                  {(resp as any).periodNum ? ` · Period #${(resp as any).periodNum}` : ""}
                  {teamCount ? ` · Teams: ${teamCount}` : ""}
                </div>
              )}
            </div>
          }
          rightElement={
            <div className="flex items-center gap-3 bg-[var(--fbst-surface-secondary)] p-2 rounded-lg border border-[var(--fbst-table-border)]">
              <div className="text-xs uppercase tracking-wide text-slate-400">Select Period</div>
              <select
                value={periodId}
                onChange={(e) => setPeriodId(Number(e.target.value))}
                className="bg-transparent text-sm text-[var(--fbst-text-primary)] outline-none font-semibold cursor-pointer"
              >
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} (Period {p.id})
                  </option>
                ))}
              </select>
            </div>
          }
        />

        {/* Errors */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* TOP: Standings (category points) */}
        <div className="mb-8">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-4">
              <div>
                <div className="text-base font-semibold text-slate-100">Standings</div>
                <div className="mt-1 text-xs text-slate-500">
                  Category points (1..{teamCount || "N"}; ties split) for this period, plus TOTAL.
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-400">Validation</div>
                <div className="mt-1 text-sm font-semibold text-slate-100 tabular-nums">
                  {loading ? "—" : fmt1(totalPointsAllTeams)}
                  {expectedTotal ? (
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      (expected {fmt1(expectedTotal)})
                    </span>
                  ) : null}
                </div>
                {expectedTotal ? (
                  <div
                    className={classNames(
                      "mt-1 text-xs",
                      Math.abs(totalPointsAllTeams - expectedTotal) < 1e-6 ? "text-emerald-300/80" : "text-amber-300/90"
                    )}
                  >
                    {Math.abs(totalPointsAllTeams - expectedTotal) < 1e-6 ? "OK: totals match" : "Check: totals differ"}
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-slate-500">Expected total requires team/category count.</div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
            <ThemedTable className="min-w-[1100px]">
              <ThemedThead>
                  <tr>
                    <th className="px-4 py-3 text-left w-12 text-xs font-medium uppercase tracking-wide text-slate-400">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Team</th>

                    {STANDINGS_KEYS.map((k) => (
                      <th
                        key={k}
                        className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400"
                      >
                        {STANDINGS_LABELS[k]}
                      </th>
                    ))}

                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                      TOTAL
                    </th>

                    {/* Placeholder for future +/- when you have snapshot history */}
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                      +/-
                    </th>
                  </tr>
                </ThemedThead>

                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={2 + STANDINGS_KEYS.length + 2} className="px-4 py-6 text-center text-slate-400">
                        Loading standings…
                      </td>
                    </tr>
                  )}

                  {!loading && standingsRows.length === 0 && (
                    <tr>
                      <td colSpan={2 + STANDINGS_KEYS.length + 2} className="px-4 py-6 text-center text-slate-400">
                        No standings available.
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    standingsRows.map((r, idx) => (
                      <tr
                        key={r.teamCode}
                        className={classNames(
                          "border-t border-slate-800/70",
                          idx % 2 === 0 ? "bg-slate-950" : "bg-slate-950/60"
                        )}
                      >
                        <td className="px-4 py-3 text-xs text-slate-400">{idx + 1}</td>

                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-slate-100">{r.teamName}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{r.teamCode}</div>
                        </td>

                        {STANDINGS_KEYS.map((k) => (
                          <td key={k} className="px-3 py-3 text-right tabular-nums text-slate-100">
                            {fmt1(r.pointsByKey[k])}
                          </td>
                        ))}

                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className="font-semibold text-slate-50">{fmt1(r.total)}</span>
                        </td>

                        <td className="px-4 py-3 text-right tabular-nums text-slate-500">—</td>
                      </tr>
                    ))}
                </tbody>
              </ThemedTable>
            </div>
          </div>
        </div>

        {/* Category standings */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Hitting */}
          <section className="rounded-3xl border border-slate-800 bg-slate-950/50 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div className="text-base font-semibold text-slate-100">Hitting category standings</div>
              {teamCount ? <div className="text-xs text-slate-400">Points: {teamCount}..1 (ties split)</div> : null}
            </div>

            <div className="p-6 space-y-6">
              {loading && <div className="text-sm text-slate-400">Loading categories…</div>}
              {!loading && hittingCats.length === 0 && <div className="text-sm text-slate-400">No hitting categories.</div>}
              {!loading && hittingCats.map((cat) => <CategoryCard key={cat.key} cat={cat} />)}
            </div>
          </section>

          {/* Pitching */}
          <section className="rounded-3xl border border-slate-800 bg-slate-950/50 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div className="text-base font-semibold text-slate-100">Pitching category standings</div>
              {teamCount ? <div className="text-xs text-slate-400">Points: {teamCount}..1 (ties split)</div> : null}
            </div>

            <div className="p-6 space-y-6">
              {loading && <div className="text-sm text-slate-400">Loading categories…</div>}
              {!loading && pitchingCats.length === 0 && (
                <div className="text-sm text-slate-400">No pitching categories.</div>
              )}
              {!loading && pitchingCats.map((cat) => <CategoryCard key={cat.key} cat={cat} />)}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function CategoryCard({ cat }: { cat: PeriodCategoryStandingTable }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="text-sm font-semibold text-slate-100">{cat.label}</div>
        <div className="text-xs text-slate-500">Sort: {cat.higherIsBetter ? "high → low" : "low → high"}</div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/40 border-b border-slate-800">
            <tr className="text-xs text-slate-400">
              <th className="px-4 py-2 text-left w-16">Rank</th>
              <th className="px-4 py-2 text-left">Team</th>
              <th className="px-4 py-2 text-right w-28">Value</th>
              <th className="px-4 py-2 text-right w-28">Points</th>
            </tr>
          </thead>

          <tbody>
            {(cat.rows ?? []).map((r: any, idx: number) => {
              const code = String(r.teamCode ?? "").trim().toUpperCase();
              const name = fullTeamName(code, r.teamName);

              return (
                <tr
                  key={`${code || "—"}-${idx}`}
                  className={classNames(
                    "border-t border-slate-800/70",
                    idx % 2 === 0 ? "bg-slate-950" : "bg-slate-950/60"
                  )}
                >
                  <td className="px-4 py-2 text-slate-200 tabular-nums">{r.rank ?? "—"}</td>
                  <td className="px-4 py-2">
                    <div className="text-slate-100">{name}</div>
                    <div className="text-xs text-slate-500">{code}</div>
                  </td>
                  <td className="px-4 py-2 text-right text-slate-200 tabular-nums">{fmtValue(r.value)}</td>
                  <td className="px-4 py-2 text-right text-slate-200 tabular-nums">{fmt1(r.points)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 text-xs text-slate-500">
        Note: AVG/ERA/WHIP are computed from totals (not averages of averages).
      </div>
    </div>
  );
}
