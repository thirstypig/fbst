import React, { useState, useMemo } from 'react';
import PlayerExpandedRow from './PlayerExpandedRow';
import { ThemedTable, ThemedThead, ThemedTh, ThemedTr, ThemedTd } from "../ui/ThemedTable";

import { 
  PlayerSeasonStat,
  fmtRate,
} from '../../api';

interface PlayerPoolTabProps {
  players: PlayerSeasonStat[];
  teams?: { code: string; name: string }[];
  onNominate?: (player: PlayerSeasonStat) => void;
  onQueue?: (playerId: string | number) => void;
  isQueued?: (playerId: string | number) => boolean;
}

import { POS_ORDER, getPrimaryPosition } from '../../lib/baseballUtils';

export default function PlayerPoolTab({ players, teams = [], onNominate, onQueue, isQueued }: PlayerPoolTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // View State
  const [viewGroup, setViewGroup] = useState<'hitters' | 'pitchers'>('hitters');
  const [viewMode, setViewMode] = useState<'all' | 'remaining'>('all');
  
  // Sort State
  const [sortKey, setSortKey] = useState<string>('value');
  const [sortDesc, setSortDesc] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeam, setFilterTeam] = useState<string>('ALL'); // Real MLB Team
  const [filterPos, setFilterPos] = useState<string>('ALL');

  // Derived Options
  const uniqueTeams = useMemo(() => {
    const teams = new Set(players.map(p => p.mlb_team || 'FA'));
    return ['ALL', ...Array.from(teams).sort()];
  }, [players]);

  const uniquePositions = POS_ORDER;

  // Helper to get stat value
  const getStat = (p: PlayerSeasonStat, key: string) => {
      // @ts-expect-error key access
      const val = p[key] ?? p.dollar_value ?? 0;
      return Number(val) || 0;
  };

  // Filter & Sort
  const filteredPlayers = useMemo(() => {
     let res = players;

     // 0. Filter by Group (Hitter vs Pitcher)
     if (viewGroup === 'hitters') {
         res = res.filter(p => !p.is_pitcher);
     } else {
         res = res.filter(p => p.is_pitcher);
     }

     // 1. Filter Remaining
     if (viewMode === 'remaining') {
         res = res.filter(p => !p.ogba_team_code && !p.team); 
     }

     // 2. Search & Filters
     res = res.filter(p => {
        if (searchQuery && !p.player_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filterTeam !== 'ALL' && (p.mlb_team || 'FA') !== filterTeam) return false;
        
        // Pos Filter
        if (filterPos !== 'ALL') {
             const pPos = getPrimaryPosition(p.positions);
             // Strict check for position codes or substring
             if (!pPos.includes(filterPos)) return false; 
        }
        return true;
     });

     // 3. Sort
     return res.sort((a, b) => {
         let valA = 0; 
         let valB = 0;

         if (sortKey === 'value') {
             valA = Number(a.value || a.dollar_value || 0);
             valB = Number(b.value || b.dollar_value || 0);
         } else if (sortKey === 'name') {
             return sortDesc 
                ? (b.player_name || '').localeCompare(a.player_name || '')
                : (a.player_name || '').localeCompare(b.player_name || '');
         } else {
             valA = getStat(a, sortKey);
             valB = getStat(b, sortKey);
         }

         return sortDesc ? valB - valA : valA - valB;
     });
  }, [players, viewGroup, viewMode, searchQuery, filterTeam, filterPos, sortKey, sortDesc]);


  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleHeaderClick = (key: string) => {
      if (sortKey === key) {
          setSortDesc(!sortDesc);
      } else {
          setSortKey(key);
          setSortDesc(true); // Default desc for stats
      }
  };


  return (
    <div className="h-full flex flex-col bg-[var(--fbst-surface-primary)]">
      {/* Search & Filter Header */}
      <div className="p-3 border-b border-[var(--fbst-table-border)] flex items-center gap-4 shadow-sm bg-[var(--fbst-surface-elevated)] z-10 overflow-x-auto min-h-[60px] scrollbar-hide">
        
        {/* Group Select (Hit/Pitch) */}
        <div className="flex bg-white/5 rounded-2xl p-1 border border-white/10 backdrop-blur-md shrink-0">
            <button 
                onClick={() => setViewGroup('hitters')}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewGroup === 'hitters' ? 'bg-[var(--fbst-accent)] text-white shadow-lg' : 'text-[var(--fbst-text-muted)] hover:text-white hover:bg-white/5'}`}
            >
                Strike Force
            </button>
            <button 
                onClick={() => setViewGroup('pitchers')}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewGroup === 'pitchers' ? 'bg-[var(--fbst-accent)] text-white shadow-lg' : 'text-[var(--fbst-text-muted)] hover:text-white hover:bg-white/5'}`}
            >
                Defense Core
            </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
            <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white font-bold outline-none focus:border-[var(--fbst-accent)] transition-all placeholder:opacity-30"
            />
        </div>

        {/* View Mode (All/Avail) */}
        <div className="flex bg-white/5 rounded-2xl p-1 border border-white/10 backdrop-blur-md shrink-0">
            <button 
                onClick={() => setViewMode('all')}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewMode === 'all' ? 'bg-white/10 text-white' : 'text-[var(--fbst-text-muted)] hover:text-white'}`}
            >
                All
            </button>
            <button 
                onClick={() => setViewMode('remaining')}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewMode === 'remaining' ? 'bg-white/10 text-white' : 'text-[var(--fbst-text-muted)] hover:text-white'}`}
            >
                Avail
            </button>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-white/10 mx-2 shrink-0" />

        {/* Filters */}
        <div className="flex gap-2 shrink-0">
            <select 
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/10 bg-white/5 text-white outline-none focus:border-[var(--fbst-accent)] transition-all cursor-pointer"
            >
                {uniqueTeams.map(t => <option key={t} value={t} className="text-black">{t === 'ALL' ? 'Teams' : t}</option>)}
            </select>
            <select 
                value={filterPos}
                onChange={(e) => setFilterPos(e.target.value)}
                className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/10 bg-white/5 text-white outline-none focus:border-[var(--fbst-accent)] transition-all cursor-pointer"
            >
                <option value="ALL" className="text-black">Sector</option>
                {uniquePositions.map(p => <option key={p} value={p} className="text-black">{p}</option>)}
            </select>
        </div>
      </div>

      {/* Table Header (Sticky) */}
      <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-[var(--fbst-table-border)]">
        <ThemedTable>
            <ThemedThead className="sticky top-0 z-10 shadow-lg">
                <ThemedTr>
                    <ThemedTh onClick={() => handleHeaderClick('name')} className="cursor-pointer">Player</ThemedTh>
                  
                    {viewGroup === 'hitters' ? (
                        <>
                             <ThemedTh align="center" onClick={() => handleHeaderClick('R')} className="cursor-pointer">R</ThemedTh>
                             <ThemedTh align="center" onClick={() => handleHeaderClick('HR')} className="cursor-pointer">HR</ThemedTh>
                             <ThemedTh align="center" onClick={() => handleHeaderClick('RBI')} className="cursor-pointer">RBI</ThemedTh>
                             <ThemedTh align="center" onClick={() => handleHeaderClick('SB')} className="cursor-pointer">SB</ThemedTh>
                             <ThemedTh align="center" onClick={() => handleHeaderClick('AVG')} className="cursor-pointer">AVG</ThemedTh>
                             <ThemedTh align="center" onClick={() => handleHeaderClick('GS')} className="cursor-pointer">GS</ThemedTh>
                        </>
                    ) : (
                        <>
                             <ThemedTh align="center" onClick={() => handleHeaderClick('W')} className="cursor-pointer">W</ThemedTh>
                             <ThemedTh align="center" onClick={() => handleHeaderClick('SV')} className="cursor-pointer">SV</ThemedTh>
                             <ThemedTh align="center" onClick={() => handleHeaderClick('K')} className="cursor-pointer">K</ThemedTh>
                             <ThemedTh align="center" onClick={() => handleHeaderClick('ERA')} className="cursor-pointer">ERA</ThemedTh>
                             <ThemedTh align="center" onClick={() => handleHeaderClick('WHIP')} className="cursor-pointer">WHIP</ThemedTh>
                             <ThemedTh align="center" onClick={() => handleHeaderClick('SO')} className="cursor-pointer">SO</ThemedTh>
                        </>
                    )}
                    
                    <ThemedTh align="center" onClick={() => handleHeaderClick('value')} className="cursor-pointer">Value</ThemedTh>
                </ThemedTr>
            </ThemedThead>
            <tbody className="divide-y divide-[var(--fbst-table-border)]">
                {filteredPlayers.map((p: PlayerSeasonStat) => {
                    const isExpanded = expandedId === p.row_id;
                    const isTaken = !!p.ogba_team_code || !!p.team; 
                    const owner = teams.find((t: { code: string; name: string }) => t.code === (p.ogba_team_code || p.team));

                    return (
                        <React.Fragment key={p.row_id}>
                            <ThemedTr 
                                className={`cursor-pointer ${isExpanded ? 'bg-white/5' : ''} ${isTaken ? 'opacity-50' : ''}`}
                                onClick={() => toggleExpand(p.row_id)}
                            >
                                <ThemedTd className="py-3">
                                    <div className="font-black text-[var(--fbst-text-primary)] tracking-tight">
                                        {p.mlb_full_name || p.player_name}
                                    </div>
                                    <div className="text-[10px] text-[var(--fbst-text-muted)] flex gap-2 items-center font-black uppercase tracking-widest mt-0.5">
                                        <span className="text-[var(--fbst-accent)]">{getPrimaryPosition(p.positions) || (p.is_pitcher ? 'P' : 'UT')}</span>
                                        <span className="opacity-30">•</span>
                                        <span>{p.mlb_team || 'FA'}</span>
                                        {isTaken && (
                                            <>
                                                <span className="opacity-30">•</span>
                                                <span className="text-[var(--fbst-accent)]">
                                                    {owner ? owner.name : p.ogba_team_code}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </ThemedTd>
                                
                                {viewGroup === 'hitters' ? (
                                    <>
                                        <ThemedTd align="center" className="font-mono font-bold text-[var(--fbst-text-secondary)]">{p.R || '-'}</ThemedTd>
                                        <ThemedTd align="center" className="font-mono font-bold text-[var(--fbst-text-secondary)]">{p.HR || '-'}</ThemedTd>
                                        <ThemedTd align="center" className="font-mono font-bold text-[var(--fbst-text-secondary)]">{p.RBI || '-'}</ThemedTd>
                                        <ThemedTd align="center" className="font-mono font-bold text-[var(--fbst-text-secondary)]">{p.SB || '-'}</ThemedTd>
                                        <ThemedTd align="center" className="font-mono font-bold text-[var(--fbst-text-secondary)]">{typeof p.AVG === 'number' ? fmtRate(p.AVG) : '-'}</ThemedTd>
                                        <ThemedTd align="center" className="font-mono font-bold text-[var(--fbst-text-secondary)]">{p.GS || '-'}</ThemedTd>
                                    </>
                                ) : (
                                    <>
                                        <ThemedTd align="center" className="font-mono font-bold text-[var(--fbst-text-secondary)]">{p.W || '-'}</ThemedTd>
                                        <ThemedTd align="center" className="font-mono font-bold text-[var(--fbst-text-secondary)]">{p.SV || '-'}</ThemedTd>
                                        <ThemedTd align="center" className="font-mono font-bold text-[var(--fbst-text-secondary)]">{p.K || '-'}</ThemedTd>
                                        <ThemedTd align="center" className="font-mono font-bold text-[var(--fbst-text-secondary)]">{p.ERA ? Number(p.ERA).toFixed(2) : '-'}</ThemedTd>
                                        <ThemedTd align="center" className="font-mono font-bold text-[var(--fbst-text-secondary)]">{p.WHIP ? Number(p.WHIP).toFixed(2) : '-'}</ThemedTd>
                                        <ThemedTd align="center" className="font-mono font-bold text-[var(--fbst-text-secondary)]">{p.SO || '-'}</ThemedTd>
                                    </>
                                )}

                                <ThemedTd align="center">
                                    <div className="flex items-center justify-center gap-3">
                                        <span className="font-black text-[var(--fbst-accent)] tracking-tighter text-base">
                                            ${p.value || p.dollar_value || '-'}
                                        </span>
                                        {!isTaken && onNominate && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onNominate(p);
                                                }}
                                                className="bg-[var(--fbst-accent)] hover:bg-[var(--fbst-accent-hover)] text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-lg active:scale-95"
                                            >
                                                Bid
                                            </button>
                                        )}
                                    </div>
                                </ThemedTd>
                            </ThemedTr>
                            
                            {isExpanded && (
                                <PlayerExpandedRow 
                                    player={p} 
                                    isTaken={isTaken}
                                    ownerName={owner?.name || p.ogba_team_code}
                                    onNominate={onNominate}
                                    onQueue={onQueue}
                                    isQueued={isQueued}
                                    colSpan={8}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </tbody>
        </ThemedTable>
        {filteredPlayers.length === 0 && (
            <div className="py-20 text-center text-xs font-black text-[var(--fbst-text-muted)] uppercase tracking-[0.2em]">
                Zero velocity signals found
            </div>
        )}
      </div>
    </div>
  );
}

