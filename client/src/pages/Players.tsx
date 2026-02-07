import React, { useEffect, useState, useMemo } from 'react';
import { getPlayerSeasonStats, getPlayerPeriodStats, type PlayerSeasonStat, type PeriodStatRow, fmtRate } from '../api';
import PlayerExpandedRow from '../components/auction/PlayerExpandedRow';
import { POS_ORDER, getPrimaryPosition } from '../lib/baseballUtils';
import { OGBA_TEAM_NAMES } from '../lib/ogbaTeams';
import PageHeader from '../components/ui/PageHeader';
import { ThemedTable, ThemedThead, ThemedTh, ThemedTr, ThemedTd } from '../components/ui/ThemedTable';
import { getMlbTeamAbbr } from '../lib/playerDisplay';

export default function Players() {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<PlayerSeasonStat[]>([]);
  
  // View State
  const [viewGroup, setViewGroup] = useState<'hitters' | 'pitchers'>('hitters');
  const [viewMode, setViewMode] = useState<'all' | 'remaining'>('all'); 
  const [statsMode, setStatsMode] = useState<string>('season'); 
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
        
        const pSet = new Set(per.map(x => x.periodId).filter(n => typeof n === 'number'));
        setPeriods(Array.from(pSet).sort((a,b) => b-a)); 

      } catch (e: any) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const uniqueMLBTeams = useMemo(() => {
    const teams = new Set(players.map(p => p.mlb_team || 'FA'));
    return ['ALL', ...Array.from(teams).sort()];
  }, [players]);

  const uniqueFantasyTeams = useMemo(() => {
    const codes = new Set(players.map(p => p.ogba_team_code).filter(Boolean));
    return ['ALL', ...Array.from(codes).sort()];
  }, [players]);

  const uniquePositions = POS_ORDER;

  const filteredPlayers = useMemo(() => {
     const baseList = players;
     
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

     const res = baseList.filter(p => {
        if (viewGroup === 'hitters' && p.is_pitcher) return false;
        if (viewGroup === 'pitchers' && !p.is_pitcher) return false;
        if (viewMode === 'remaining' && (p.ogba_team_code || p.team)) return false;
        if (searchQuery && !p.player_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filterTeam !== 'ALL' && (p.mlb_team || 'FA') !== filterTeam) return false;
        if (filterFantasyTeam !== 'ALL' && (p.ogba_team_code || 'FA') !== filterFantasyTeam) return false;
        
        if (filterPos !== 'ALL') {
             const pPos = getPrimaryPosition(p.positions);
             if (!pPos.includes(filterPos)) return false; 
        }
        return true;
     });

     const displayList = res.map(p => {
         if (statsMode === 'season') return p;
         const s = statMap?.get(String(p.mlb_id));
         return {
             ...p,
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
             // @ts-expect-error key access
             valA = Number(a[sortKey] ?? -999);
             // @ts-expect-error key access
             valB = Number(b[sortKey] ?? -999);
             return sortDesc ? (valB as number) - (valA as number) : (valA as number) - (valB as number);
         }
     });
  }, [players, periodStats, periods, statsMode, viewGroup, viewMode, searchQuery, filterTeam, filterFantasyTeam, filterPos, sortKey, sortDesc]);


  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  if (loading) return <div className="p-8 text-center text-[var(--fbst-text-muted)]">Loading personnel intelligence...</div>;

  return (
    <div className="h-full flex flex-col bg-[var(--fbst-surface-primary)] scrollbar-hide">
       {/* Page Header */}
       <PageHeader 
         title="Personnel Registry" 
         subtitle="Synthesized intelligence on all MLB assets and their current strategic alignment."
       />

       {/* Filters Header */}
       <div className="px-6 py-4 flex flex-wrap items-center gap-6 sticky top-0 z-50">
          <div className="w-full liquid-glass rounded-3xl p-6 border border-white/10 flex flex-wrap items-center gap-6 bg-white/[0.02] backdrop-blur-2xl shadow-2xl">
              
              {/* Type Toggle */}
              <div className="flex bg-white/5 rounded-2xl p-1 border border-white/10">
                  <button 
                      onClick={() => setViewGroup('hitters')}
                      className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewGroup === 'hitters' ? 'bg-[var(--fbst-accent)] text-white shadow-lg shadow-red-500/10' : 'text-[var(--fbst-text-muted)] hover:text-white'}`}
                  >
                      Hitters
                  </button>
                  <button 
                      onClick={() => setViewGroup('pitchers')}
                      className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewGroup === 'pitchers' ? 'bg-[var(--fbst-accent)] text-white shadow-lg shadow-red-500/10' : 'text-[var(--fbst-text-muted)] hover:text-white'}`}
                  >
                      Pitchers
                  </button>
              </div>

              {/* Search */}
              <div className="relative group">
                  <input 
                       type="text" 
                       placeholder="Scan player ID..." 
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="w-56 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-xs font-bold outline-none focus:border-[var(--fbst-accent)] transition-all placeholder:text-white/20"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] opacity-20 group-focus-within:opacity-50 transition-opacity">🔍</div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                  <select 
                      value={viewMode}
                      onChange={(e) => setViewMode(e.target.value as 'all' | 'remaining')}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[var(--fbst-accent)] transition-all"
                  >
                      <option value="all" className="bg-[#0c0c0c]">All Personnel</option>
                      <option value="remaining" className="bg-[#0c0c0c]">Unassigned Assets</option>
                  </select>

                  <select 
                      value={statsMode}
                      onChange={(e) => setStatsMode(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[var(--fbst-accent)] transition-all"
                  >
                      <option value="season" className="bg-[#0c0c0c]">Cycle: Season</option>
                      {periods.map(p => (
                           <option key={p} value={`period-${p}`} className="bg-[#0c0c0c]">Deployment {p}</option>
                      ))}
                  </select>

                  <select 
                      value={filterTeam}
                      onChange={(e) => setFilterTeam(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[var(--fbst-accent)] transition-all"
                  >
                      <option value="ALL" className="bg-[#0c0c0c]">Sector: All MLB</option>
                      {uniqueMLBTeams.filter(t => t!=='ALL').map(t => <option key={t} value={t} className="bg-[#0c0c0c]">{t}</option>)}
                  </select>

                  <select 
                      value={filterFantasyTeam}
                      onChange={(e) => setFilterFantasyTeam(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[var(--fbst-accent)] transition-all"
                  >
                      <option value="ALL" className="bg-[#0c0c0c]">Organization: All</option>
                      {uniqueFantasyTeams.filter(t => t!=='ALL').map(t => <option key={t} value={t as string} className="bg-[#0c0c0c]">{OGBA_TEAM_NAMES[t as string] || t}</option>)}
                  </select>

                  <select 
                      value={filterPos}
                      onChange={(e) => setFilterPos(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[var(--fbst-accent)] transition-all"
                  >
                      <option value="ALL" className="bg-[#0c0c0c]">Role: Any</option>
                      {uniquePositions.map(p => <option key={p} value={p} className="bg-[#0c0c0c]">{p}</option>)}
                  </select>
              </div>
          </div>
       </div>

       {/* Results Table */}
       <div className="flex-1 overflow-auto px-6 pb-12">
           <div className="rounded-[32px] liquid-glass border border-white/10 shadow-2xl overflow-hidden bg-white/[0.01] backdrop-blur-xl">
               <div className="overflow-x-auto">
                   <ThemedTable>
                       <ThemedThead>
                            <ThemedTr>
                                <ThemedTh className="pl-8" onClick={() => {
                                    if (sortKey === 'name') setSortDesc(!sortDesc);
                                    else { setSortKey('name'); setSortDesc(false); }
                                }}>
                                    Identity {sortKey === 'name' && (sortDesc ? '▼' : '▲')}
                                </ThemedTh>
                                
                                {viewGroup === 'hitters' ? (
                                    <>
                                         <ThemedTh align="center" onClick={() => {
                                             if (sortKey === 'R') setSortDesc(!sortDesc);
                                             else { setSortKey('R'); setSortDesc(true); }
                                         }}>R {sortKey === 'R' && (sortDesc ? '▼' : '▲')}</ThemedTh>
                                         <ThemedTh align="center" onClick={() => {
                                             if (sortKey === 'HR') setSortDesc(!sortDesc);
                                             else { setSortKey('HR'); setSortDesc(true); }
                                         }}>HR {sortKey === 'HR' && (sortDesc ? '▼' : '▲')}</ThemedTh>
                                         <ThemedTh align="center" onClick={() => {
                                             if (sortKey === 'RBI') setSortDesc(!sortDesc);
                                             else { setSortKey('RBI'); setSortDesc(true); }
                                         }}>RBI {sortKey === 'RBI' && (sortDesc ? '▼' : '▲')}</ThemedTh>
                                         <ThemedTh align="center" onClick={() => {
                                             if (sortKey === 'SB') setSortDesc(!sortDesc);
                                             else { setSortKey('SB'); setSortDesc(true); }
                                         }}>SB {sortKey === 'SB' && (sortDesc ? '▼' : '▲')}</ThemedTh>
                                         <ThemedTh align="center" onClick={() => {
                                             if (sortKey === 'AVG') setSortDesc(!sortDesc);
                                             else { setSortKey('AVG'); setSortDesc(true); }
                                         }}>AVG {sortKey === 'AVG' && (sortDesc ? '▼' : '▲')}</ThemedTh>
                                    </>
                                ) : (
                                    <>
                                         <ThemedTh align="center" onClick={() => {
                                             if (sortKey === 'W') setSortDesc(!sortDesc);
                                             else { setSortKey('W'); setSortDesc(true); }
                                         }}>W {sortKey === 'W' && (sortDesc ? '▼' : '▲')}</ThemedTh>
                                         <ThemedTh align="center" onClick={() => {
                                             if (sortKey === 'SV') setSortDesc(!sortDesc);
                                             else { setSortKey('SV'); setSortDesc(true); }
                                         }}>SV {sortKey === 'SV' && (sortDesc ? '▼' : '▲')}</ThemedTh>
                                         <ThemedTh align="center" onClick={() => {
                                             if (sortKey === 'K') setSortDesc(!sortDesc);
                                             else { setSortKey('K'); setSortDesc(true); }
                                         }}>K {sortKey === 'K' && (sortDesc ? '▼' : '▲')}</ThemedTh>
                                         <ThemedTh align="center" onClick={() => {
                                             if (sortKey === 'ERA') setSortDesc(!sortDesc);
                                             else { setSortKey('ERA'); setSortDesc(true); }
                                         }}>ERA {sortKey === 'ERA' && (sortDesc ? '▼' : '▲')}</ThemedTh>
                                         <ThemedTh align="center" onClick={() => {
                                             if (sortKey === 'WHIP') setSortDesc(!sortDesc);
                                             else { setSortKey('WHIP'); setSortDesc(true); }
                                         }}>WHIP {sortKey === 'WHIP' && (sortDesc ? '▼' : '▲')}</ThemedTh>
                                    </>
                                )}
                                
                                <ThemedTh align="center" className="pr-8" onClick={() => {
                                    if (sortKey === 'fantasy') setSortDesc(!sortDesc);
                                    else { setSortKey('fantasy'); setSortDesc(false); }
                                }}>Deployment {sortKey === 'fantasy' && (sortDesc ? '▼' : '▲')}</ThemedTh>
                            </ThemedTr>
                       </ThemedThead>
                       <tbody className="divide-y divide-white/5">
                           {filteredPlayers.map((p: PlayerSeasonStat) => {
                               const isExpanded = expandedId === p.row_id;
                               const isTaken = !!p.ogba_team_code || !!p.team;
                               const teamLabel = p.ogba_team_code ? (OGBA_TEAM_NAMES[p.ogba_team_code] || p.ogba_team_code) : (p.team ? 'Taken' : '-');
                               const mlbTeam = getMlbTeamAbbr(p);
                               const pos = getPrimaryPosition(p.positions) || (p.is_pitcher ? 'P' : 'UT');
        
                               return (
                                   <React.Fragment key={p.row_id}>
                                       <ThemedTr 
                                           className={`group cursor-pointer ${isExpanded ? 'bg-white/10' : ''}`}
                                           onClick={() => toggleExpand(p.row_id)}
                                       >
                                           <ThemedTd className="pl-8 py-5">
                                               <div className="flex flex-col">
                                                   <span className="font-black text-[var(--fbst-text-primary)] text-lg tracking-tighter group-hover:text-[var(--fbst-accent)] transition-colors">
                                                       {p.mlb_full_name || p.player_name}
                                                   </span>
                                                   <div className="flex items-center gap-2 mt-1">
                                                       <span className="text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)] opacity-60">
                                                           {pos}
                                                       </span>
                                                       <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                                       <span className="text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)] opacity-60">
                                                           {mlbTeam || 'FA'}
                                                       </span>
                                                   </div>
                                               </div>
                                           </ThemedTd>
        
                                           {viewGroup === 'hitters' ? (
                                                <>
                                                    <ThemedTd align="center" className="font-bold tabular-nums">{p.R}</ThemedTd>
                                                    <ThemedTd align="center" className="font-bold tabular-nums">{p.HR}</ThemedTd>
                                                    <ThemedTd align="center" className="font-bold tabular-nums">{p.RBI}</ThemedTd>
                                                    <ThemedTd align="center" className="font-bold tabular-nums">{p.SB}</ThemedTd>
                                                    <ThemedTd align="center" className="font-black tabular-nums text-[var(--fbst-accent)] opacity-80">{typeof p.AVG === 'number' ? fmtRate(p.AVG) : '- '}</ThemedTd>
                                                </>
                                           ) : (
                                                <>
                                                    <ThemedTd align="center" className="font-bold tabular-nums">{p.W}</ThemedTd>
                                                    <ThemedTd align="center" className="font-bold tabular-nums">{p.SV}</ThemedTd>
                                                    <ThemedTd align="center" className="font-bold tabular-nums">{p.K}</ThemedTd>
                                                    <ThemedTd align="center" className="font-black tabular-nums text-sky-400 opacity-80">{p.ERA ? Number(p.ERA).toFixed(2) : '- '}</ThemedTd>
                                                    <ThemedTd align="center" className="font-black tabular-nums text-purple-400 opacity-80">{p.WHIP ? Number(p.WHIP).toFixed(2) : '- '}</ThemedTd>
                                                </>
                                           )}
        
                                           <ThemedTd align="center" className="pr-8 py-5">
                                               {isTaken ? (
                                                   <div className="inline-flex items-center px-4 py-1.5 rounded-2xl bg-[var(--fbst-accent)]/5 border border-[var(--fbst-accent)]/20 text-[var(--fbst-accent)] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-500/5">
                                                       {teamLabel}
                                                   </div>
                                               ) : (
                                                   <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--fbst-text-muted)] opacity-20">
                                                       Available
                                                   </div>
                                               )}
                                           </ThemedTd>
                                       </ThemedTr>
                                       
                                       {isExpanded && (
                                           <PlayerExpandedRow
                                               player={p}
                                               isTaken={isTaken}
                                               ownerName={teamLabel}
                                               colSpan={9}
                                           />
                                       )}
                                   </React.Fragment>
                               );
                           })}
                       </tbody>
                   </ThemedTable>
               </div>
           </div>
           
           {filteredPlayers.length === 0 && (
                <div className="p-20 text-center">
                    <div className="text-[var(--fbst-text-muted)] text-lg font-medium italic opacity-50">No personnel found matching your filters.</div>
                </div>
            )}
       </div>
    </div>
  );
}
