// client/src/pages/Period.tsx
import React, { useEffect, useMemo, useState } from "react";

type PlayerPeriodRow = {
  period_id: string;
  period_label?: string;
  start_date?: string;
  end_date?: string;

  team_code: string;
  team_name?: string;

  player_name?: string;
  positions?: string;

  // can be "0"/"1", boolean, etc.
  is_pitcher?: any;

  // hitting
  R?: any;
  HR?: any;
  RBI?: any;
  SB?: any;
  H?: any;
  AB?: any;

  // pitching
  W?: any;
  SV?: any;
  K?: any;
  ER?: any;
  IP?: any;
  BB_H?: any; // your data uses BB_H as (BB+H) for WHIP calc
};

type PeriodMeta = {
  id: string;
  label: string;
  start_date?: string;
  end_date?: string;
};

type TeamAgg = {
  team_code: string;
  team_name: string;

  // counting hitting
  R: number;
  HR: number;
  RBI: number;
  SB: number;
  H: number;
  AB: number;

  // counting pitching
  W: number;
  SV: number;
  K: number;
  ER: number;
  IP: number; // innings as decimal (outs-based conversion)
  BB_H: number;

  // derived
  AVG: number; // H/AB
  ERA: number; // ER*9/IP
  WHIP: number; // (BB+H)/IP
};

type SortDir = "desc" | "asc";

type CategoryDef = {
  key: keyof TeamAgg;
  label: string;
  group: "Hitting" | "Pitching";
  dir: SortDir;
  format: (v: number) => string;
};

type StandingRow = {
  rank: number;
  team_code: string;
  team_name: string;
  value: number;
  points: number;
};

function norm(v: any) {
  return String(v ?? "").trim();
}

function toNum(v: any): number {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

function toBoolPitcher(v: any): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return false;
  if (s === "true") return true;
  if (s === "false") return false;
  if (s === "1") return true;
  if (s === "0") return false;
  return Boolean(v);
}

// Convert baseball innings like "12.1" => 12 + 1/3; "12.2" => 12 + 2/3
function parseIp(ip: any): number {
  const s = String(ip ?? "").trim();
  if (!s) return 0;
  const parts = s.split(".");
  const whole = Number(parts[0] ?? 0) || 0;
  const frac = Number(parts[1] ?? 0) || 0;
  if (frac === 1) return whole + 1 / 3;
  if (frac === 2) return whole + 2 / 3;
  const n = Number(s);
  return Number.isFinite(n) ? n : whole;
}

function fmtInt(n: number) {
  return String(Math.round(n));
}
function fmt3(n: number) {
  if (!Number.isFinite(n)) return "—";
  const s = n.toFixed(3);
  return s.startsWith("0") ? s.slice(1) : s;
}
function fmt2(n: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(2);
}

function eq(a: number, b: number) {
  // tolerate tiny floating variance
  return Math.abs(a - b) < 1e-9;
}

function getClientApiBase(): string {
  const raw = (import.meta as any)?.env?.VITE_API_BASE_URL ?? "";
  return String(raw).replace(/\/+$/, "");
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} for ${url}${txt ? ` — ${txt}` : ""}`);
  }
  return (await res.json()) as T;
}

const categories: CategoryDef[] = [
  // Hitting
  { key: "R", label: "Runs (R)", group: "Hitting", dir: "desc", format: fmtInt },
  { key: "HR", label: "Home Runs (HR)", group: "Hitting", dir: "desc", format: fmtInt },
  { key: "RBI", label: "RBI", group: "Hitting", dir: "desc", format: fmtInt },
  { key: "SB", label: "Stolen Bases (SB)", group: "Hitting", dir: "desc", format: fmtInt },
  { key: "AVG", label: "Batting Avg (AVG)", group: "Hitting", dir: "desc", format: fmt3 },

  // Pitching
  { key: "W", label: "Wins (W)", group: "Pitching", dir: "desc", format: fmtInt },
  { key: "SV", label: "Saves (SV)", group: "Pitching", dir: "desc", format: fmtInt },
  { key: "K", label: "Strikeouts (K)", group: "Pitching", dir: "desc", format: fmtInt },
  { key: "ERA", label: "ERA", group: "Pitching", dir: "asc", format: fmt2 },
  { key: "WHIP", label: "WHIP", group: "Pitching", dir: "asc", format: fmt2 },
];

function computeTeamAgg(rows: PlayerPeriodRow[]): TeamAgg[] {
  const byTeam = new Map<string, TeamAgg>();

  for (const r of rows) {
    const code = norm(r.team_code).toUpperCase();
    if (!code) continue;

    const teamName = norm(r.team_name) || code;

    if (!byTeam.has(code)) {
      byTeam.set(code, {
        team_code: code,
        team_name: teamName,

        R: 0,
        HR: 0,
        RBI: 0,
        SB: 0,
        H: 0,
        AB: 0,

        W: 0,
        SV: 0,
        K: 0,
        ER: 0,
        IP: 0,
        BB_H: 0,

        AVG: 0,
        ERA: 0,
        WHIP: 0,
      });
    }

    const t = byTeam.get(code)!;

    const isP = toBoolPitcher(r.is_pitcher);

    if (!isP) {
      t.R += toNum(r.R);
      t.HR += toNum(r.HR);
      t.RBI += toNum(r.RBI);
      t.SB += toNum(r.SB);
      t.H += toNum(r.H);
      t.AB += toNum(r.AB);
    } else {
      t.W += toNum(r.W);
      t.SV += toNum(r.SV);
      t.K += toNum(r.K);
      t.ER += toNum(r.ER);
      t.IP += parseIp(r.IP);
      t.BB_H += toNum(r.BB_H);
    }
  }

  const out = Array.from(byTeam.values());

  for (const t of out) {
    t.AVG = t.AB > 0 ? t.H / t.AB : 0;
    t.ERA = t.IP > 0 ? (t.ER * 9) / t.IP : 0;
    t.WHIP = t.IP > 0 ? t.BB_H / t.IP : 0;
  }

  // stable sort teams by code for deterministic rendering when needed
  out.sort((a, b) => a.team_code.localeCompare(b.team_code));
  return out;
}

function assignRotoPoints(
  teams: TeamAgg[],
  cat: CategoryDef
): StandingRow[] {
  const n = teams.length;
  const dir = cat.dir;

  // Sort by category value; tie-break by team_code for determinism
  const sorted = [...teams].sort((a, b) => {
    const av = a[cat.key] as number;
    const bv = b[cat.key] as number;

    if (!eq(av, bv)) {
      return dir === "desc" ? (bv - av) : (av - bv);
    }
    return a.team_code.localeCompare(b.team_code);
  });

  // Base points for a rank (1-based): N..1
  const pointsForRank = (rank1: number) => n - rank1 + 1;

  const result: StandingRow[] = [];
  let i = 0;
  let rank = 1;

  while (i < sorted.length) {
    const v = sorted[i][cat.key] as number;

    // find tie group [i..j)
    let j = i + 1;
    while (j < sorted.length) {
      const v2 = sorted[j][cat.key] as number;
      if (!eq(v2, v)) break;
      j++;
    }

    const groupSize = j - i;
    const occupiedRanks = Array.from({ length: groupSize }, (_, k) => rank + k);

    // split points across occupied ranks (standard roto tie handling)
    const ptsAvg =
      occupiedRanks.reduce((sum, rnk) => sum + pointsForRank(rnk), 0) /
      occupiedRanks.length;

    for (let k = i; k < j; k++) {
      const t = sorted[k];
      result.push({
        rank, // same displayed rank for ties (e.g., 2,2,2)
        team_code: t.team_code,
        team_name: t.team_name,
        value: t[cat.key] as number,
        points: ptsAvg,
      });
    }

    rank += groupSize;
    i = j;
  }

  return result;
}

const cardCls =
  "rounded-2xl border border-white/10 bg-white/5 shadow-sm";
const cardHeadCls =
  "px-4 py-3 border-b border-white/10 flex items-center justify-between";
const cardBodyCls = "p-3";

const tableCls = "w-full border-collapse text-xs leading-tight tabular-nums";
const thBase = "font-semibold text-neutral-200 border-b border-white/10 px-2 py-1 whitespace-nowrap";
const tdBase = "text-neutral-100 border-b border-white/5 px-2 py-1 whitespace-nowrap";

export default function Period() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  const [allRows, setAllRows] = useState<PlayerPeriodRow[]>([]);
  const [periodId, setPeriodId] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const base = getClientApiBase();
        const rows = await fetchJson<PlayerPeriodRow[]>(
          `${base}/api/player-period-stats`
        );

        if (cancelled) return;

        setAllRows(Array.isArray(rows) ? rows : []);
      } catch (e: any) {
        if (cancelled) return;
        setErr(String(e?.message ?? e ?? "Failed to load period stats"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const periods: PeriodMeta[] = useMemo(() => {
    const map = new Map<string, PeriodMeta>();

    for (const r of allRows) {
      const id = norm(r.period_id);
      if (!id) continue;

      const label = norm(r.period_label) || id;

      if (!map.has(id)) {
        map.set(id, {
          id,
          label,
          start_date: norm(r.start_date) || undefined,
          end_date: norm(r.end_date) || undefined,
        });
      }
    }

    // sort by id (P1, P2...), with a numeric fallback
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      const an = Number(a.id.replace(/[^\d]/g, "")) || 0;
      const bn = Number(b.id.replace(/[^\d]/g, "")) || 0;
      if (an !== bn) return an - bn;
      return a.id.localeCompare(b.id);
    });
    return arr;
  }, [allRows]);

  useEffect(() => {
    if (!periodId && periods.length) {
      setPeriodId(periods[0].id);
    }
  }, [periodId, periods]);

  const selectedPeriod = useMemo(
    () => periods.find((p) => p.id === periodId) ?? null,
    [periods, periodId]
  );

  const periodRows = useMemo(() => {
    if (!periodId) return [];
    return allRows.filter((r) => norm(r.period_id) === periodId);
  }, [allRows, periodId]);

  const teamAgg = useMemo(() => computeTeamAgg(periodRows), [periodRows]);

  const standingsByCat = useMemo(() => {
    const out: Record<string, StandingRow[]> = {};
    for (const c of categories) {
      out[c.key] = assignRotoPoints(teamAgg, c);
    }
    return out;
  }, [teamAgg]);

  const hittingCats = categories.filter((c) => c.group === "Hitting");
  const pitchingCats = categories.filter((c) => c.group === "Pitching");

  return (
    <div className="px-4 py-4 text-neutral-100">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-semibold">Period</h1>
          <div className="text-sm text-neutral-300">
            Category standings computed from player-period totals.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-300">Period</label>
          <select
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
            className="bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-sm"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} ({p.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedPeriod ? (
        <div className="mb-4 text-xs text-neutral-300">
          <span className="mr-3">
            <span className="text-neutral-400">Period:</span>{" "}
            <span className="text-neutral-100">{selectedPeriod.label}</span>
          </span>
          {selectedPeriod.start_date ? (
            <span className="mr-3">
              <span className="text-neutral-400">Start:</span>{" "}
              <span className="text-neutral-100">{selectedPeriod.start_date}</span>
            </span>
          ) : null}
          {selectedPeriod.end_date ? (
            <span className="mr-3">
              <span className="text-neutral-400">End:</span>{" "}
              <span className="text-neutral-100">{selectedPeriod.end_date}</span>
            </span>
          ) : null}
          <span>
            <span className="text-neutral-400">Teams:</span>{" "}
            <span className="text-neutral-100">{teamAgg.length}</span>
          </span>
        </div>
      ) : null}

      {err ? (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-neutral-300">Loading…</div>
      ) : !periodId ? (
        <div className="text-sm text-neutral-300">No period selected.</div>
      ) : teamAgg.length === 0 ? (
        <div className="text-sm text-neutral-300">
          No stats rows found for this period.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CategoryGroup
            title="Hitting"
            cats={hittingCats}
            standingsByCat={standingsByCat}
          />
          <CategoryGroup
            title="Pitching"
            cats={pitchingCats}
            standingsByCat={standingsByCat}
          />
        </div>
      )}
    </div>
  );
}

function CategoryGroup({
  title,
  cats,
  standingsByCat,
}: {
  title: string;
  cats: CategoryDef[];
  standingsByCat: Record<string, StandingRow[]>;
}) {
  return (
    <div className={cardCls}>
      <div className={cardHeadCls}>
        <div className="text-sm font-semibold">{title} category standings</div>
        <div className="text-xs text-neutral-400">
          Points: N..1 (ties split)
        </div>
      </div>

      <div className={cardBodyCls}>
        <div className="grid grid-cols-1 gap-4">
          {cats.map((c) => (
            <div key={c.key}>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold">{c.label}</div>
                <div className="text-xs text-neutral-400">
                  Sort: {c.dir === "desc" ? "high → low" : "low → high"}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className={tableCls}>
                  <thead>
                    <tr>
                      <th className={`${thBase} text-center w-[60px]`}>Rank</th>
                      <th className={`${thBase} text-left min-w-[180px]`}>Team</th>
                      <th className={`${thBase} text-center w-[110px]`}>Value</th>
                      <th className={`${thBase} text-center w-[110px]`}>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(standingsByCat[c.key] ?? []).map((r, idx) => (
                      <tr key={`${r.team_code}-${idx}`}>
                        <td className={`${tdBase} text-center text-neutral-300`}>
                          {r.rank}
                        </td>
                        <td className={`${tdBase} text-left`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{r.team_name}</span>
                            <span className="text-[11px] text-neutral-400">
                              {r.team_code}
                            </span>
                          </div>
                        </td>
                        <td className={`${tdBase} text-center`}>
                          {c.format(r.value)}
                        </td>
                        <td className={`${tdBase} text-center`}>
                          {Number.isInteger(r.points) ? r.points : r.points.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-1 text-[11px] text-neutral-400">
                Note: AVG/ERA/WHIP are computed from totals (not averages of averages).
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
