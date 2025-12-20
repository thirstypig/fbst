// client/src/pages/CategoryStandings.tsx
import React, { useEffect, useMemo, useState } from "react";
import { getPeriodStandings } from "../api";

// Categories used in PeriodStandingsResponse points/stats
type CategoryId = "R" | "HR" | "RBI" | "SB" | "AVG" | "W" | "S" | "K" | "ERA" | "WHIP";

type UiRow = {
  teamId?: number;
  teamName?: string;
  team?: string; // back-compat in case something returns `team`
  stats?: Partial<Record<CategoryId, number>>;
  points?: Partial<Record<CategoryId, number>>;
  totalPoints?: number;
};

const CATS: Array<{ id: CategoryId; label: string; higherIsBetter: boolean }> = [
  { id: "R", label: "R", higherIsBetter: true },
  { id: "HR", label: "HR", higherIsBetter: true },
  { id: "RBI", label: "RBI", higherIsBetter: true },
  { id: "SB", label: "SB", higherIsBetter: true },
  { id: "AVG", label: "AVG", higherIsBetter: true },
  { id: "W", label: "W", higherIsBetter: true },
  { id: "S", label: "S", higherIsBetter: true },
  { id: "K", label: "K", higherIsBetter: true },
  { id: "ERA", label: "ERA", higherIsBetter: false },
  { id: "WHIP", label: "WHIP", higherIsBetter: false },
];

function fmtStat(cat: CategoryId, v: number) {
  if (!Number.isFinite(v)) return "—";
  if (cat === "AVG") return v.toFixed(3).replace(/^0\./, ".");
  if (cat === "ERA" || cat === "WHIP") return v.toFixed(2);
  return String(Math.round(v));
}

function fmtPts(v: number) {
  if (!Number.isFinite(v)) return "—";
  // roto ties can yield halves
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function getPeriodIdFromUrl(): number {
  const sp = new URLSearchParams(window.location.search);
  const raw = sp.get("periodId") || sp.get("pid") || "1";
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export default function CategoryStandings() {
  const [periodId, setPeriodId] = useState<number>(() => getPeriodIdFromUrl());
  const [rows, setRows] = useState<UiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const resp = await getPeriodStandings(periodId);
        if (!alive) return;
        setRows((resp?.rows ?? []) as UiRow[]);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || String(e));
        setRows([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [periodId]);

  const sorted = useMemo(() => {
    // already sorted by totalPoints in api.ts, but keep it safe
    const copy = [...rows];
    copy.sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0));
    return copy;
  }, [rows]);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Category Standings</h1>
          <div className="mt-1 text-sm text-white/60">Period points by category (roto style).</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm text-white/70">Period</div>
          <input
            className="w-20 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            value={String(periodId)}
            onChange={(e) => setPeriodId(Number(e.target.value) || 1)}
            inputMode="numeric"
          />
        </div>
      </div>

      {err ? (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/5">
        <div className="border-b border-white/10 px-5 py-3 text-sm font-semibold text-white/90">
          {loading ? "Loading…" : `Teams: ${sorted.length}`}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-separate border-spacing-0 text-sm">
            <thead className="text-xs text-white/60">
              <tr>
                <th className="border-b border-white/10 px-3 py-2 text-left">Team</th>
                {CATS.map((c) => (
                  <th key={c.id} className="border-b border-white/10 px-3 py-2 text-center">
                    {c.label}
                  </th>
                ))}
                <th className="border-b border-white/10 px-3 py-2 text-center">Total</th>
              </tr>
            </thead>

            <tbody className="text-white/90">
              {sorted.map((r, idx) => {
                const name = r.teamName ?? r.team ?? `Team ${idx + 1}`;
                const key = String(r.teamId ?? name ?? idx);
                return (
                  <tr key={key} className="border-t border-white/10">
                    <td className="border-b border-white/10 px-3 py-2 text-left font-medium">{name}</td>

                    {CATS.map((c) => {
                      const stat = r.stats?.[c.id] ?? 0;
                      const pts = r.points?.[c.id] ?? 0;
                      return (
                        <td key={c.id} className="border-b border-white/10 px-3 py-2 text-center">
                          <div className="tabular-nums">{fmtStat(c.id, stat)}</div>
                          <div className="text-[11px] text-white/50 tabular-nums">{fmtPts(pts)}</div>
                        </td>
                      );
                    })}

                    <td className="border-b border-white/10 px-3 py-2 text-center font-semibold tabular-nums">
                      {fmtPts(r.totalPoints ?? 0)}
                    </td>
                  </tr>
                );
              })}

              {!loading && sorted.length === 0 ? (
                <tr>
                  <td colSpan={CATS.length + 2} className="px-3 py-6 text-center text-sm text-white/60">
                    No rows.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 text-xs text-white/50">
          Each cell shows: stat (top) and roto points (bottom).
        </div>
      </div>
    </div>
  );
}
