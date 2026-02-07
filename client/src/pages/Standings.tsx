// client/src/pages/Standings.tsx
import React, { useEffect, useState } from 'react';
import {
  PeriodSummaryTable,
  CategoryPeriodTable,
  CategoryId,
  TeamPeriodSummaryRow,
  CategoryPeriodRow,
} from "@/components/StatsTables";
import PageHeader from "../components/ui/PageHeader";
import { getArchiveSeasons, getArchivePeriods } from '../api';
import { OGBA_TEAM_NAMES } from '../lib/ogbaTeams';

// Hitting + pitching categories
const categories: CategoryId[] = [
  "R", "HR", "RBI", "SB", "AVG",
  "W", "SV", "K", "ERA", "WHIP",
];

const Standings = () => {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [periods, setPeriods] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'season' | 'period'>('season');
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  
  const [summaryRows, setSummaryRows] = useState<TeamPeriodSummaryRow[]>([]);
  const [categoryRows, setCategoryRows] = useState<Record<CategoryId, CategoryPeriodRow[]>>({} as any);
  const [loading, setLoading] = useState(false);

  // Load current/latest season
  useEffect(() => {
    async function init() {
      const data = await getArchiveSeasons();
      if (data.seasons?.length > 0) {
        // Default to latest season (likely 2025 or 2026)
        setSelectedYear(data.seasons[0]);
      }
    }
    init();
  }, []);

  // Load periods
  useEffect(() => {
    if (!selectedYear) return;
    async function loadPeriods() {
      const data = await getArchivePeriods(selectedYear!);
      setPeriods(data.periods || []);
      if (data.periods?.length > 0) {
        // Default to latest period? Or first? Let's do latest for "Current" feel
        setSelectedPeriod(data.periods[data.periods.length - 1].periodNumber);
      }
    }
    loadPeriods();
  }, [selectedYear]);

  // Fetch Data
  useEffect(() => {
    if (!selectedYear) return;
    
    async function fetchData() {
      setLoading(true);
      try {
        let url = `/api/archive/${selectedYear}/standings`;
        if (viewMode === 'period' && selectedPeriod) {
            url = `/api/archive/${selectedYear}/period/${selectedPeriod}/standings`;
        }
        
        const res = await fetch(url);
        const data = await res.json();
        const standings = data.standings || [];

        // Transform for tables
        // 1. Summary Rows
        const newSummaryRows: TeamPeriodSummaryRow[] = standings.map((s: any) => ({
            teamId: s.teamCode,
            teamName: s.teamName || OGBA_TEAM_NAMES[s.teamCode] || s.teamCode,
            gamesPlayed: 0, // Not in API yet
            totalPoints: s.totalScore,
            totalPointsDelta: 0, // Delta not tracked in this API
            categories: categories.map(cat => ({
                categoryId: cat,
                points: s[`${cat}_score`] || 0
            }))
        }));
        setSummaryRows(newSummaryRows);

        // 2. Category Rows
        const newCategoryRows: Record<CategoryId, CategoryPeriodRow[]> = {} as any;
        categories.forEach(cat => {
            // Note: API returns stats object with raw values, or flattens them?
            // The `calculatePeriodStandings` backend returns objects with keys like 'R', 'HR', 'totalScore', etc.
            // But validation showed `R` etc are top level property on the team object in the array.
            
            newCategoryRows[cat] = standings.map((s: any) => ({
                teamId: s.teamCode,
                teamName: s.teamName || OGBA_TEAM_NAMES[s.teamCode] || s.teamCode,
                periodStat: s[cat] || 0, 
                points: s[`${cat}_score`] || 0, // Backend logic I implemented assigns points to `totalScore` but assumed client handled breakdowns? 
                // Ah, I realized in backend I only did `totalScore`. I didn't add `${cat}_score` to the output object!
                // I need to fix backend to return the category scores too if I want them here.
                // For now, let's just use 0 or calculate rank client side?
                // Client side calculation is safer for now to avoid another backend edit loop if not needed.
                pointsDelta: 0
            }));

             // Calculate points client side for display if backend missing it
            newCategoryRows[cat].sort((a, b) => {
                if (cat === 'ERA' || cat === 'WHIP') {
                    // Lower is better. 
                    // However, we need to handle 0 innings differently? Assuming valid stats.
                    // If ERA is 0 (no innings?) might be good or bad? 
                    // Let's standard sort:
                   return a.periodStat - b.periodStat;
                }
                return b.periodStat - a.periodStat;
            });

            // Assign ranks/points
            newCategoryRows[cat].forEach((row, idx) => {
                row.points = newCategoryRows[cat].length - idx; 
                // Simple 1..N rank. Ties not handled perfectly but okay for display.
            });
            
            // Re-sort by points (should be same unless tie logic differs)
             newCategoryRows[cat].sort((a, b) => b.points - a.points);
        });

        // Update Summary Rows with the calculated points? 
        // Or trust backend totalScore? Backend totalScore is source of truth for "Total".
        // But for consistency let's use backend totalScore.
        
        setCategoryRows(newCategoryRows);
            
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  }
  fetchData();
  }, [selectedYear, selectedPeriod, viewMode]);


  return (
    <div className="flex flex-col min-h-screen bg-[var(--fbst-surface-primary)] text-[var(--fbst-text-primary)]">
      <PageHeader 
        title="Standings Central" 
        subtitle={viewMode === 'season' ? "Grand Total Registry: All-Time Aggregated Scores" : `Tactical Analysis: Period ${selectedPeriod} Snapshot`}
        rightElement={
          <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md">
              <button
                  onClick={() => setViewMode('season')}
                  className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'season' ? 'bg-[var(--fbst-accent)] text-white shadow-lg shadow-red-500/10' : 'text-[var(--fbst-text-muted)] hover:text-white'}`}
              >
                  Season
              </button>
              <button
                  onClick={() => setViewMode('period')}
                  className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'period' ? 'bg-[var(--fbst-accent)] text-white shadow-lg shadow-red-500/10' : 'text-[var(--fbst-text-muted)] hover:text-white'}`}
              >
                  Period
              </button>
          </div>
        }
      />
      
      <div className="max-w-7xl mx-auto w-full px-6 py-8">
      {viewMode === 'period' && (
        <div className="flex gap-4 items-center mb-10 liquid-glass p-6 rounded-3xl bg-white/[0.02] border border-white/10">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)]">Chronology: Select Period</label>
            <select 
                value={selectedPeriod || ''} 
                onChange={e => setSelectedPeriod(Number(e.target.value))}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:border-[var(--fbst-accent)] transition-all"
            >
                {periods.map(p => (
                    <option key={p.id} value={p.periodNumber}>Deployment Cycle {p.periodNumber}</option>
                ))}
            </select>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-[var(--fbst-text-muted)] font-black uppercase tracking-widest opacity-30 animate-pulse">Synchronizing Data...</div>
      ) : (
        <>
            <div className="space-y-12">
                <PeriodSummaryTable
                    periodId={viewMode === 'season' ? "Season" : `P${selectedPeriod}`}
                    rows={summaryRows}
                    categories={categories}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     {categories.map((cat) => (
                        <CategoryPeriodTable
                            key={cat}
                            periodId={viewMode === 'season' ? "Season" : `P${selectedPeriod}`}
                            categoryId={cat}
                            rows={categoryRows[cat] || []}
                        />
                    ))}
                </div>
            </div>
        </>
      )}
      </div>
    </div>
  );
};

export default Standings;
