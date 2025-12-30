// client/src/pages/Season.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSeasonStandings, getPeriodCategoryStandings } from "../lib/api";
import { classNames } from "../lib/classNames";
import { OGBA_TEAM_NAMES } from "../lib/ogbaTeams";
import { TableCard, Table, THead, Tr, Th, Td } from "../components/ui/TableCard";

type SeasonStandingsApiRow = {
  teamId: number;
  teamName: string;
  owner?: string;

  totalPoints?: number;
  periodPoints?: number[];

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
  teamCode?: string;
  periodPoints: number[];
  totalPoints: number;
};

function toNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sumNums(arr: any[]): number {
  return (arr ?? []).reduce((sum, v) => sum + toNum(v), 0);
}

function normName(s: any): string {
  return String(s ?? "").trim().toLowerCase();
}

/** displayName -> teamCode */
const DISPLAY_TO_CODE: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [code, name] of Object.entries(OGBA_TEAM_NAMES)) {
    out[normName(name)] = code;
  }
  return out;
})();

function normalizeSeasonRow(row: SeasonStandingsApiRow, periodIds: number[]): NormalizedSeasonRow {
  let periodPoints: number[] = [];

  if (Array.isArray(row.periodPoints) && row.periodPoints.length) {
    periodPoints = periodIds.map((_pid, idx) => toNum(row.periodPoints![idx]));
  } else {
    periodPoints = periodIds.map((pid) => toNum(row[`P${pid}`]));
  }

  const totalPoints = sumNums(periodPoints);
  const teamCode = DISPLAY_TO_CODE[normName(row.teamName)] ?? undefined;

  return {
    teamId: row.teamId,
    teamName: row.teamName,
    owner: row.owner,
    teamCode,
    periodPoints,
    totalPoints,
  };
}

async function computePeriodTotalsByTeamCode(periodIds: number[]) {
  const byCode = new Map<string, number[]>();

  const ensure = (code: string) => {
    const c = code.toUpperCase();
    if (!byCode.has(c)) byCode.set(c, new Array(periodIds.length).fill(0));
    return byCode.get(c)!;
  };

  for (let i = 0; i < periodIds.length; i++) {
    const pid = periodIds[i];
    const resp = await getPeriodCategoryStandings(pid);

    const totals = new Map<string, number>();

    for (const cat of resp.categories ?? []) {
      for (const r of cat.rows ?? []) {
        const code = String((r as any).teamCode ?? "").trim().toUpperCase();
        if (!code) continue;
        totals.set(code, (totals.get(code) ?? 0) + toNum((r as any).points));
      }
    }

    for (const [code, totalPts] of totals.entries()) {
      const arr = ensure(code);
      arr[i] = totalPts;
    }
  }

  return byCode;
}

const SeasonPage: React.FC = () => {
  const navigate = useNavigate();

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
        const apiData = (await getSeasonStandings()) as SeasonStandingsApiResponse;
        if (cancelled) return;

        const pids = apiData.periodIds && apiData.periodIds.length ? apiData.periodIds : [1, 2, 3, 4, 5, 6];

        let normalized = apiData.rows?.map((row) => normalizeSeasonRow(row, pids)) ?? [];

        const allPeriodsAllZero =
          normalized.length > 0 && normalized.every((r) => r.periodPoints.every((v) => toNum(v) === 0));

        if (allPeriodsAllZero) {
          const byCode = await computePeriodTotalsByTeamCode(pids);
          if (cancelled) return;

          normalized = normalized.map((r) => {
            if (!r.teamCode) return r;
            const arr = byCode.get(r.teamCode.toUpperCase());
            if (!arr) return r;

            return {
              ...r,
              periodPoints: arr,
              totalPoints: sumNums(arr),
            };
          });
        } else {
          normalized = normalized.map((r) => ({
            ...r,
            totalPoints: sumNums(r.periodPoints),
          }));
        }

        setPeriodIds(pids);
        setRows(normalized);
      } catch (err: any) {
        if (cancelled) return;
        console.error("Failed to load season standings", err);
        setError(err?.message || "Failed to load season standings");
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

  const sortedRows = useMemo(() => [...rows].sort((a, b) => b.totalPoints - a.totalPoints), [rows]);

  const colSpan = 3 + periodIds.length + 1;

  return (
    <div className="flex-1 min-h-screen bg-slate-950 text-slate-50">
      <main className="max-w-6xl mx-auto px-6 py-10">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight mb-1">Season Standings</h1>
          <p className="text-sm text-slate-400">
            Roto points by period for the full season (higher total is better). Use the roster link to view team rosters.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <TableCard>
          <Table>
            <THead>
              <Tr>
                <Th w={40} align="center">
                  #
                </Th>
                <Th align="left">Team</Th>
                <Th align="left">Roster</Th>

                {periodIds.map((pid) => (
                  <Th key={pid} align="right">
                    P{pid}
                  </Th>
                ))}

                <Th align="right">Total</Th>
              </Tr>
            </THead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-6 text-center text-sm text-slate-400">
                    Loading season standings…
                  </td>
                </tr>
              )}

              {!loading && sortedRows.length === 0 && (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-6 text-center text-sm text-slate-400">
                    No season standings available.
                  </td>
                </tr>
              )}

              {!loading &&
                sortedRows.map((row, index) => (
                  <Tr
                    key={row.teamId}
                    className={classNames(
                      "border-t border-slate-800/70",
                      index % 2 === 0 ? "bg-slate-950" : "bg-slate-950/60"
                    )}
                  >
                    <Td align="center" className="text-xs text-slate-400 align-top">
                      {index + 1}
                    </Td>

                    <Td align="left" className="align-top">
                      <div className="text-sm font-medium text-slate-100">{row.teamName}</div>
                      {row.teamCode && <div className="text-xs text-slate-500 mt-0.5">{row.teamCode}</div>}
                    </Td>

                    <Td align="left" className="align-top">
                      {row.teamCode ? (
                        <button
                          type="button"
                          className="text-sm text-sky-300 hover:text-sky-200"
                          onClick={() => navigate(`/teams/${encodeURIComponent(row.teamCode!)}`)}
                        >
                          View roster →
                        </button>
                      ) : (
                        <span className="text-sm text-slate-600">—</span>
                      )}
                    </Td>

                    {periodIds.map((pid, idx) => (
                      <Td key={pid} align="right" className="align-top tabular-nums">
                        {toNum(row.periodPoints[idx]).toFixed(1).replace(/\.0$/, "")}
                      </Td>
                    ))}

                    <Td align="right" className="align-top">
                      <span className="text-sm font-semibold text-slate-50 tabular-nums">
                        {toNum(row.totalPoints).toFixed(1).replace(/\.0$/, "")}
                      </span>
                    </Td>
                  </Tr>
                ))}
            </tbody>
          </Table>
        </TableCard>
      </main>
    </div>
  );
};

export default SeasonPage;
