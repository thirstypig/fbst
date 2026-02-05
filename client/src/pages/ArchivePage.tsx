// client/src/pages/ArchivePage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getArchiveSeasons, getArchivePeriods, getArchivePeriodStats, getArchiveDraftResults, updateArchiveTeamName, fmtRate } from '../api';
import { useTheme } from '../contexts/ThemeContext';
import { OGBA_TEAM_NAMES } from '../lib/ogbaTeams';
import { useAuth } from '../hooks/useAuth';
import EditPlayerNameModal from '../components/EditPlayerNameModal';
import EditTeamNameModal from '../components/EditTeamNameModal';

import ArchiveAdminPanel from '../components/ArchiveAdminPanel';
import AIInsightsModal from '../components/AIInsightsModal';
import PageHeader from '../components/ui/PageHeader';
import { 
  SeasonTable, TeamSeasonRow, PeriodMeta, 
  PeriodSummaryTable, TeamPeriodSummaryRow, CategoryId, 
  CategoryPeriodTable, CategoryPeriodRow 
} from '../components/StatsTables';

interface PlayerStat {
  id: number;
  playerName: string;
  displayName?: string;
  fullName?: string;
  mlbId?: string;
  teamCode: string;
  isPitcher: boolean;
  position?: string;
  mlbTeam?: string;
  R?: number;
  HR?: number;
  RBI?: number;
  SB?: number;
  AVG?: number;
  GS?: number; // Grand Slams
  W?: number;
  SV?: number;
  K?: number;
  ERA?: number;
  WHIP?: number;
  SO?: number; // Shut Outs
}

interface DraftPlayer {
  playerName: string;
  fullName: string;
  teamCode: string;
  position: string;
  mlbTeam: string | null;
  draftDollars: number;
  isPitcher: boolean;
  isKeeper: boolean;
  id?: number; // DB ID for edits
}

interface DraftTrade {
  fromTeamName: string;
  fromTeamCode: string;
  toTeamName: string;
  toTeamCode: string;
  amount: number;
  note: string;
}

type TabType = 'stats' | 'standings' | 'period-results' | 'draft';

// Keepers for 2024 and 2025
const KEEPER_MAP: Record<number, Record<string, string[]>> = {
  2024: {
    'DKD': ['F. Tatis Jr.', 'M. Harris II', 'J.Chisholm Jr.', 'E. De La Cruz'],
    'DLC': ['R. Acuna Jr.', 'C. Carroll', 'S. Ohtani', 'Z. Wheeler'],
    'DDD': ['C. Walker', 'F. Lindor', 'F. Alverez', 'E. Perez'],
    'SDS': ['M. Olson', 'T. Turner', 'S. Strider', 'S. Ohtani'],
    'RSR': ['F. Freeman', 'O. Cruz', 'K. Schwarber', 'F. Peralta'],
    'DD2': ['N. Jones', 'O. Albies', 'A. Riley', 'Z. Gallen'],
    'LDL': ['M. Betts', 'M. Muncy', 'W. Smith', 'B. Miller'],
    'TST': ['B. Harper', 'P. Alonso', 'M. Machado', 'M. Fried']
  },
  2025: {
    'DKD': ['E. De La Cruz', 'F. Tatis Jr.', 'D. Crews'],
    'DLC': ['C. Carroll', 'R. Acuna Jr.', 'S. Ohtani', 'P. Skenes'],
    'DDD': ['F. Lindor', 'J. Chourio', 'J. Wood', 'CJ. Abrams'],
    'SDS': ['M. Olson', 'T. Turner', 'C. Sale', 'S. Ohtani'],
    'RSR': ['F. Freeman', 'O. Cruz', 'Wilm. Contreras', 'Y. Yamamoto'],
    'DD2': ['A. Riley', 'J. Merrill', 'S. Suzuki', 'M. Vientos'],
    'LDL': ['M. Betts', 'M. Muncy', 'T. Hernandez', 'W. Smith'],
    'TST': ['P. Alonso', 'M. Machado', 'B. Harper', 'B. Snell']
  }
};

import { TableCard, Table, THead, Tr, Th, Td } from "../components/ui/TableCard";

export default function ArchivePage() {
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [periodResults, setPeriodResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [standingsLoading, setStandingsLoading] = useState(false);
  
  // Matrix / Detail State
  const [seasonRows, setSeasonRows] = useState<TeamSeasonRow[]>([]);
  const [periodSummaryRows, setPeriodSummaryRows] = useState<TeamPeriodSummaryRow[]>([]);
  const [categoryRows, setCategoryRows] = useState<Record<string, CategoryPeriodRow[]>>({});
  const [periodMeta, setPeriodMeta] = useState<PeriodMeta[]>([]);

  const [periodResultsLoading, setPeriodResultsLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string | number, direction: 'asc' | 'desc' }>({ key: 'final', direction: 'desc' });

  const handleSort = (key: string | number) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };
  const [error, setError] = useState<string | null>(null);
  const [editingStat, setEditingStat] = useState<PlayerStat| null>(null);
  const [editingTeam, setEditingTeam] = useState<{ teamCode: string; name: string } | null>(null);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabType | 'admin'>('standings');
  const [draftPlayers, setDraftPlayers] = useState<DraftPlayer[]>([]);
  const [draftTrades, setDraftTrades] = useState<DraftTrade[]>([]);
  const [draftLoading, setDraftLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [aiModalTeam, setAiModalTeam] = useState<{ code: string; name: string } | null>(null);

  const canEdit = user?.isAdmin || user?.isCommissioner || false;

  const handleRecalculate = async () => {
    if (!selectedYear || recalculating) return;
    
    // Determine context based on active tab
    const tab = activeTab === 'draft' ? 'draft' : (activeTab === 'stats' ? 'stats' : null);
    const period = activeTab === 'stats' ? selectedPeriod : null;
    
    const contextMsg = tab === 'draft' 
      ? 'Opening Day' 
      : period 
        ? `Period ${period} start date`
        : 'all periods';
    
    if (!confirm(`Recalculate MLB team data using ${contextMsg}?`)) return;
    
    try {
      setRecalculating(true);
      const response = await fetch(`/api/archive/${selectedYear}/recalculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab, periodNumber: period }),
      });
      const result = await response.json();
      if (result.success) {
        alert(`Recalculation complete! Updated ${result.updated} player records for ${result.tab === 'draft' ? 'Auction Draft' : result.periodNumber ? `Period ${result.periodNumber}` : 'all periods'}.`);
        window.location.reload();
      } else {
        alert(`Recalculation failed: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setRecalculating(false);
    }
  };

  const toggleKeeper = async (player: DraftPlayer) => {
    if (!player.id) {
      alert("Cannot edit this player. Please run 'Auto-Match' in Admin Tools first to link this record to the database.");
      return;
    }
    
    // Optimistic update
    const newValue = !player.isKeeper;
    setDraftPlayers(prev => prev.map(p => p.id === player.id ? { ...p, isKeeper: newValue } : p));

    try {
      const res = await fetch(`/api/archive/stat/${player.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ isKeeper: newValue })
      });
      
      if (!res.ok) throw new Error("Failed to update keeper status");
      
    } catch (err: any) {
      // Revert on error
      console.error(err);
      alert("Error updating keeper: " + err.message);
      setDraftPlayers(prev => prev.map(p => p.id === player.id ? { ...p, isKeeper: !newValue } : p));
    }
  };

  // Load available seasons
  useEffect(() => {
    async function loadSeasons() {
      try {
        setLoading(true);
        const data = await getArchiveSeasons();
        setSeasons(data.seasons || []);
        if (data.seasons?.length > 0) {
          // Check if there is a 2024 season
          const has2024 = data.seasons.some((s: any) => s.year === 2024);
          const selected = has2024 ? 2024 : data.seasons[0];
          setSelectedYear(typeof selected === 'number' ? selected : (selected as any).year);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load archive');
      } finally {
        setLoading(false);
      }
    }
    loadSeasons();
  }, []);

  // Load periods when year changes
  useEffect(() => {
    if (!selectedYear) return;
    async function loadPeriods() {
      try {
        setLoading(true);
        setError(null);
        const data = await getArchivePeriods(selectedYear!);
        setPeriods(data.periods || []);
        
        // Transform periods to PeriodMeta for SeasonTable
        const meta: PeriodMeta[] = (data.periods || []).map((p: any) => ({
             periodId: String(p.periodNumber),
             label: `P${p.periodNumber}`,
             meetingDate: p.startDate ? new Date(p.startDate).toLocaleDateString() : 'Draft'
        }));
        setPeriodMeta(meta);

        // Default to Full Season (0) instead of P1
        setSelectedPeriod(0);
      } catch (err: any) {
        setError(err?.message || 'Failed to load periods');
        setPeriods([]);
      } finally {
        setLoading(false);
      }
    }
    loadPeriods();
  }, [selectedYear]);

  // Load stats when period changes
  useEffect(() => {
    if (!selectedYear || !selectedPeriod) return;
    async function loadStats() {
      try {
        setLoading(true);
        setError(null);
        const data = await getArchivePeriodStats(selectedYear!, selectedPeriod!);
        setStats(data.stats || []);
        
        // Expand all teams by default
        const teams = new Set<string>(data.stats?.map((s: PlayerStat) => s.teamCode) || []);
        setExpandedTeams(teams);
      } catch (err: any) {
        setError(err?.message || 'Failed to load stats');
        setStats([]);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [selectedYear, selectedPeriod]);

  // Load draft results when year is selected
  useEffect(() => {
    if (!selectedYear) {
      setDraftPlayers([]);
      setDraftTrades([]);
      return;
    }
    async function loadDraft() {
      try {
        setDraftLoading(true);
        const data = await getArchiveDraftResults(selectedYear!);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setDraftPlayers((data.players || []).map((p: any) => ({ ...p, isKeeper: p.isKeeper ?? false })));
        setDraftTrades(data.trades || []);
      } catch {
        setDraftPlayers([]);
        setDraftTrades([]);
      } finally {
        setDraftLoading(false);
      }
    }
    loadDraft();
  }, [selectedYear]);

  // Load standings (Matrix or Detail)
  useEffect(() => {
    if (!selectedYear) {
      setSeasonRows([]);
      setPeriodSummaryRows([]);
      return;
    }
    async function loadStandings() {
      try {
        setStandingsLoading(true);
        const year = selectedYear!;
        
        // If specific Period selected: Load Detail
        if (selectedPeriod && selectedPeriod > 0) {
            const url = `/api/archive/${year}/period/${selectedPeriod}/standings`;
            const res = await fetch(url);
            const data = await res.json();
            const rawStandings = data.standings || [];

            // Transform to PeriodSummaryRow
            // Raw: { teamCode, teamName, totalScore, R, R_score, ... }
            const summary: TeamPeriodSummaryRow[] = rawStandings.map((s: any) => ({
                teamId: s.teamCode,
                teamName: OGBA_TEAM_NAMES[s.teamCode] || s.teamCode,
                gamesPlayed: s.gamesPlayed || 0, // API might not return gamesPlayed yet
                totalPoints: s.totalScore,
                totalPointsDelta: 0,
                categories: ['R','HR','RBI','SB','AVG','W','SV','K','ERA','WHIP'].map(cat => ({
                    categoryId: cat,
                    points: s[`${cat}_score`] || 0
                }))
            }));
            setPeriodSummaryRows(summary);

            // Transform to Category Rows
            const cats = ['R','HR','RBI','SB','AVG','W','SV','K','ERA','WHIP'];
            const catMap: Record<string, CategoryPeriodRow[]> = {};
            
            cats.forEach(cat => {
                catMap[cat] = rawStandings.map((s: any) => ({
                    teamId: s.teamCode,
                    teamName: OGBA_TEAM_NAMES[s.teamCode] || s.teamCode,
                    periodStat: s[cat] || (s.stats ? s.stats[cat] : 0), // Handle both flat and nested stats
                    points: s[`${cat}_score`] || 0,
                    pointsDelta: 0
                }));
            });
            setCategoryRows(catMap);

        } else {
            // Full Season Matrix
            // Need P1..Pn scores
            if (periods.length === 0) return;

            // Fetch ALL periods
            // TODO: Optimize backend to return matrix
            const promises = periods.map(p => 
                fetch(`/api/archive/${year}/period/${p.periodNumber}/standings`).then(r => r.json())
            );
            
            const results = await Promise.all(promises);
            // results[i] = { standings: [...] } for period i+1

            const teamMap: Record<string, TeamSeasonRow> = {};
            
            // Initialize teams
            // Use 1st period result to get teams? Or periods might vary? Teams usually constant.
            if (results[0]?.standings) {
                results[0].standings.forEach((s: any) => {
                    teamMap[s.teamCode] = {
                        teamId: s.teamCode,
                        teamName: OGBA_TEAM_NAMES[s.teamCode] || s.teamCode,
                        periodPoints: {},
                        seasonTotalPoints: 0
                    };
                });
            }

            // Fill Data
            results.forEach((res, idx) => {
                const pid = periods[idx].periodNumber;
                (res.standings || []).forEach((s: any) => {
                    if (!teamMap[s.teamCode]) {
                         teamMap[s.teamCode] = {
                            teamId: s.teamCode,
                            teamName: OGBA_TEAM_NAMES[s.teamCode] || s.teamCode,
                            periodPoints: {},
                            seasonTotalPoints: 0
                        };
                    }
                    teamMap[s.teamCode].periodPoints[String(pid)] = s.totalScore;
                });
            });

            // Compute Totals
            Object.values(teamMap).forEach(row => {
                row.seasonTotalPoints = Object.values(row.periodPoints).reduce((sum, v) => sum + v, 0);
            });

            setSeasonRows(Object.values(teamMap));
        }

      } catch (err) {
        console.error(err);
      } finally {
        setStandingsLoading(false);
      }
    }
    loadStandings();
  }, [selectedYear, selectedPeriod, periods]);

  // Load period results trend
  useEffect(() => {
    if (!selectedYear) {
      setPeriodResults([]);
      return;
    }
    async function loadPeriodResults() {
      try {
        setPeriodResultsLoading(true);
        const year = selectedYear!;
        const res = await fetch(`/api/archive/${year}/period-results`);
        if (!res.ok) throw new Error('Failed to load period results');
        const data = await res.json();
        setPeriodResults(data.results || []);
      } catch (err) {
        console.error(err);
        setPeriodResults([]);
      } finally {
        setPeriodResultsLoading(false);
      }
    }
    loadPeriodResults();
  }, [selectedYear]);

  // Position order for hitters: 1B, 2B, SS, 3B, OF, C, CM, MI, DH, UT
  const HITTER_POS_ORDER: Record<string, number> = {
    '1B': 1, '2B': 2, 'SS': 3, '3B': 4,
    'LF': 5, 'CF': 6, 'RF': 7, 'OF': 8,
    'C': 9, 'CM': 10, 'MI': 11, 'DH': 12, 'UT': 13
  };

  const sortHitters = (a: PlayerStat, b: PlayerStat) => {
    const orderA = HITTER_POS_ORDER[a.position || 'UT'] ?? 99;
    const orderB = HITTER_POS_ORDER[b.position || 'UT'] ?? 99;
    return orderA - orderB;
  };

  // Pitchers: SP first (no saves), then relievers (with saves) at bottom
  const sortPitchers = (a: PlayerStat, b: PlayerStat) => {
    const aHasSaves = (a.SV ?? 0) > 0;
    const bHasSaves = (b.SV ?? 0) > 0;
    if (aHasSaves !== bHasSaves) return aHasSaves ? 1 : -1;
    return (a.fullName || a.playerName).localeCompare(b.fullName || b.playerName);
  };

  // Group stats by team
  const teamGroups = stats.reduce((acc: Record<string, PlayerStat[]>, stat) => {
    if (!acc[stat.teamCode]) acc[stat.teamCode] = [];
    acc[stat.teamCode].push(stat);
    return acc;
  }, {});

  const teamCodes = Object.keys(teamGroups).sort();

  const toggleTeam = (code: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleSaveTeamName = async (newName: string) => {
    if (!selectedYear || !editingTeam) return;

    try {
      await updateArchiveTeamName(selectedYear, editingTeam.teamCode, newName);
      window.location.reload();
    } catch (err: any) {
      alert(`Error updating team name: ${err.message}`);
    }
  };

  const handleSavePlayer = (updatedStat: any) => {
    setStats(prev => prev.map(s => s.id === updatedStat.id ? updatedStat : s));
  };

  const isDark = theme === 'dark';
  const themeClasses = {
    bg: isDark ? 'bg-slate-950' : 'bg-gray-50',
    text: isDark ? 'text-slate-50' : 'text-gray-900',
    muted: isDark ? 'text-slate-400' : 'text-gray-600',
    card: isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200',
    header: isDark ? 'bg-slate-800' : 'bg-gray-100',
    row: isDark ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50',
    divider: isDark ? 'divide-slate-800 border-slate-800' : 'divide-gray-200 border-gray-200',
  };

  return (
    <div className={`flex-1 min-h-screen ${themeClasses.bg} ${themeClasses.text}`}>
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <PageHeader 
          title="Historical Archive" 
          subtitle="Browse past season statistics"
        />

        {error && (
          <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${isDark ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-red-300 bg-red-50 text-red-900'}`}>
            {error}
          </div>
        )}

        {/* Compact Selectors */}
        <div className="mb-4 flex gap-3 flex-wrap">
          <select
            value={selectedYear || ''}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className={`rounded border px-3 py-1.5 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
          >
          <option value="">Year...</option>
            {seasons.map((s) => {
              // Handle both number and object formats
              const year = typeof s === 'number' ? s : s.year;
              return (
                <option key={year} value={year}>{year}</option>
              );
            })}
          </select>

          <select
            value={selectedPeriod || ''}
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            disabled={!selectedYear}
            className={`rounded border px-3 py-1.5 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white disabled:opacity-50' : 'border-gray-300 bg-white text-gray-900 disabled:opacity-50'}`}
          >
            <option value="0">Full Season (Matrix)</option>
            {periods.map((p) => {
              // Format date range for display
              const formatDate = (dateStr: string | null) => {
                if (!dateStr) return '';
                const d = new Date(dateStr);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              };
              const startLabel = p.periodNumber === 1 ? 'Draft' : formatDate(p.startDate);
              const endLabel = formatDate(p.endDate);
              const dateRange = startLabel && endLabel ? ` (${startLabel} - ${endLabel})` : '';
              return (
                <option key={p.id} value={p.periodNumber}>
                  Period {p.periodNumber}{dateRange}
                </option>
              );
            })}
          </select>

          {/* Recalculate button for admins/commissioners */}
          {canEdit && (
            <button
              onClick={handleRecalculate}
              disabled={recalculating || !selectedYear}
              className={`ml-2 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                recalculating
                  ? 'bg-gray-400 cursor-not-allowed'
                  : isDark
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
              title="Re-fetch MLB team data for all players"
            >
              {recalculating ? 'Recalculating...' : '⟳ Recalculate'}
            </button>
          )}
        </div>

        {/* Tabs: Standings | Stats | Draft Results */}
        {selectedYear && (
          <div className="mb-4 flex gap-1">
            <button
              onClick={() => setActiveTab('standings')}
              className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                activeTab === 'standings'
                  ? isDark ? 'bg-slate-800 text-white border-b-2 border-blue-500' : 'bg-white text-gray-900 border-b-2 border-blue-500'
                  : isDark ? 'bg-slate-900/50 text-slate-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'
              }`}
            >
              Standings
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                activeTab === 'stats'
                  ? isDark ? 'bg-slate-800 text-white border-b-2 border-blue-500' : 'bg-white text-gray-900 border-b-2 border-blue-500'
                  : isDark ? 'bg-slate-900/50 text-slate-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'
              }`}
            >
              Period Stats
            </button>
            <button
              onClick={() => setActiveTab('draft')}
              className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'draft'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Auction Draft
            </button>
            {/* Admin Tab */}
            {canEdit && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'admin'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Admin Tools
              </button>
            )}
          </div>
        )}

        {/* Draft Results Tab */}
        {activeTab === 'draft' && selectedYear && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Pre-Draft Trades */}
              <div className="flex-1">
                {draftTrades.length > 0 ? (
                  <div className={`rounded-lg border p-4 ${themeClasses.card}`}>
                    <h3 className="font-semibold mb-2 text-amber-500">📝 Pre-Draft Trades</h3>
                    {draftTrades.map((trade, i) => (
                      <div key={i} className={`text-sm ${themeClasses.muted}`}>
                        <span className="font-medium">${trade.amount}</span> from {trade.fromTeamName} ({trade.fromTeamCode}) → {trade.toTeamName} ({trade.toTeamCode})
                        {trade.note && <span className="italic ml-2">"{trade.note}"</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`p-4 rounded-lg border border-dashed text-xs ${themeClasses.muted}`}>No pre-draft trades found</div>
                )}
              </div>

              {/* Keeper Legend */}
              <div className={`px-4 py-2 rounded-lg border ${themeClasses.card} text-xs`}>
                <div className="font-semibold mb-1">Legend</div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
                    <span className="text-amber-500 font-medium">Keepers</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-400 font-medium">Hitters</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-purple-400 font-medium">Pitchers</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Draft Results by Team */}
            {draftLoading ? (
              <div className={`text-center py-8 ${themeClasses.muted}`}>Loading draft results...</div>
            ) : draftPlayers.length === 0 ? (
              <div className={`text-center py-8 ${themeClasses.muted}`}>No draft results found for {selectedYear}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(OGBA_TEAM_NAMES).sort().map(teamCode => {
                  const teamPlayers = draftPlayers.filter(p => p.teamCode === teamCode);
                  if (teamPlayers.length === 0) return null;
                  
                  // Sort by position order: 1B, 2B, SS, 3B, OF, C, CM, MI, DH
                  const DRAFT_POS_ORDER: Record<string, number> = {
                    '1B': 1, '2B': 2, 'SS': 3, '3B': 4, 'OF': 5,
                    'LF': 5, 'CF': 5, 'RF': 5, 'C': 6, 'CM': 7, 'MI': 8, 'DH': 9
                  };

                  const hitters = teamPlayers.filter(p => !p.isPitcher).sort((a, b) => {
                    const posA = DRAFT_POS_ORDER[a.position] ?? 99;
                    const posB = DRAFT_POS_ORDER[b.position] ?? 99;
                    if (posA !== posB) return posA - posB;
                    return b.draftDollars - a.draftDollars;
                  });
                  const pitchers = teamPlayers.filter(p => p.isPitcher).sort((a, b) => b.draftDollars - a.draftDollars);
                  const totalSpent = teamPlayers.reduce((sum, p) => sum + p.draftDollars, 0);
                  const isExpanded = expandedTeams.has(teamCode);

                  // Keepers from database field or fallback to hardcoded map
                  const yearKeepers = KEEPER_MAP[selectedYear!]?.[teamCode] || [];

                  return (
                    <div key={teamCode} className={`rounded-lg border overflow-hidden ${themeClasses.card} self-start`}>
                      {/* Collapsible Header */}
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedTeams);
                          if (isExpanded) newExpanded.delete(teamCode);
                          else newExpanded.add(teamCode);
                          setExpandedTeams(newExpanded);
                        }}
                        className={`w-full px-3 py-2 flex items-center justify-between ${themeClasses.header} hover:opacity-80 transition-opacity`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                          <span className="font-semibold text-sm">{OGBA_TEAM_NAMES[teamCode] || teamCode}</span>
                          <span className={`text-xs ${themeClasses.muted}`}>({teamPlayers.length})</span>
                        </div>
                        <span className="text-sm font-bold text-green-500">${totalSpent}</span>
                      </button>
                      
                      {/* Collapsible Content - Compact Tables */}
                      {isExpanded && (
                        <div className="w-full">
                          {/* Hitters */}
                          {hitters.length > 0 && (
                            <div className="border-b last:border-0 overflow-x-auto">
                              <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                Hitters
                              </div>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className={isDark ? 'bg-slate-800/10' : 'bg-gray-50/50'}>
                                    <th className="px-3 py-1.5 text-left font-medium">Player</th>
                                    <th className="px-2 py-1.5 text-center font-medium w-10">Pos</th>
                                    <th className="px-2 py-1.5 text-center font-medium w-10">MLB</th>
                                    <th className="px-2 py-1.5 text-right font-medium w-12">$</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {hitters.map((p, i) => {
                                    const isKeeper = p.isKeeper || yearKeepers.some((k: string) => 
                                      p.playerName === k || p.fullName === k || p.fullName.includes(k)
                                    );
                                    return (
                                      <tr key={i} className={`border-t ${isDark ? 'border-slate-700/50' : 'border-gray-100'} ${isKeeper ? (isDark ? 'bg-amber-900/10' : 'bg-amber-50/50') : ''}`}>
                                        <td className="px-3 py-0.5">
                                          <div className="flex items-center gap-1.5 py-0.5">
                                            <span className="font-medium text-blue-400">
                                              {p.fullName}
                                            </span>
                                            {(isKeeper) && (
                                              <button
                                                className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border border-amber-500 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 cursor-default`}
                                                title="Keeper"
                                              >
                                                K
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                        <td className={`px-2 py-0.5 text-center ${themeClasses.muted}`}>{p.position}</td>
                                        <td className={`px-2 py-0.5 text-center ${themeClasses.muted}`}>{p.mlbTeam || '-'}</td>
                                        <td className="px-2 py-0.5 text-right font-medium tabular-nums text-green-500">${p.draftDollars}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Pitchers */}
                          {pitchers.length > 0 && (
                            <div className="overflow-x-auto">
                              <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'bg-purple-900/20 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                                Pitchers
                              </div>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className={isDark ? 'bg-slate-800/10' : 'bg-gray-50/50'}>
                                    <th className="px-3 py-1.5 text-left font-medium">Player</th>
                                    <th className="px-2 py-1.5 text-center font-medium w-10">Pos</th>
                                    <th className="px-2 py-1.5 text-center font-medium w-10">MLB</th>
                                    <th className="px-2 py-1.5 text-right font-medium w-12">$</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pitchers.map((p, i) => {
                                    const isKeeper = p.isKeeper || yearKeepers.some((k: string) => 
                                      p.playerName === k || p.fullName === k || p.fullName.includes(k)
                                    );
                                    return (
                                      <tr key={i} className={`border-t ${isDark ? 'border-slate-700/50' : 'border-gray-100'} ${isKeeper ? (isDark ? 'bg-amber-900/10' : 'bg-amber-50/50') : ''}`}>
                                        <td className="px-3 py-0.5">
                                          <div className="flex items-center gap-1.5 py-0.5">
                                            <span className="font-medium text-purple-400">
                                              {p.fullName}
                                            </span>
                                            {(isKeeper) && (
                                              <button
                                                className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border border-amber-500 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 cursor-default`}
                                                title="Keeper"
                                              >
                                                K
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                        <td className={`px-2 py-0.5 text-center ${themeClasses.muted}`}>{p.position}</td>
                                        <td className={`px-2 py-0.5 text-center ${themeClasses.muted}`}>{p.mlbTeam || '-'}</td>
                                        <td className="px-2 py-0.5 text-right font-medium tabular-nums text-green-500">${p.draftDollars}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}

                          <div className={`px-3 py-1.5 flex justify-between items-center text-xs font-bold border-t ${isDark ? 'border-slate-700 bg-slate-800/80' : 'border-gray-200 bg-gray-50/80'}`}>
                            <span className={themeClasses.muted}>TOTAL SPENT</span>
                            <span className="text-green-500 tabular-nums">${totalSpent}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Standings Tab Content */}
        {activeTab === 'standings' && standingsLoading && (
          <div className={`text-center py-8 ${themeClasses.muted}`}>Loading standings...</div>
        )}

        {activeTab === 'standings' && !standingsLoading && (
            selectedPeriod && selectedPeriod > 0 ? (
                // Period Detail View
                <>
                    <PeriodSummaryTable 
                        periodId={String(selectedPeriod)} 
                        rows={periodSummaryRows} 
                        categories={['R','HR','RBI','SB','AVG','W','SV','K','ERA','WHIP']} 
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                        {Object.entries(categoryRows).map(([catId, rows]) => (
                            <CategoryPeriodTable 
                                key={catId} 
                                periodId={String(selectedPeriod)} 
                                categoryId={catId} 
                                rows={rows} 
                            />
                        ))}
                    </div>
                </>
            ) : (
                // Season Matrix View
                <SeasonTable 
                    periods={periodMeta} 
                    rows={seasonRows} 
                />
            )
        )}


        {/* Period Trends Tab (Cumulative Results) */}
        {activeTab === 'period-results' && selectedYear && (
          <div className={`rounded-lg border overflow-hidden ${themeClasses.card}`}>
            {/* Legend for Period Winners (Optional) */}
            <div className="px-4 py-2 bg-amber-500/5 border-b border-amber-500/20 flex items-center justify-between">
              <span className="text-xs text-amber-500 font-semibold flex items-center gap-1.5">
                📈 Cumulative Standings Trend
              </span>
              <span className={`text-[10px] ${themeClasses.muted}`}>Click headers to sort</span>
            </div>

            <div className="overflow-x-auto">
              {periodResultsLoading ? (
                <div className={`text-center py-8 ${themeClasses.muted}`}>Calculating cumulative trends...</div>
              ) : periodResults.length === 0 ? (
                <div className={`text-center py-8 ${themeClasses.muted}`}>No period results available</div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className={isDark ? 'bg-slate-800/50' : 'bg-gray-50'}>
                      <th className="px-4 py-3 font-semibold w-64 border-b border-slate-700/50">Team Name</th>
                      {periodResults.map(p => (
                        <th 
                          key={p.periodNumber} 
                          onClick={() => handleSort(p.periodNumber)}
                          className="px-2 py-3 font-semibold text-center border-b border-slate-700/50 cursor-pointer hover:bg-slate-700/20"
                        >
                          <div className="flex items-center justify-center gap-1">
                            P{p.periodNumber}
                            {sortConfig.key === p.periodNumber && (
                              <span>{sortConfig.direction === 'desc' ? '▼' : '▲'}</span>
                            )}
                          </div>
                        </th>
                      ))}
                      <th 
                        onClick={() => handleSort('final')}
                        className="px-4 py-3 font-bold text-center border-b border-slate-700/50 bg-green-500/5 text-green-500 cursor-pointer hover:bg-green-500/10"
                      >
                        <div className="flex items-center justify-center gap-1">
                          Final
                          {sortConfig.key === 'final' && (
                            <span>{sortConfig.direction === 'desc' ? '▼' : '▲'}</span>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {periodResults.length > 0 && Object.keys(OGBA_TEAM_NAMES)
                      .sort((a, b) => {
                        const getScore = (teamCode: string, key: string | number) => {
                          if (key === 'final') {
                            const lastPeriod = periodResults[periodResults.length - 1];
                            return lastPeriod?.standings?.find((s: any) => s.teamCode === teamCode)?.totalScore || 0;
                          }
                          const period = periodResults.find(p => p.periodNumber === key);
                          return period?.standings?.find((s: any) => s.teamCode === teamCode)?.totalScore || 0;
                        };
                        const scoreA = getScore(a, sortConfig.key);
                        const scoreB = getScore(b, sortConfig.key);
                        return sortConfig.direction === 'desc' ? scoreB - scoreA : scoreA - scoreB;
                      })
                      .map((teamCode) => {
                        const finalScore = periodResults[periodResults.length - 1]?.standings
                          ?.find((s: any) => s.teamCode === teamCode)?.totalScore || 0;

                        return (
                          <tr key={teamCode} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'}>
                            <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                              {OGBA_TEAM_NAMES[teamCode] || teamCode}
                            </td>
                            {periodResults.map(p => {
                              const standing = p.standings?.find((s: any) => s.teamCode === teamCode);
                              const isWinner = standing && standing.totalScore === Math.max(...p.standings.map((s: any) => s.totalScore));
                              return (
                                <td key={p.periodNumber} className={`px-2 py-2.5 text-center transition-colors ${isWinner ? 'font-bold text-amber-500 bg-amber-500/5' : themeClasses.muted}`}>
                                  {standing ? standing.totalScore.toFixed(1) : '-'}
                                </td>
                              );
                            })}
                            <td className="px-4 py-2.5 text-center font-bold text-green-500 bg-green-500/5 tabular-nums">
                              {finalScore.toFixed(1)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
            <div className={`px-3 py-2 text-[10px] ${themeClasses.muted} border-t ${themeClasses.divider}`}>
              * Scores shown are cumulative totals at the end of each period.
            </div>
          </div>
        )}

        {/* Stats Tab Content */}
        {activeTab === 'stats' && loading && (
          <div className={`text-center py-8 ${themeClasses.muted}`}>Loading...</div>
        )}

        {activeTab === 'stats' && !loading && stats.length === 0 && selectedYear && selectedPeriod && (
          <div className={`text-center py-8 ${themeClasses.muted}`}>No stats found</div>
        )}

        {/* Team Cards */}
        {activeTab === 'stats' && !loading && stats.length > 0 && (
          <div className="space-y-3">
            <div className={`text-xs ${themeClasses.muted} mb-2`}>
              {stats.length} players • {teamCodes.length} teams
            </div>

            {teamCodes.map((teamCode) => {
              const teamPlayers = teamGroups[teamCode];
              const hitters = teamPlayers.filter(p => !p.isPitcher).sort(sortHitters);
              const pitchers = teamPlayers.filter(p => p.isPitcher).sort(sortPitchers);
              const isExpanded = expandedTeams.has(teamCode);
              const missingIds = teamPlayers.filter(p => !p.mlbId).length;

              return (
                <div key={teamCode} className={`rounded-lg border overflow-hidden ${themeClasses.card}`}>
                  {/* Team Header - Collapsible */}
                  <button
                    onClick={() => toggleTeam(teamCode)}
                    className={`w-full px-4 py-2.5 flex items-center justify-between ${themeClasses.header}`}
                  >
                    <div className="flex items-center gap-2 group relative">
                      <span className="font-semibold text-sm">{OGBA_TEAM_NAMES[teamCode] || teamCode}</span>
                       
                      <span className={`text-xs ${themeClasses.muted}`}>
                        {hitters.length}H / {pitchers.length}P
                      </span>
                      {missingIds > 0 && (
                        <span className="text-xs text-amber-500">⚠️ {missingIds}</span>
                      )}
                    </div>
                    <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className={`border-t ${themeClasses.divider} p-4`}>
                      <div className="grid grid-cols-1 gap-6">
                        {/* Hitters Table */}
                        {hitters.length > 0 && (
                          <div className={`rounded-lg border overflow-hidden ${themeClasses.card} h-fit`}>
                            <TableCard>
                              <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'}`}>
                                Hitters
                              </div>
                              <Table className="text-xs">
                                <THead>
                                  <Tr>
                                    <Th className="text-left font-medium">Player</Th>
                                    <Th className="text-center font-medium">Pos</Th>
                                    <Th className="text-left font-medium">Team</Th>
                                    <Th className="text-right font-medium">R</Th>
                                    <Th className="text-right font-medium">HR</Th>
                                    <Th className="text-right font-medium">RBI</Th>
                                    <Th className="text-right font-medium">SB</Th>
                                    <Th className="text-right font-medium">AVG</Th>
                                    <Th className="text-right font-medium">GS</Th>
                                  </Tr>
                                </THead>
                                <tbody>
                                  {hitters.map((p) => (
                                    <Tr key={p.id} onClick={() => setEditingStat(p)} className="cursor-pointer hover:bg-white/5 transition-colors">
                                      <Td className="px-2 py-1.5 border-t border-slate-800/50">
                                        <div className="flex items-center gap-1 font-medium">
                                          {p.displayName || p.fullName || p.playerName}
                                          {!p.mlbId && <span className="text-amber-500" title="Missing MLB ID">⚠️</span>}
                                        </div>
                                      </Td>
                                      <Td align="center" className="px-2 py-1.5 border-t border-slate-800/50 text-slate-500">{p.position || '—'}</Td>
                                      <Td className="px-2 py-1.5 border-t border-slate-800/50 text-xs text-slate-500">{p.mlbTeam || '—'}</Td>
                                      <Td align="center" className="px-2 py-1.5 border-t border-slate-800/50 tabular-nums">{p.R ?? '0'}</Td>
                                      <Td align="center" className="px-2 py-1.5 border-t border-slate-800/50 tabular-nums">{p.HR ?? '0'}</Td>
                                      <Td align="center" className="px-2 py-1.5 border-t border-slate-800/50 tabular-nums">{p.RBI ?? '0'}</Td>
                                      <Td align="center" className="px-2 py-1.5 border-t border-slate-800/50 tabular-nums">{p.SB ?? '0'}</Td>
                                      <Td align="center" className="px-2 py-1.5 border-t border-slate-800/50 tabular-nums">{p.AVG !== undefined ? fmtRate(p.AVG) : '.000'}</Td>
                                      <Td align="center" className="px-2 py-1.5 border-t border-slate-800/50 tabular-nums font-semibold text-sky-400">{p.GS ?? '0'}</Td>
                                    </Tr>
                                  ))}
                                </tbody>
                              </Table>
                            </TableCard>
                          </div>
                        )}

                        {/* Pitchers Table */}
                        {pitchers.length > 0 && (
                          <div className={`rounded-lg border overflow-hidden ${themeClasses.card} h-fit`}>
                            <TableCard>
                              <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-800'}`}>
                                Pitchers
                              </div>
                              <Table className="text-xs">
                                <THead>
                                  <Tr>
                                    <Th className="text-left font-medium">Player</Th>
                                    <Th className="text-center font-medium">Pos</Th>
                                    <Th className="text-left font-medium">Team</Th>
                                    <Th className="text-right font-medium">W</Th>
                                    <Th className="text-right font-medium">SV</Th>
                                    <Th className="text-right font-medium">K</Th>
                                    <Th className="text-right font-medium">ERA</Th>
                                    <Th className="text-right font-medium">WHIP</Th>
                                    <Th className="text-right font-medium">SO</Th>
                                  </Tr>
                                </THead>
                                <tbody>
                                  {pitchers.map((p) => (
                                    <Tr key={p.id} onClick={() => setEditingStat(p)} className="cursor-pointer hover:bg-white/5 transition-colors">
                                      <Td className="px-2 py-1.5 border-t border-slate-800/50">
                                        <div className="flex items-center gap-1 font-medium">
                                          {p.displayName || p.fullName || p.playerName}
                                          {!p.mlbId && <span className="text-amber-500" title="Missing MLB ID">⚠️</span>}
                                        </div>
                                      </Td>
                                      <Td align="center" className="px-2 py-1.5 border-t border-slate-800/50 text-slate-500">{p.position || 'P'}</Td>
                                      <Td className="px-2 py-1.5 border-t border-slate-800/50 text-xs text-slate-500">{p.mlbTeam || '—'}</Td>
                                      <Td align="center" className="px-2 py-1.5 border-t border-slate-800/50 tabular-nums">{p.W ?? '0'}</Td>
                                      <Td align="center" className="px-2 py-1.5 border-t border-slate-800/50 tabular-nums">{p.SV ?? '0'}</Td>
                                      <Td align="center" className="px-2 py-1.5 border-t border-slate-800/50 tabular-nums">{p.K ?? '0'}</Td>
                                      <Td align="center" className="px-2 py-1.5 border-t border-slate-800/50 tabular-nums">{p.ERA?.toFixed(2) ?? '0.00'}</Td>
                                      <Td align="center" className="px-2 py-1.5 border-t border-slate-800/50 tabular-nums">{p.WHIP?.toFixed(2) ?? '0.00'}</Td>
                                      <Td align="center" className="px-2 py-1.5 border-t border-slate-800/50 tabular-nums font-semibold text-purple-400">{p.SO ?? '0'}</Td>
                                    </Tr>
                                  ))}
                                </tbody>
                              </Table>
                            </TableCard>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Admin Tab Content */}
        {activeTab === 'admin' && canEdit && selectedYear && (
          <div className="max-w-4xl mx-auto">
             <ArchiveAdminPanel year={selectedYear} />
          </div>
        )}

        {/* Edit Modal */}
        {editingStat && (
        <EditPlayerNameModal
          onClose={() => setEditingStat(null)}
          onSave={handleSavePlayer}
          stat={editingStat}
        />
      )}

      {editingTeam && (
        <EditTeamNameModal
          isOpen={!!editingTeam}
          onClose={() => setEditingTeam(null)}
          onSave={handleSaveTeamName}
          currentName={editingTeam.name}
          teamCode={editingTeam.teamCode}
        />
      )}

      {/* AI Insights Modal */}
      {aiModalTeam && selectedYear && (
        <AIInsightsModal
          isOpen={!!aiModalTeam}
          onClose={() => setAiModalTeam(null)}
          year={selectedYear}
          teamCode={aiModalTeam.code}
          teamName={aiModalTeam.name}
        />
      )}
      </main>
    </div>
  );
}
