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
  useTheme();

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
    <div className="flex-1 min-h-screen">
      <main className="max-w-6xl mx-auto px-6 py-12">
        <PageHeader 
          title="Period Performance" 
          subtitle={
            <div className="space-y-2">
              <div className="text-[var(--fbst-text-secondary)]">Category standings computed server-side from player-period totals.</div>
              {resp && (
                <div className="flex gap-4 text-xs font-bold uppercase tracking-widest text-[var(--fbst-text-muted)]">
                  <span>Period: {String((resp as any).periodId ?? periodLabel)}</span>
                  {(resp as any).periodNum && <span>Batch #{(resp as any).periodNum}</span>}
                  {teamCount && <span>Census: {teamCount} Teams</span>}
                </div>
              )}
            </div>
          }
          rightElement={
            <div className="flex items-center gap-3 liquid-glass p-1.5 rounded-2xl border border-white/10 pr-4">
              <div className="bg-white/5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-[var(--fbst-text-muted)]">Historical Select</div>
              <select
                value={periodId}
                onChange={(e) => setPeriodId(Number(e.target.value))}
                className="bg-transparent text-sm text-[var(--fbst-text-primary)] outline-none font-bold cursor-pointer hover:text-[var(--fbst-accent)] transition-colors"
              >
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 border-none">
                    Period {p.id} ({p.label})
                  </option>
                ))}
              </select>
            </div>
          }
        />

        {error && (
          <div className="mb-8 rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm font-medium text-red-300 flex items-center gap-3">
             <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            System Error: {error}
          </div>
        )}

        {/* TOP: Standings (category points) */}
        <div className="mb-12">
          <div className="overflow-hidden rounded-3xl liquid-glass border border-white/10 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/5 border-b border-white/10 px-8 py-6">
              <div>
                <h2 className="text-xl font-black tracking-tight text-[var(--fbst-text-heading)]">Roto Standings</h2>
                <div className="mt-1 text-sm font-medium text-[var(--fbst-text-muted)]">
                  Live ranking matrix based on category performance (1..{teamCount || "N"}).
                </div>
              </div>

              <div className="flex items-center gap-8 border-l border-white/10 pl-8 h-12">
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)]">Integrity Check</div>
                  <div className="text-xl font-black text-[var(--fbst-text-primary)] tabular-nums flex items-end gap-2 leading-none">
                    {loading ? "---" : fmt1(totalPointsAllTeams)}
                    {expectedTotal ? (
                      <span className="text-[10px] font-bold text-[var(--fbst-text-muted)] opacity-60">/ {fmt1(expectedTotal)}</span>
                    ) : null}
                  </div>
                </div>
                {expectedTotal && (
                   <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                     Math.abs(totalPointsAllTeams - expectedTotal) < 1e-6 
                        ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5" 
                        : "border-amber-500/30 text-amber-400 bg-amber-500/5"
                   }`}>
                     {Math.abs(totalPointsAllTeams - expectedTotal) < 1e-6 ? "Verified" : "Sync Error"}
                   </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="px-6 py-4 text-left w-16 text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)]">#</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)]">Franchise</th>

                    {STANDINGS_KEYS.map((k) => (
                      <th
                        key={k}
                        className="px-4 py-4 text-center text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)]"
                      >
                        {STANDINGS_LABELS[k]}
                      </th>
                    ))}

                    <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-[var(--fbst-accent)]">
                      TOTAL
                    </th>
                    <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)]">
                      +/-
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={2 + STANDINGS_KEYS.length + 2} className="px-6 py-12 text-center text-[var(--fbst-text-muted)] italic font-medium">
                        Synchronizing performance data...
                      </td>
                    </tr>
                  ) : standingsRows.length === 0 ? (
                    <tr>
                      <td colSpan={2 + STANDINGS_KEYS.length + 2} className="px-6 py-12 text-center text-[var(--fbst-text-muted)] italic font-medium">
                        No telemetry records found for this period.
                      </td>
                    </tr>
                  ) : (
                    standingsRows.map((r, idx) => (
                      <tr
                        key={r.teamCode}
                        className="hover:bg-white/5 transition-colors duration-150"
                      >
                        <td className="px-6 py-4 text-xs font-bold text-[var(--fbst-text-muted)] opacity-50 tabular-nums">{idx + 1}</td>

                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-[var(--fbst-text-primary)]">{r.teamName}</div>
                        </td>

                        {STANDINGS_KEYS.map((k) => (
                          <td key={k} className="px-4 py-4 text-center font-medium text-[var(--fbst-text-primary)] tabular-nums">
                            {fmt1(r.pointsByKey[k])}
                          </td>
                        ))}

                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-black text-[var(--fbst-accent)] tabular-nums">{fmt1(r.total)}</span>
                        </td>

                        <td className="px-6 py-4 text-center text-[var(--fbst-text-muted)] opacity-30">—</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Category standings */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Hitting */}
          <section>
            <div className="mb-6 flex items-end justify-between px-2">
              <h2 className="text-2xl font-black tracking-tight text-[var(--fbst-text-heading)]">Hitting Categories</h2>
              {teamCount && <div className="text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)]">Ranked {teamCount}..1</div>}
            </div>

            <div className="space-y-8">
              {loading ? (
                 <div className="text-sm font-medium text-[var(--fbst-text-muted)] animate-pulse">Scanning hitters...</div>
              ) : hittingCats.length === 0 ? (
                 <div className="text-sm font-medium text-[var(--fbst-text-muted)] italic">No active hitting metrics.</div>
              ) : (
                hittingCats.map((cat) => <CategoryCard key={cat.key} cat={cat} />)
              )}
            </div>
          </section>

          {/* Pitching */}
          <section>
             <div className="mb-6 flex items-end justify-between px-2">
              <h2 className="text-2xl font-black tracking-tight text-[var(--fbst-text-heading)]">Pitching Categories</h2>
              {teamCount && <div className="text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)]">Ranked {teamCount}..1</div>}
            </div>

            <div className="space-y-8">
              {loading ? (
                 <div className="text-sm font-medium text-[var(--fbst-text-muted)] animate-pulse">Scanning pitchers...</div>
              ) : pitchingCats.length === 0 ? (
                <div className="text-sm font-medium text-[var(--fbst-text-muted)] italic">No active pitching metrics.</div>
              ) : (
                pitchingCats.map((cat) => <CategoryCard key={cat.key} cat={cat} />)
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function CategoryCard({ cat }: { cat: PeriodCategoryStandingTable }) {
  return (
    <div className="overflow-hidden rounded-3xl liquid-glass border border-white/10 shadow-lg">
      <div className="flex items-center justify-between bg-white/5 border-b border-white/10 px-6 py-4">
        <div className="text-base font-black tracking-tight text-[var(--fbst-text-heading)]">{cat.label}</div>
        <div className="text-[9px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)] flex items-center gap-2">
          {cat.higherIsBetter ? (
             <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Ascending</span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">Descending</span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5 border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)]">
              <th className="px-6 py-3 text-left w-16">Rank</th>
              <th className="px-6 py-3 text-left">Franchise</th>
              <th className="px-6 py-3 text-center w-28">Value</th>
              <th className="px-6 py-3 text-right w-24 text-[var(--fbst-accent)]">Points</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5 text-xs">
            {(cat.rows ?? []).map((r: any, idx: number) => {
              const code = String(r.teamCode ?? "").trim().toUpperCase();
              const name = fullTeamName(code, r.teamName);

              return (
                <tr
                  key={`${code || "—"}-${idx}`}
                  className="hover:bg-white/5 transition-colors duration-150"
                >
                  <td className="px-6 py-3 font-bold text-[var(--fbst-text-muted)] opacity-50 tabular-nums">{r.rank ?? idx + 1}</td>
                  <td className="px-6 py-3">
                    <div className="font-bold text-[var(--fbst-text-primary)]">{name}</div>
                  </td>
                  <td className="px-6 py-3 text-center font-medium text-[var(--fbst-text-primary)] tabular-nums">{fmtValue(r.value)}</td>
                  <td className="px-6 py-3 text-right font-black text-[var(--fbst-accent)] tabular-nums">{fmt1(r.points)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-3 bg-white/5 text-[9px] font-bold uppercase tracking-widest text-[var(--fbst-text-muted)] opacity-40">
        Aggregated from telemetry snapshots. 
      </div>
    </div>
  );
}
