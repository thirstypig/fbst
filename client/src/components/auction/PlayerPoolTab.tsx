// ... imports
import React, { useState, useMemo } from 'react';
import PlayerExpandedRow from './PlayerExpandedRow';

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

  // Render Helpers
  const Th = ({ label, sKey, w }: { label: string, sKey: string, w?: string }) => (
      <th 
        className={`px-2 py-2 text-left font-semibold cursor-pointer select-none hover:text-[var(--fbst-text-primary)] transition-colors ${sortKey === sKey ? 'text-[var(--fbst-accent-primary)]' : 'text-[var(--fbst-text-muted)]'} ${w || ''}`}
        onClick={() => handleHeaderClick(sKey)}
      >
          <div className="flex items-center gap-1">
            {label} 
            {sortKey === sKey && (sortDesc ? '▼' : '▲')}
          </div>
      </th>
  );

  return (
    <div className="h-full flex flex-col bg-[var(--fbst-surface-primary)]">
      {/* Search & Filter Header - Single Row */}
      <div className="p-2 border-b border-[var(--fbst-table-border)] flex items-center gap-3 shadow-sm bg-[var(--fbst-surface-elevated)] z-10 overflow-x-auto min-h-[50px]">
        
        {/* Group Select (Hit/Pitch) */}
        <div className="flex bg-[var(--fbst-surface-secondary)] rounded-lg p-0.5 border border-[var(--fbst-table-border)] shrink-0">
            <button 
                onClick={() => setViewGroup('hitters')}
                className={`px-3 py-1.5 text-xs font-bold rounded flex-1 transition-all ${viewGroup === 'hitters' ? 'bg-[var(--fbst-surface-elevated)] text-[var(--fbst-text-primary)] shadow-sm' : 'text-[var(--fbst-text-muted)] hover:text-[var(--fbst-text-secondary)]'}`}
            >
                Hitters
            </button>
            <button 
                onClick={() => setViewGroup('pitchers')}
                className={`px-3 py-1.5 text-xs font-bold rounded flex-1 transition-all ${viewGroup === 'pitchers' ? 'bg-[var(--fbst-surface-elevated)] text-[var(--fbst-text-primary)] shadow-sm' : 'text-[var(--fbst-text-muted)] hover:text-[var(--fbst-text-secondary)]'}`}
            >
                Pitchers
            </button>
        </div>

        {/* Search */}
        <input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-40 px-3 py-1.5 rounded-lg bg-[var(--fbst-input-bg)] border border-[var(--fbst-input-border)] text-[var(--fbst-input-text)] text-sm focus:outline-none focus:border-[var(--fbst-input-border-focus)] transition-colors"
        />

        {/* View Mode (All/Avail) */}
        <div className="flex bg-[var(--fbst-surface-secondary)] rounded-lg p-0.5 border border-[var(--fbst-table-border)] shrink-0">
            <button 
                onClick={() => setViewMode('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded ${viewMode === 'all' ? 'bg-[var(--fbst-surface-elevated)] text-[var(--fbst-text-primary)] shadow-sm' : 'text-[var(--fbst-text-muted)]'}`}
            >
                All
            </button>
            <button 
                onClick={() => setViewMode('remaining')}
                className={`px-3 py-1.5 text-xs font-medium rounded ${viewMode === 'remaining' ? 'bg-[var(--fbst-surface-elevated)] text-[var(--fbst-text-primary)] shadow-sm' : 'text-[var(--fbst-text-muted)]'}`}
            >
                Avail
            </button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-[var(--fbst-table-border)] mx-1 shrink-0" />

        {/* Filters */}
        <select 
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            className="w-24 px-2 py-1.5 text-xs rounded border border-[var(--fbst-table-border)] bg-[var(--fbst-surface-secondary)] text-[var(--fbst-text-primary)]"
        >
            {uniqueTeams.map(t => <option key={t} value={t}>{t === 'ALL' ? 'Teams' : t}</option>)}
        </select>
        <select 
            value={filterPos}
            onChange={(e) => setFilterPos(e.target.value)}
            className="w-20 px-2 py-1.5 text-xs rounded border border-[var(--fbst-table-border)] bg-[var(--fbst-surface-secondary)] text-[var(--fbst-text-primary)]"
        >
            <option value="ALL">Pos</option>
            {uniquePositions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Table Header (Sticky) */}
      <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-[var(--fbst-table-border)]">
        <table className="w-full text-sm text-left border-collapse">
            <thead className="sticky top-0 bg-[var(--fbst-surface-primary)] border-b border-[var(--fbst-table-border)] shadow-sm z-10">
                <tr>
                    <Th label="Player" sKey="name" w="pl-3" />
                  
                    {/* Consistent Statistics Columns based on View Group */}
                    {viewGroup === 'hitters' ? (
                        <>
                             <Th label="R" sKey="R" w="text-center" />
                             <Th label="HR" sKey="HR" w="text-center" />
                             <Th label="RBI" sKey="RBI" w="text-center" />
                             <Th label="SB" sKey="SB" w="text-center" />
                             <Th label="AVG" sKey="AVG" w="text-center" />
                             <Th label="GS" sKey="GS" w="text-center" />
                        </>
                    ) : (
                        <>
                             <Th label="W" sKey="W" w="text-center" />
                             <Th label="SV" sKey="SV" w="text-center" />
                             <Th label="K" sKey="K" w="text-center" />
                             <Th label="ERA" sKey="ERA" w="text-center" />
                             <Th label="WHIP" sKey="WHIP" w="text-center" />
                             <Th label="SO" sKey="SO" w="text-center" />
                        </>
                    )}
                    
            <Th label="Value" sKey="value" w="pr-3 text-center" />
                </tr>
            </thead>
            <tbody className="divide-y divide-[var(--fbst-table-border)]">
                {filteredPlayers.map(p => {
                    const isExpanded = expandedId === p.row_id;

                    const isTaken = !!p.ogba_team_code || !!p.team; 
                    const owner = teams.find(t => t.code === (p.ogba_team_code || p.team));

                    return (
                        <React.Fragment key={p.row_id}>
                            <tr 
                                className={`cursor-pointer hover:bg-[var(--fbst-table-row-hover)] transition-colors ${isExpanded ? 'bg-[var(--fbst-table-row-alt-bg)]' : ''} ${isTaken ? 'bg-[var(--fbst-surface-secondary)]/30 text-[var(--fbst-text-muted)]' : ''}`}
                                onClick={() => toggleExpand(p.row_id)}
                            >
                                <td className="pl-3 py-2">
                                    <div className={`font-semibold text-[var(--fbst-text-primary)]`}>{p.mlb_full_name || p.player_name}</div>
                                    <div className="text-[10px] text-[var(--fbst-text-muted)] flex gap-1 items-center">
                                        <span className="font-bold">{getPrimaryPosition(p.positions) || (p.is_pitcher ? 'P' : 'UT')}</span>
                                        <span>•</span>
                                        <span>{p.mlb_team || 'FA'}</span>
                                        {isTaken && (
                                            <span 
                                                className="font-bold text-[10px] text-red-600"
                                                style={{ color: '#dc2626' }}
                                                title={`Owned by ${owner ? owner.name : (p.ogba_team_code || 'Unknown')}`}
                                            >
                                                owned by {owner ? owner.name : p.ogba_team_code}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                
                                {viewGroup === 'hitters' ? (
                                    <>
                                        <td className="py-2 text-center">{p.R || '-'}</td>
                                        <td className="py-2 text-center">{p.HR || '-'}</td>
                                        <td className="py-2 text-center">{p.RBI || '-'}</td>
                                        <td className="py-2 text-center">{p.SB || '-'}</td>
                                        <td className="py-2 text-center">{typeof p.AVG === 'number' ? fmtRate(p.AVG) : '-'}</td>
                                        <td className="py-2 text-center">{p.GS || '-'}</td>
                                    </>
                                ) : (
                                    <>
                                        <td className="py-2 text-center">{p.W || '-'}</td>
                                        <td className="py-2 text-center">{p.SV || '-'}</td>
                                        <td className="py-2 text-center">{p.K || '-'}</td>
                                        <td className="py-2 text-center">{p.ERA ? Number(p.ERA).toFixed(2) : '-'}</td>
                                        <td className="py-2 text-center">{p.WHIP ? Number(p.WHIP).toFixed(2) : '-'}</td>
                                        <td className="py-2 text-center">{p.SO || '-'}</td>
                                    </>
                                )}

                                <td className="pr-3 py-2 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="font-bold text-[var(--fbst-accent-success)]">
                                            ${p.value || p.dollar_value || '-'}
                                        </span>
                                        {!isTaken && onNominate && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onNominate(p);
                                                }}
                                                className="bg-[var(--fbst-text-primary)] text-[var(--fbst-surface-primary)] text-xs font-bold px-2 py-1 rounded hover:opacity-80 active:scale-95 shadow-sm"
                                                title="Nominate Player"
                                            >
                                                Bid
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                            
                            {/* Expanded Details */}
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
        </table>
        {filteredPlayers.length === 0 && (
            <div className="p-8 text-center text-[var(--fbst-text-muted)]">
                No players found.
            </div>
        )}
      </div>
    </div>
  );
}

