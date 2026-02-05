import React, { useState, useMemo } from 'react';
import { getPrimaryPosition } from '../lib/baseballUtils';
import { PlayerSeasonStat, fmtRate } from '../api';

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
        return players.filter(p => !p.ogba_team_code && !p.team);
    }, [players]);

    const filtered = useMemo(() => {
        let res = availablePlayers;
        
        // Group Filter
        if (viewGroup === 'hitters') res = res.filter(p => !p.is_pitcher);
        else res = res.filter(p => p.is_pitcher);

        if (search) {
            const q = search.toLowerCase();
            res = res.filter(p => (p.player_name || '').toLowerCase().includes(q) || (p.mlb_team || '').toLowerCase().includes(q));
        }
        if (posFilter !== 'ALL') {
             res = res.filter(p => (p.positions || '').includes(posFilter));
        }
        
        // Sort
        return res.sort((a, b) => {
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
        // Only show positions relevant to current viewGroup could be better, but ALL is fine
        players.forEach(p => {
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

    const Th = ({ label, k, w }: { label: string, k: SortKey, w?: string }) => (
        <th 
            className={`px-4 py-2 font-medium text-slate-400 cursor-pointer hover:text-white transition-colors ${w || 'text-left'} ${sortKey === k ? 'text-blue-400' : ''}`}
            onClick={() => handleSort(k)}
        >
            <div className={`flex items-center gap-1 ${w?.includes('right') ? 'justify-end' : ''}`}>
                {label}
                {sortKey === k && (sortDesc ? '▼' : '▲')}
            </div>
        </th>
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-4 mb-4 items-center">
                {/* Toggle */}
                <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                    <button 
                        onClick={() => { setViewGroup('hitters'); setSortKey('name'); }}
                        className={`px-3 py-1 text-xs font-bold rounded transition-colors ${viewGroup === 'hitters' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Hitters
                    </button>
                    <button 
                         onClick={() => { setViewGroup('pitchers'); setSortKey('name'); }}
                         className={`px-3 py-1 text-xs font-bold rounded transition-colors ${viewGroup === 'pitchers' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Pitchers
                    </button>
                </div>

                <input 
                    className="flex-1 min-w-[200px] rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                    placeholder="Search Free Agents..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                
                <select 
                     className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                     value={posFilter}
                     onChange={e => setPosFilter(e.target.value)}
                >
                    <option value="ALL">All Positions</option>
                    {uniquePositions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-slate-900 shadow-sm whitespace-nowrap">
                        <tr>
                            <Th label="Player" k="name" />
                            <Th label="Team" k="mlb_team" />
                            <Th label="Pos" k="pos" />
                            
                            {viewGroup === 'hitters' ? (
                                <>
                                    <Th label="R" k="R" w="text-center" />
                                    <Th label="HR" k="HR" w="text-center" />
                                    <Th label="RBI" k="RBI" w="text-center" />
                                    <Th label="SB" k="SB" w="text-center" />
                                    <Th label="AVG" k="AVG" w="text-center" />
                                </>
                            ) : (
                                <>
                                    <Th label="W" k="W" w="text-center" />
                                    <Th label="SV" k="SV" w="text-center" />
                                    <Th label="K" k="K" w="text-center" />
                                    <Th label="ERA" k="ERA" w="text-center" />
                                    <Th label="WHIP" k="WHIP" w="text-center" />
                                </>
                            )}
                            
                            <th className="px-4 py-2 text-center font-medium text-slate-400">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                         {filtered.map(p => (
                             <tr key={`${p.mlb_id}-${viewGroup}`} className="hover:bg-slate-800/40 transition-colors">
                                 <td className="px-4 py-2 text-slate-300 font-bold whitespace-nowrap">{p.player_name}</td>
                                 <td className="px-4 py-2 text-slate-400">{p.mlb_team}</td>
                                 <td className="px-4 py-2 text-slate-400 font-mono text-xs">{getPrimaryPosition?.(p.positions) || p.positions}</td>
                                 
                                 {viewGroup === 'hitters' ? (
                                     <>
                                         <td className="px-4 py-2 text-slate-400 text-center">{p.R}</td>
                                         <td className="px-4 py-2 text-slate-400 text-center">{p.HR}</td>
                                         <td className="px-4 py-2 text-slate-400 text-center">{p.RBI}</td>
                                         <td className="px-4 py-2 text-slate-400 text-center">{p.SB}</td>
                                         <td className="px-4 py-2 text-slate-400 text-center">{fmtRate(Number(p.AVG || 0))}</td>
                                     </>
                                 ) : (
                                     <>
                                         <td className="px-4 py-2 text-slate-400 text-center">{p.W}</td>
                                         <td className="px-4 py-2 text-slate-400 text-center">{p.SV}</td>
                                         <td className="px-4 py-2 text-slate-400 text-center">{p.K}</td>
                                         <td className="px-4 py-2 text-slate-400 text-center">{Number(p.ERA || 0).toFixed(2)}</td>
                                         <td className="px-4 py-2 text-slate-400 text-center">{Number(p.WHIP || 0).toFixed(2)}</td>
                                     </>
                                 )}

                                 <td className="px-4 py-2 text-center">
                                     <button 
                                         onClick={() => onClaim(p)}
                                         className="px-3 py-1 bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-600/50 rounded text-xs font-bold uppercase transition-colors"
                                     >
                                         Claim
                                     </button>
                                 </td>
                             </tr>
                         ))}
                         {filtered.length === 0 && (
                             <tr><td colSpan={9} className="p-8 text-center text-slate-500">No players found</td></tr>
                         )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
