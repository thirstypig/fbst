import React, { useEffect, useState, useMemo } from 'react';
import { getPlayerSeasonStats, getPlayerPeriodStats, type PlayerSeasonStat, type PeriodStatRow, fmtRate } from '../api';
import PlayerExpandedRow from '../components/auction/PlayerExpandedRow';
import { POS_ORDER, getPrimaryPosition } from '../lib/baseballUtils';
import { OGBA_TEAM_NAMES } from '../lib/ogbaTeams';
import PageHeader from '../components/ui/PageHeader';

export default function Players() {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<PlayerSeasonStat[]>([]);
  
  // View State
  const [viewGroup, setViewGroup] = useState<'hitters' | 'pitchers'>('hitters');
  const [viewMode, setViewMode] = useState<'all' | 'remaining'>('all'); // Filter available
  const [statsMode, setStatsMode] = useState<string>('season'); // 'season' | 'period-1' ... | 'period-current'
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [periodStats, setPeriodStats] = useState<PeriodStatRow[]>([]);
  const [periods, setPeriods] = useState<number[]>([]);


  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeam, setFilterTeam] = useState<string>('ALL'); // MLB Team
  const [filterFantasyTeam, setFilterFantasyTeam] = useState<string>('ALL'); // OGBA Team
  const [filterPos, setFilterPos] = useState<string>('ALL');

  // Sort State
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDesc, setSortDesc] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, per] = await Promise.all([
             getPlayerSeasonStats(),
             getPlayerPeriodStats()
        ]);
        setPlayers(p);
        setPeriodStats(per);
        
        // Extract unique periods
        const pSet = new Set(per.map(x => x.periodId).filter(n => typeof n === 'number'));
        setPeriods(Array.from(pSet).sort((a,b) => b-a)); // Descending

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Derived Options
  const uniqueMLBTeams = useMemo(() => {
    const teams = new Set(players.map(p => p.mlb_team || 'FA'));
    return ['ALL', ...Array.from(teams).sort()];
  }, [players]);

  const uniqueFantasyTeams = useMemo(() => {
    // Only use current active teams (keys in OGBA_TEAM_NAMES that are 3 chars and present in data?)
    // Actually simplicity: just get all codes from players
    const codes = new Set(players.map(p => p.ogba_team_code).filter(Boolean));
    return ['ALL', ...Array.from(codes).sort()];
  }, [players]);

  const uniquePositions = POS_ORDER;

  // Filter & Sort
  const filteredPlayers = useMemo(() => {
     const baseList = players;

     // If statsMode is NOT season, we need to map period stats or merge them?
     // Efficient approach: Create a map of Period Stats for the selected period.
     
     let statMap: Map<string, PeriodStatRow> | null = null;
     if (statsMode !== 'season') {
         const targetP = statsMode === 'period-current' ? Math.max(...periods, 0) : Number(statsMode.split('-')[1]);
         statMap = new Map();
         periodStats.forEach(ps => {
             if (ps.periodId === targetP) {
                 statMap!.set(String(ps.mlbId), ps);
             }
         });
     }

     // Filter
     const res = baseList.filter(p => {
        // ... metadata filters match
        
        // Group
        if (viewGroup === 'hitters' && p.is_pitcher) return false;
        if (viewGroup === 'pitchers' && !p.is_pitcher) return false;

        // Mode
        if (viewMode === 'remaining' && (p.ogba_team_code || p.team)) return false;

        // Search
        if (searchQuery && !p.player_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filterTeam !== 'ALL' && (p.mlb_team || 'FA') !== filterTeam) return false;
        if (filterFantasyTeam !== 'ALL' && (p.ogba_team_code || 'FA') !== filterFantasyTeam) return false;
        
        if (filterPos !== 'ALL') {
             const pPos = getPrimaryPosition(p.positions);
             if (!pPos.includes(filterPos)) return false; 
        }
        return true;
     });

     // Attach stats if period mode
     // We return a wrapper or modifies object? Modifying might be risky for memo.
     // Let's map to a display object.
     const displayList = res.map(p => {
         if (statsMode === 'season') return p;
         const s = statMap?.get(String(p.mlb_id));
         // Merge stats.
         return {
             ...p,
             // Overwrite stats with explicit number conversion to satisfy type and ReactNode
             R: Number(s?.R ?? 0),
             HR: Number(s?.HR ?? 0),
             RBI: Number(s?.RBI ?? 0),
             SB: Number(s?.SB ?? 0),
             AVG: Number(s?.AVG ?? 0),
             W: Number(s?.W ?? 0),
             SV: Number(s?.SV ?? 0),
             K: Number(s?.K ?? 0),
             ERA: Number(s?.ERA ?? 0),
             WHIP: Number(s?.WHIP ?? 0),
         } as PlayerSeasonStat;
     });


     // Sort
     return displayList.sort((a, b) => {
         let valA: string | number = 0; 
         let valB: string | number = 0;

         if (sortKey === 'name') {
             valA = a.mlb_full_name || a.player_name || '';
             valB = b.mlb_full_name || b.player_name || '';
             return sortDesc ? valB.toString().localeCompare(valA.toString()) : valA.toString().localeCompare(valB.toString());
         } else if (sortKey === 'fantasy') {
             valA = a.ogba_team_code || 'ZZZ'; 
             valB = b.ogba_team_code || 'ZZZ';
             return sortDesc ? valB.toString().localeCompare(valA.toString()) : valA.toString().localeCompare(valB.toString());
         } else {
             // Stat sort
             // @ts-expect-error key access
             valA = Number(a[sortKey] ?? -999);
             // @ts-expect-error key access
             valB = Number(b[sortKey] ?? -999);
             return sortDesc ? (valB as number) - (valA as number) : (valA as number) - (valB as number);
         }
     });
  }, [players, periodStats, periods, statsMode, viewGroup, viewMode, searchQuery, filterTeam, filterFantasyTeam, filterPos, sortKey, sortDesc]);


  const handleHeaderClick = (key: string) => {
      if (sortKey === key) {
          setSortDesc(!sortDesc);
      } else {
          setSortKey(key);
          setSortDesc(true); // Default desc for stats
      }
  };

  const Th = ({ label, sKey, w }: { label: string, sKey: string, w?: string }) => (
      <th 
        className={`px-2 py-2 font-semibold cursor-pointer select-none hover:text-[var(--fbst-text-primary)] transition-colors ${sortKey === sKey ? 'text-[var(--fbst-accent-primary)]' : 'text-[var(--fbst-text-muted)]'} ${w || 'text-left'}`}
        onClick={() => handleHeaderClick(sKey)}
      >
          <div className={`flex items-center gap-1 ${w?.includes('text-center') ? 'justify-center' : (w?.includes('text-right') ? 'justify-end' : '')}`}>
            {label} 
            {sortKey === sKey && (sortDesc ? '▼' : '▲')}
          </div>
      </th>
  );

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  if (loading) return <div className="p-8 text-center text-[var(--fbst-text-muted)]">Loading players...</div>;

  return (
    <div className="h-full flex flex-col bg-[var(--fbst-surface-primary)]">
       {/* Page Header */}
       <PageHeader 
         title="Players" 
         subtitle="Browse, sort, and filter all MLB players and their current fantasy status."
       />

       {/* Filters Header */}
       <div className="p-4 border-b border-[var(--fbst-table-border)] flex flex-wrap items-center gap-4 bg-[var(--fbst-surface-elevated)] z-10 sticky top-0 shadow-sm">
          
           {/* Hitter/Pitcher Toggle */}
           <div className="flex bg-[var(--fbst-surface-secondary)] rounded-lg p-1 border border-[var(--fbst-table-border)]">
               <button 
                   onClick={() => setViewGroup('hitters')}
                   className={`px-4 py-1.5 text-sm font-bold rounded flex-1 transition-all ${viewGroup === 'hitters' ? 'bg-[var(--fbst-surface-elevated)] text-[var(--fbst-text-primary)] shadow-sm' : 'text-[var(--fbst-text-muted)] hover:text-[var(--fbst-text-secondary)]'}`}
               >
                   Hitters
               </button>
               <button 
                   onClick={() => setViewGroup('pitchers')}
                   className={`px-4 py-1.5 text-sm font-bold rounded flex-1 transition-all ${viewGroup === 'pitchers' ? 'bg-[var(--fbst-surface-elevated)] text-[var(--fbst-text-primary)] shadow-sm' : 'text-[var(--fbst-text-muted)] hover:text-[var(--fbst-text-secondary)]'}`}
               >
                   Pitchers
               </button>
           </div>

           {/* Search */}
           <input 
                type="text" 
                placeholder="Search players..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 px-3 py-1.5 rounded-lg bg-[var(--fbst-input-bg)] border border-[var(--fbst-input-border)] text-[var(--fbst-input-text)] text-sm focus:outline-none focus:border-[var(--fbst-input-border-focus)]"
           />

           {/* Filters */}
            <select 
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'all' | 'remaining')}
                className="px-2 py-1.5 text-sm rounded border border-[var(--fbst-table-border)] bg-[var(--fbst-surface-secondary)] text-[var(--fbst-text-primary)]"
            >
                <option value="all">All Players</option>
                <option value="remaining">Available Only</option>
            </select>

            <select 
                value={statsMode}
                onChange={(e) => setStatsMode(e.target.value)}
                className="px-2 py-1.5 text-sm rounded border border-[var(--fbst-table-border)] bg-[var(--fbst-surface-secondary)] text-[var(--fbst-text-primary)]"
            >
                <option value="season">Season (YTD)</option>
                {/* <option value="period-current">Current Period (Up to Date)</option> */}
                {periods.map(p => (
                     <option key={p} value={`period-${p}`}>Period {p}</option>
                ))}
            </select>

            <select 
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                className="px-2 py-1.5 text-sm rounded border border-[var(--fbst-table-border)] bg-[var(--fbst-surface-secondary)] text-[var(--fbst-text-primary)]"
            >
                <option value="ALL">All MLB Teams</option>
                {uniqueMLBTeams.filter(t => t!=='ALL').map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select 
                value={filterFantasyTeam}
                onChange={(e) => setFilterFantasyTeam(e.target.value)}
                className="px-2 py-1.5 text-sm rounded border border-[var(--fbst-table-border)] bg-[var(--fbst-surface-secondary)] text-[var(--fbst-text-primary)]"
            >
                <option value="ALL">All Fantasy Teams</option>
                {uniqueFantasyTeams.filter(t => t!=='ALL').map(t => <option key={t} value={t as string}>{OGBA_TEAM_NAMES[t as string] || t}</option>)}
            </select>

            <select 
                value={filterPos}
                onChange={(e) => setFilterPos(e.target.value)}
                className="px-2 py-1.5 text-sm rounded border border-[var(--fbst-table-border)] bg-[var(--fbst-surface-secondary)] text-[var(--fbst-text-primary)]"
            >
                <option value="ALL">Position</option>
                {uniquePositions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
       </div>

       {/* Results Table */}
       <div className="flex-1 overflow-auto px-4 pb-8">
           <div className="rounded-3xl liquid-glass border border-white/10 shadow-xl overflow-hidden">
               <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left border-collapse">
                       <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                <Th label="Player" sKey="name" w="pl-6 text-left" />
                                
                                {viewGroup === 'hitters' ? (
                                    <>
                                         <Th label="R" sKey="R" w="text-center" />
                                         <Th label="HR" sKey="HR" w="text-center" />
                                         <Th label="RBI" sKey="RBI" w="text-center" />
                                         <Th label="SB" sKey="SB" w="text-center" />
                                         <Th label="AVG" sKey="AVG" w="text-center" />
                                    </>
                                ) : (
                                    <>
                                         <Th label="W" sKey="W" w="text-center" />
                                         <Th label="SV" sKey="SV" w="text-center" />
                                         <Th label="K" sKey="K" w="text-center" />
                                         <Th label="ERA" sKey="ERA" w="text-center" />
                                         <Th label="WHIP" sKey="WHIP" w="text-center" />
                                    </>
                                )}
                                
                                <Th label="Fantasy Team" sKey="fantasy" w="pr-6 text-center" />
                            </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                           {filteredPlayers.map(p => {
                               const isExpanded = expandedId === p.row_id;
                               const isTaken = !!p.ogba_team_code || !!p.team;
                               const teamName = p.ogba_team_code ? (OGBA_TEAM_NAMES[p.ogba_team_code] || p.ogba_team_code) : (p.team ? 'Taken' : '-');
        
                               return (
                                   <React.Fragment key={p.row_id}>
                                       <tr 
                                           className={`cursor-pointer hover:bg-white/5 transition-colors ${isExpanded ? 'bg-white/10' : ''}`}
                                           onClick={() => toggleExpand(p.row_id)}
                                       >
                                           <td className="pl-6 py-4">
                                               <div className="font-bold text-[var(--fbst-text-primary)] text-base leading-tight">{p.mlb_full_name || p.player_name}</div>
                                               <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--fbst-text-muted)] flex gap-2 mt-1">
                                                   <span className="bg-white/10 px-1.5 py-0.5 rounded">{getPrimaryPosition(p.positions) || (p.is_pitcher ? 'P' : 'UT')}</span>
                                                   <span className="opacity-70">{p.mlb_team || 'FA'}</span>
                                               </div>
                                           </td>
        
                                           {viewGroup === 'hitters' ? (
                                                <>
                                                    <td className="text-center py-4 font-medium">{p.R}</td>
                                                    <td className="text-center py-4 font-medium">{p.HR}</td>
                                                    <td className="text-center py-4 font-medium">{p.RBI}</td>
                                                    <td className="text-center py-4 font-medium">{p.SB}</td>
                                                    <td className="text-center py-4 font-medium tabular-nums">{typeof p.AVG === 'number' ? fmtRate(p.AVG) : '-'}</td>
                                                </>
                                           ) : (
                                                <>
                                                    <td className="text-center py-4 font-medium">{p.W}</td>
                                                    <td className="text-center py-4 font-medium">{p.SV}</td>
                                                    <td className="text-center py-4 font-medium">{p.K}</td>
                                                    <td className="text-center py-4 font-medium tabular-nums">{p.ERA ? Number(p.ERA).toFixed(2) : '-'}</td>
                                                    <td className="text-center py-4 font-medium tabular-nums">{p.WHIP ? Number(p.WHIP).toFixed(2) : '-'}</td>
                                                </>
                                           )}
        
                                           <td className="pr-6 py-4 text-center">
                                               {isTaken && (
                                                   <span className="bg-[var(--fbst-accent)]/10 text-[var(--fbst-accent)] px-3 py-1 rounded-full text-xs font-bold ring-1 ring-[var(--fbst-accent)]/30">
                                                       {teamName}
                                                   </span>
                                               )}
                                               {!isTaken && <span className="text-[var(--fbst-text-muted)] text-xs font-medium italic opacity-60">Available</span>}
                                           </td>
                                       </tr>
                                       
                                       {isExpanded && (
                                           <PlayerExpandedRow
                                               player={p}
                                               isTaken={isTaken}
                                               ownerName={teamName}
                                               colSpan={9}
                                           />
                                       )}
                                   </React.Fragment>
                               );
                           })}
                       </tbody>
                   </table>
               </div>
           </div>
           
           {filteredPlayers.length === 0 && (
                <div className="p-20 text-center">
                    <div className="text-[var(--fbst-text-muted)] text-lg font-medium italic opacity-50">No players found matching your filters.</div>
                </div>
            )}
       </div>
    </div>
  );
}
