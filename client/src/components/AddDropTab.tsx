import React, { useState, useMemo } from 'react';
import { getPrimaryPosition } from '../lib/baseballUtils';
import { PlayerSeasonStat, fmtRate } from '../api';
import { ThemedTable, ThemedThead, ThemedTh, ThemedTr, ThemedTd } from "./ui/ThemedTable";

interface AddDropTabProps {
    players: PlayerSeasonStat[];
    onClaim: (player: PlayerSeasonStat) => void;
}

type SortKey = 'name' | 'mlb_team' | 'pos' | 'R' | 'HR' | 'RBI' | 'SB' | 'AVG' | 'W' | 'SV' | 'K' | 'ERA' | 'WHIP';

export default function AddDropTab({ players, onClaim }: AddDropTabProps) {
    const [search, setSearch] = useState('');
    const [posFilter, setPosFilter] = useState('ALL');
    const [viewGroup, setViewGroup] = useState<'hitters' | 'pitchers'>('hitters');
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortDesc, setSortDesc] = useState(false);

    const availablePlayers = useMemo(() => {
        return players.filter((p: PlayerSeasonStat) => !p.ogba_team_code && !p.team);
    }, [players]);

    const filtered = useMemo(() => {
        let res = availablePlayers;
        
        // Group Filter
        if (viewGroup === 'hitters') res = res.filter((p: PlayerSeasonStat) => !p.is_pitcher);
        else res = res.filter((p: PlayerSeasonStat) => p.is_pitcher);

        if (search) {
            const q = search.toLowerCase();
            res = res.filter((p: PlayerSeasonStat) => (p.player_name || '').toLowerCase().includes(q) || (p.mlb_team || '').toLowerCase().includes(q));
        }
        if (posFilter !== 'ALL') {
             res = res.filter((p: PlayerSeasonStat) => (p.positions || '').includes(posFilter));
        }
        
        // Sort
        return [...res].sort((a: PlayerSeasonStat, b: PlayerSeasonStat) => {
             let valA: string | number = '';
             let valB: string | number = '';

             switch(sortKey) {
                 case 'name': 
                     valA = a.player_name || ''; 
                     valB = b.player_name || ''; 
                     break;
                 case 'mlb_team':
                     valA = a.mlb_team || '';
                     valB = b.mlb_team || '';
                     break;
                 case 'pos':
                     valA = getPrimaryPosition(a.positions);
                     valB = getPrimaryPosition(b.positions);
                     break;
                 default:
                     // Stats
                     valA = Number(a[sortKey as keyof PlayerSeasonStat] || 0);
                     valB = Number(b[sortKey as keyof PlayerSeasonStat] || 0);
             }

             if (typeof valA === 'string' && typeof valB === 'string') {
                 return sortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
             }
             return sortDesc ? (Number(valB) - Number(valA)) : (Number(valA) - Number(valB));
        }).slice(0, 50); // Limit display
    }, [availablePlayers, search, posFilter, viewGroup, sortKey, sortDesc]);

    const uniquePositions = useMemo(() => {
        const s = new Set<string>();
        players.forEach((p: PlayerSeasonStat) => {
            if(p.positions) p.positions.split(',').forEach((pos: string) => s.add(pos.trim()));
        });
        return Array.from(s).sort();
    }, [players]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDesc(!sortDesc);
        else {
            setSortKey(key);
            setSortDesc(true); // Default desc for stats
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4 mb-2 items-center">
                {/* Toggle */}
                <div className="flex bg-white/5 rounded-2xl p-1 border border-white/10 backdrop-blur-md">
                    <button 
                        onClick={() => { setViewGroup('hitters'); setSortKey('name'); }}
                        className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewGroup === 'hitters' ? 'bg-[var(--fbst-accent)] text-white shadow-lg' : 'text-[var(--fbst-text-muted)] hover:text-white hover:bg-white/5'}`}
                    >
                        Strike Force
                    </button>
                    <button 
                         onClick={() => { setViewGroup('pitchers'); setSortKey('name'); }}
                         className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewGroup === 'pitchers' ? 'bg-[var(--fbst-accent)] text-white shadow-lg' : 'text-[var(--fbst-text-muted)] hover:text-white hover:bg-white/5'}`}
                    >
                        Defense Core
                    </button>
                </div>

                <div className="relative flex-1 min-w-[240px]">
                    <input 
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white outline-none focus:border-[var(--fbst-accent)] transition-all font-bold placeholder:opacity-30"
                        placeholder="Search Unrestricted Agents..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                
                <select 
                     className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white outline-none focus:border-[var(--fbst-accent)] transition-all font-bold cursor-pointer"
                     value={posFilter}
                     onChange={e => setPosFilter(e.target.value)}
                >
                    <option value="ALL" className="text-black">All Sectors</option>
                    {uniquePositions.map(p => <option key={p} value={p} className="text-black">{p}</option>)}
                </select>
            </div>

            <ThemedTable>
                <ThemedThead>
                    <ThemedTr>
                        <ThemedTh onClick={() => handleSort('name')} className="cursor-pointer hover:text-[var(--fbst-text-primary)]">
                           <div className="flex items-center gap-1">Player {sortKey === 'name' && (sortDesc ? '▼' : '▲')}</div>
                        </ThemedTh>
                        <ThemedTh onClick={() => handleSort('mlb_team')} className="cursor-pointer hover:text-[var(--fbst-text-primary)]">
                           <div className="flex items-center gap-1">Team {sortKey === 'mlb_team' && (sortDesc ? '▼' : '▲')}</div>
                        </ThemedTh>
                        <ThemedTh onClick={() => handleSort('pos')} className="cursor-pointer hover:text-[var(--fbst-text-primary)]">
                           <div className="flex items-center gap-1">Sector {sortKey === 'pos' && (sortDesc ? '▼' : '▲')}</div>
                        </ThemedTh>
                        
                        {viewGroup === 'hitters' ? (
                            <>
                                <ThemedTh align="center" onClick={() => handleSort('R')} className="cursor-pointer hover:text-[var(--fbst-text-primary)]">R</ThemedTh>
                                <ThemedTh align="center" onClick={() => handleSort('HR')} className="cursor-pointer hover:text-[var(--fbst-text-primary)]">HR</ThemedTh>
                                <ThemedTh align="center" onClick={() => handleSort('RBI')} className="cursor-pointer hover:text-[var(--fbst-text-primary)]">RBI</ThemedTh>
                                <ThemedTh align="center" onClick={() => handleSort('SB')} className="cursor-pointer hover:text-[var(--fbst-text-primary)]">SB</ThemedTh>
                                <ThemedTh align="center" onClick={() => handleSort('AVG')} className="cursor-pointer hover:text-[var(--fbst-text-primary)]">AVG</ThemedTh>
                            </>
                        ) : (
                            <>
                                <ThemedTh align="center" onClick={() => handleSort('W')} className="cursor-pointer hover:text-[var(--fbst-text-primary)]">W</ThemedTh>
                                <ThemedTh align="center" onClick={() => handleSort('SV')} className="cursor-pointer hover:text-[var(--fbst-text-primary)]">SV</ThemedTh>
                                <ThemedTh align="center" onClick={() => handleSort('K')} className="cursor-pointer hover:text-[var(--fbst-text-primary)]">K</ThemedTh>
                                <ThemedTh align="center" onClick={() => handleSort('ERA')} className="cursor-pointer hover:text-[var(--fbst-text-primary)]">ERA</ThemedTh>
                                <ThemedTh align="center" onClick={() => handleSort('WHIP')} className="cursor-pointer hover:text-[var(--fbst-text-primary)]">WHIP</ThemedTh>
                            </>
                        )}
                        
                        <ThemedTh align="center">Action</ThemedTh>
                    </ThemedTr>
                </ThemedThead>
                <tbody className="divide-y divide-white/5">
                     {filtered.map(p => (
                         <ThemedTr key={`${p.mlb_id}-${viewGroup}`}>
                             <ThemedTd className="font-black text-[var(--fbst-text-primary)] tracking-tight whitespace-nowrap">{p.player_name}</ThemedTd>
                             <ThemedTd className="font-bold text-[var(--fbst-text-muted)]">{p.mlb_team}</ThemedTd>
                             <ThemedTd className="font-black text-[var(--fbst-text-secondary)] font-mono text-[10px] uppercase tracking-widest bg-white/5 py-1 px-2 rounded-lg inline-block my-3 ml-4">{getPrimaryPosition?.(p.positions) || p.positions}</ThemedTd>
                             
                             {viewGroup === 'hitters' ? (
                                 <>
                                     <ThemedTd align="center" className="font-mono">{p.R}</ThemedTd>
                                     <ThemedTd align="center" className="font-mono">{p.HR}</ThemedTd>
                                     <ThemedTd align="center" className="font-mono">{p.RBI}</ThemedTd>
                                     <ThemedTd align="center" className="font-mono">{p.SB}</ThemedTd>
                                     <ThemedTd align="center" className="font-mono">{fmtRate(Number(p.AVG || 0))}</ThemedTd>
                                 </>
                             ) : (
                                 <>
                                     <ThemedTd align="center" className="font-mono">{p.W}</ThemedTd>
                                     <ThemedTd align="center" className="font-mono">{p.SV}</ThemedTd>
                                     <ThemedTd align="center" className="font-mono">{p.K}</ThemedTd>
                                     <ThemedTd align="center" className="font-mono">{Number(p.ERA || 0).toFixed(2)}</ThemedTd>
                                     <ThemedTd align="center" className="font-mono">{Number(p.WHIP || 0).toFixed(2)}</ThemedTd>
                                 </>
                             )}

                             <ThemedTd align="center">
                                 <button 
                                     onClick={() => onClaim(p)}
                                     className="px-4 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                 >
                                     Secure
                                 </button>
                             </ThemedTd>
                         </ThemedTr>
                     ))}
                     {filtered.length === 0 && (
                         <ThemedTr><ThemedTd colSpan={9} className="py-20 text-center text-xs font-black text-[var(--fbst-text-muted)] uppercase tracking-[0.2em]">Zero velocity players found</ThemedTd></ThemedTr>
                     )}
                </tbody>
            </ThemedTable>
        </div>
    );
}
