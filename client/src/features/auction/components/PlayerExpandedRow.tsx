import React, { useState, useEffect } from 'react';
import { getPrimaryPosition } from '../../../lib/baseballUtils';
import {
  PlayerSeasonStat,
  getPlayerCareerStats,
  getPlayerFieldingStats,
  CareerHittingRow,
  CareerPitchingRow,
  FieldingStatRow
} from '../../../api';

interface PlayerExpandedRowProps {
  player: PlayerSeasonStat;
  isTaken: boolean;
  ownerName?: string;
  onNominate?: (player: PlayerSeasonStat) => void;
  onQueue?: (playerId: string | number) => void;
  isQueued?: (playerId: string | number) => boolean;
  colSpan?: number;
}

export default function PlayerExpandedRow({ player, isTaken, ownerName, onNominate, onQueue, isQueued, colSpan = 7 }: PlayerExpandedRowProps) {
  const [careerStats, setCareerStats] = useState<(CareerHittingRow | CareerPitchingRow)[]>([]);
  const [fieldingStats, setFieldingStats] = useState<FieldingStatRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!player.mlb_id) return;

    const fetchStats = async () => {
        setLoading(true);
        try {
            const mode = player.is_pitcher ? 'pitching' : 'hitting';
            const [cRes, fRes] = await Promise.all([
                getPlayerCareerStats(player.mlb_id, mode),
                !player.is_pitcher ? getPlayerFieldingStats(player.mlb_id, 2024) : Promise.resolve([]) 
            ]);
            
            // Sort Career: Years ASC, then TOT last
            const rows = (cRes.rows || []).sort((a, b) => {
                if (a.year === 'TOT') return 1;
                if (b.year === 'TOT') return -1;
                return Number(a.year) - Number(b.year);
            });
            
            setCareerStats(rows);
            setFieldingStats(fRes);
        } catch (e) {
            console.error(e);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    fetchStats();
  }, [player.mlb_id, player.is_pitcher]);

  const isPitcher = player.is_pitcher;

  return (
    <tr className="bg-[var(--fbst-surface-secondary)]/20 cursor-default" onClick={e => e.stopPropagation()}>
        <td colSpan={colSpan} className="px-3 py-3">
            <div className="flex flex-col gap-3">
                
                {/* Positional Usage */}
                <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-[var(--fbst-text-muted)]">POSITIONS:</span>
                    <span className="font-mono bg-[var(--fbst-surface-elevated)] px-2 py-0.5 rounded border border-[var(--fbst-table-border)] text-[var(--fbst-text-primary)]">
                        {getPrimaryPosition(player.positions) || 'N/A'}
                    </span>
                </div>

                {/* Fielding Stats (2024) - Hitters Only */}
                {!isPitcher && fieldingStats.length > 0 && (
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-[var(--fbst-text-muted)] uppercase tracking-wider">2024 Defensive Usage</span>
                        <div className="flex flex-wrap gap-2">
                            {fieldingStats.map((f, i) => (
                                <div key={i} className="text-xs bg-[var(--fbst-surface-elevated)] border border-[var(--fbst-table-border)] px-2 py-1 rounded flex gap-2 items-center text-[var(--fbst-text-primary)]">
                                    <span className="font-bold">{f.position}</span>
                                    <span className="text-[var(--fbst-text-muted)]">{f.games} G</span>
                                    <span className="text-[var(--fbst-text-muted)]">({f.gamesStarted} GS)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Career Stats Table */}
                <div className="overflow-x-auto rounded border border-[var(--fbst-table-border)] bg-[var(--fbst-surface-elevated)]">
                    <table className="w-full text-xs text-center text-[var(--fbst-text-primary)]">
                        <thead className="bg-[var(--fbst-surface-secondary)] font-semibold text-[var(--fbst-text-muted)]">
                            <tr>
                                <th className="py-1 px-2 text-left">Year</th>
                                <th className="py-1 px-2">Team</th>
                                {isPitcher ? (
                                    <>
                                        <th>W</th><th>L</th><th>SV</th><th>K</th><th>ERA</th><th>WHIP</th><th>SO</th>
                                    </>
                                ) : (
                                    <>
                                        <th>AB</th><th>R</th><th>HR</th><th>RBI</th><th>SB</th><th>AVG</th><th>GS</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--fbst-table-border)]">
                            {loading && <tr><td colSpan={9} className="py-4 text-[var(--fbst-text-muted)]">Loading stats...</td></tr>}
                            {error && !loading && <tr><td colSpan={9} className="py-4 text-red-500">Failed to load stats.</td></tr>}
                            {!loading && !error && careerStats.map((r, i) => (
                                <tr key={i} className={r.year === 'TOT' ? 'font-bold bg-[var(--fbst-surface-secondary)]/50' : ''}>
                                    <td className="py-1 px-2 text-left">{r.year === 'TOT' ? 'Career totals' : r.year}</td>
                                    <td className="py-1 px-2">{r.tm}</td>
                                    {isPitcher ? (
                                        <>
                                            <td>{(r as CareerPitchingRow).W}</td>
                                            <td>{(r as CareerPitchingRow).L}</td>
                                            <td>{(r as CareerPitchingRow).SV}</td>
                                            <td>{(r as CareerPitchingRow).SO}</td>
                                            <td>{(r as CareerPitchingRow).ERA}</td>
                                            <td>{(r as CareerPitchingRow).WHIP}</td>
                                            <td>{(r as CareerPitchingRow).SHO}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td>{(r as CareerHittingRow).AB}</td>
                                            <td>{(r as CareerHittingRow).R}</td>
                                            <td>{(r as CareerHittingRow).HR}</td>
                                            <td>{(r as CareerHittingRow).RBI}</td>
                                            <td>{(r as CareerHittingRow).SB}</td>
                                            <td>{(r as CareerHittingRow).AVG}</td>
                                            <td>{(r as CareerHittingRow).GS}</td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2">
                    {!isTaken && onQueue && (
                        <button 
                            onClick={() => onQueue(player.mlb_id || '')}
                            className={`text-sm font-bold bg-[var(--fbst-surface-secondary)] border border-[var(--fbst-table-border)] text-[var(--fbst-text-primary)] px-4 py-2 rounded shadow hover:bg-[var(--fbst-surface-elevated)] active:scale-95 transition-all ${isQueued?.(player.mlb_id || '') ? 'text-[var(--fbst-accent-success)] border-[var(--fbst-accent-success)]' : ''}`}
                        >
                            {isQueued?.(player.mlb_id || '') ? '✓ Queued' : '+ Queue'}
                        </button>
                    )}
                    {!isTaken && onNominate && (
                        <button 
                            onClick={() => onNominate(player)}
                            className="text-sm font-bold bg-[var(--fbst-text-primary)] text-[var(--fbst-surface-primary)] px-4 py-2 rounded shadow hover:opacity-90 active:scale-95 transition-all"
                        >
                            Nominate
                        </button>
                    )}
                    {isTaken && (
                        <span className="text-xs font-bold text-[var(--fbst-text-muted)] self-center px-2">
                            {ownerName ? `Held by ${ownerName}` : 'Player Taken'}
                        </span>
                    )}
                </div>
            </div>
        </td>
    </tr>
  );
}
