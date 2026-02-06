import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSeasonStandings, getPeriodCategoryStandings } from "../lib/api";
import { OGBA_TEAM_NAMES } from "../lib/ogbaTeams";
import { useTheme } from "../contexts/ThemeContext";
import PageHeader from "../components/ui/PageHeader";
import { PeriodSummaryTable, CategoryPeriodTable, TeamPeriodSummaryRow, CategoryPeriodRow } from "../components/StatsTables";

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

const SeasonPage: React.FC = () => {
  const navigate = useNavigate();
  useTheme();

  const [viewMode, setViewMode] = useState<'season' | 'period'>('season');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Season Matrix State
  const [periodIds, setPeriodIds] = useState<number[]>([]);
  const [rows, setRows] = useState<NormalizedSeasonRow[]>([]);

  // Period Detail State
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periodSummaryRows, setPeriodSummaryRows] = useState<TeamPeriodSummaryRow[]>([]);
  const [periodCategoryRows, setPeriodCategoryRows] = useState<Record<string, CategoryPeriodRow[]>>({});

  // Sort logic for matrix
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => b.totalPoints - a.totalPoints);
  }, [rows]);

  // Initial Load: Season Standings
  useEffect(() => {
    async function loadSeason() {
      try {
        setLoading(true);
        setError(null);
        const data = await getSeasonStandings();
        setPeriodIds(data.periodIds || []);
        
        const normalized = (data.rows || []).map(r => normalizeSeasonRow(r as any, data.periodIds));
        setRows(normalized);

        if (data.periodIds?.length > 0) {
          setSelectedPeriodId(data.periodIds[data.periodIds.length - 1]);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load season standings");
      } finally {
        setLoading(false);
      }
    }
    loadSeason();
  }, []);

  // Load Period Details
  useEffect(() => {
    if (viewMode !== 'period' || !selectedPeriodId) return;

    async function loadPeriod() {
      try {
        setPeriodLoading(true);
        const resp = await getPeriodCategoryStandings(selectedPeriodId!);
        
        // Transform for Category tables
        const catMap: Record<string, CategoryPeriodRow[]> = {};
        
        // Use a map to build summary rows by team
        const teamSummaryMap = new Map<string, TeamPeriodSummaryRow>();

        (resp.categories || []).forEach((cat: any) => {
          catMap[cat.categoryId] = cat.rows || [];
          
          (cat.rows || []).forEach((row: any) => {
            const code = row.teamCode;
            if (!teamSummaryMap.has(code)) {
              teamSummaryMap.set(code, {
                teamId: code,
                teamName: OGBA_TEAM_NAMES[code] || code,
                gamesPlayed: 0, // Not currently used in this view
                totalPoints: 0,
                totalPointsDelta: 0,
                categories: []
              });
            }
            const team = teamSummaryMap.get(code)!;
            team.totalPoints += toNum(row.points);
            team.categories.push({
              categoryId: cat.categoryId,
              points: toNum(row.points)
            });
          });
        });

        setPeriodCategoryRows(catMap);
        setPeriodSummaryRows(Array.from(teamSummaryMap.values()).sort((a, b) => b.totalPoints - a.totalPoints));
      } catch (err: any) {
        console.error("Failed to load period standings", err);
      } finally {
        setPeriodLoading(false);
      }
    }
    loadPeriod();
  }, [viewMode, selectedPeriodId]);


  return (
    <div className="flex-1 min-h-screen">
      <main className="max-w-6xl mx-auto px-6 py-12">
        <PageHeader 
          title={viewMode === 'season' ? "Season Standings" : `Period ${selectedPeriodId} Standings`}
          subtitle="Roto points distribution for the full season or specific periods. Higher totals indicate stronger performance across categories."
          rightElement={
             <div className="flex gap-2 liquid-glass p-1 rounded-2xl border border-white/10 shadow-lg">
                <button
                    onClick={() => setViewMode('season')}
                    className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${viewMode === 'season' ? 'bg-[var(--fbst-accent)] text-white shadow-lg' : 'text-[var(--fbst-text-muted)] hover:text-[var(--fbst-text-primary)]'}`}
                >
                    Season
                </button>
                <button
                    onClick={() => setViewMode('period')}
                    className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${viewMode === 'period' ? 'bg-[var(--fbst-accent)] text-white shadow-lg' : 'text-[var(--fbst-text-muted)] hover:text-[var(--fbst-text-primary)]'}`}
                >
                    Period
                </button>
            </div>
          }
        />

        {error && (
          <div className="mb-8 rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm font-medium text-red-300 flex items-center gap-3">
             <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            System Error: {error}
          </div>
        )}

        {viewMode === 'season' ? (
          <div className="overflow-hidden rounded-3xl liquid-glass border border-white/10 shadow-2xl">
            <div className="bg-white/5 border-b border-white/10 px-8 py-6 flex items-center justify-between">
               <div>
                  <h2 className="text-xl font-black tracking-tight text-[var(--fbst-text-heading)]">Point Matrix</h2>
                  <div className="mt-1 text-sm font-medium text-[var(--fbst-text-muted)]">Cumulative results across all completed periods.</div>
               </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="px-6 py-4 text-left w-16 text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)]">#</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)]">Franchise</th>
                    
                    {periodIds.map((pid) => (
                      <th key={pid} className="px-4 py-4 text-center text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)] min-w-[80px]">
                        P{pid}
                      </th>
                    ))}

                    <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-[var(--fbst-accent)] min-w-[120px]">
                      TOTAL
                    </th>
                    <th className="px-6 py-4 text-right pr-8 text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)]">Link</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={periodIds.length + 4} className="px-6 py-20 text-center text-[var(--fbst-text-muted)] italic font-medium animate-pulse">
                        Synchronizing season dataset...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={periodIds.length + 4} className="px-6 py-20 text-center text-[var(--fbst-text-muted)] italic font-medium">
                        No season records available.
                      </td>
                    </tr>
                  ) : (
                    sortedRows.map((row, idx) => (
                      <tr key={row.teamId} className="hover:bg-white/5 transition-colors duration-150 group">
                        <td className="px-6 py-4 text-xs font-bold text-[var(--fbst-text-muted)] opacity-50 tabular-nums">{idx + 1}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-[var(--fbst-text-primary)]">{row.teamName}</div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)] mt-1 opacity-60">{row.teamCode || '-'}</div>
                        </td>
                        
                        {periodIds.map((_pid, pIdx) => (
                          <td key={pIdx} className="px-4 py-4 text-center font-medium text-[var(--fbst-text-primary)] tabular-nums">
                            {Number(row.periodPoints[pIdx] || 0).toFixed(1).replace(/\.0$/, "")}
                          </td>
                        ))}

                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-black text-[var(--fbst-accent)] tabular-nums">{row.totalPoints.toFixed(1).replace(/\.0$/, "")}</span>
                        </td>
                        <td className="px-6 py-4 text-right pr-8">
                           {row.teamCode ? (
                              <button
                                onClick={() => navigate(`/teams/${encodeURIComponent(row.teamCode!)}`)}
                                className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--fbst-text-muted)] hover:text-[var(--fbst-accent)] transition-all opacity-0 group-hover:opacity-100"
                              >
                                View →
                              </button>
                           ) : null}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/10 shadow-lg justify-center">
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--fbst-text-muted)]">Focus Period</span>
               <div className="flex gap-2">
                 {periodIds.map(pid => (
                   <button
                    key={pid}
                    onClick={() => setSelectedPeriodId(pid)}
                    className={`w-10 h-10 rounded-xl text-xs font-black transition-all border border-white/10 ${selectedPeriodId === pid ? 'bg-[var(--fbst-accent)] text-white shadow-lg' : 'bg-white/5 text-[var(--fbst-text-muted)] hover:bg-white/10'}`}
                   >
                     {pid}
                   </button>
                 ))}
               </div>
            </div>

            {periodLoading ? (
               <div className="text-center py-20">
                  <div className="text-[var(--fbst-text-muted)] text-lg font-medium italic animate-pulse">Scanning period telemetry...</div>
               </div>
            ) : (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <PeriodSummaryTable
                    periodId={`P${selectedPeriodId}`}
                    rows={periodSummaryRows}
                    categories={Object.keys(periodCategoryRows)}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                   {Object.keys(periodCategoryRows).map(catKey => (
                      <CategoryPeriodTable
                          key={catKey}
                          periodId={`P${selectedPeriodId}`}
                          categoryId={catKey}
                          rows={periodCategoryRows[catKey]}
                      />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default SeasonPage;
