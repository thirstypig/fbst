// client/src/pages/CategoryStandings.tsx
import React, { useEffect, useMemo, useState } from "react";
import { getCategoryStandings, type CategoryId, type CategoryStandingsResponse } from "../lib/api";

const CATS: Array<{ id: CategoryId; label: string }> = [
  { id: "R", label: "R" },
  { id: "HR", label: "HR" },
  { id: "RBI", label: "RBI" },
  { id: "SB", label: "SB" },
  { id: "AVG", label: "AVG" },
  { id: "W", label: "W" },
  { id: "S", label: "S" },
  { id: "K", label: "K" },
  { id: "ERA", label: "ERA" },
  { id: "WHIP", label: "WHIP" },
];

function fmt(cat: CategoryId, v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (cat === "AVG") return v.toFixed(3).replace(/^0\./, ".");
  if (cat === "ERA" || cat === "WHIP") return v.toFixed(2);
  return String(Math.round(v));
}

export default function CategoryStandings() {
  const [periodId, setPeriodId] = useState<number>(1);
  const [data, setData] = useState<CategoryStandingsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await getCategoryStandings(periodId);
        if (!mounted) return;
        setData(resp);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load category standings.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [periodId]);

  const rows = useMemo(() => data?.rows ?? [], [data]);

  return (
    <div className="px-10 py-8">
      <div className="mb-6 text-center">
        <div className="text-4xl font-semibold text-white">Category Standings</div>
        <div className="mt-2 text-sm text-white/60">Client-computed for now (period stats → roto points).</div>
      </div>

      <div className="mb-6 flex items-center justify-center gap-3">
        <label className="text-sm text-white/70">Period</label>
        <input
          type="number"
          min={1}
          className="w-20 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          value={periodId}
          onChange={(e) => setPeriodId(Number(e.target.value || 1))}
        />
      </div>

      <div className="mx-auto max-w-6xl overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
        <table className="min-w-[1100px] w-full border-separate border-spacing-0">
          <thead>
            <tr className="text-xs text-white/60">
              <Th w={220}>TEAM</Th>
              {CATS.map((cat) => (
                <Th key={cat.id} w={80}>
                  {cat.label}
                </Th>
              ))}
              <Th w={100}>TOTAL</Th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-sm text-white/60" colSpan={CATS.length + 2}>
                  Loading…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td className="px-4 py-6 text-sm text-red-300" colSpan={CATS.length + 2}>
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-white/60" colSpan={CATS.length + 2}>
                  No data.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.teamName}-${row.teamId}`} className="text-sm text-white/90 hover:bg-white/5">
                  <Td className="font-medium text-left">{row.teamName}</Td>
                  {CATS.map((cat) => (
                    <Td key={cat.id} className="tabular-nums">
                      {fmt(cat.id, row.stats?.[cat.id] ?? 0)}
                      <div className="text-[11px] text-white/45">{(row.points?.[cat.id] ?? 0).toFixed(1)}</div>
                    </Td>
                  ))}
                  <Td className="tabular-nums font-semibold">{row.totalPoints.toFixed(1)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, w }: { children: React.ReactNode; w?: number }) {
  return (
    <th
      style={w ? { width: w } : undefined}
      className="border-b border-white/10 px-3 py-3 text-left font-medium"
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`border-b border-white/10 px-3 py-3 text-center ${className ?? ""}`}>{children}</td>;
}
