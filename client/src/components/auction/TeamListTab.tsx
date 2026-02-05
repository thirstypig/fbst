import React, { useState, useEffect } from 'react';
import { PlayerSeasonStat } from '../../api';
import PlayerExpandedRow from './PlayerExpandedRow';

interface Team {
  id: number;
  name: string;
  code: string;
  budget: number;
  maxBid: number;
  rosterCount: number;
  roster?: { id: number; playerId: number; price: number; assignedPosition?: string | null }[];
  isMe?: boolean;
}

interface TeamListTabProps {
  teams?: Team[];
  players?: PlayerSeasonStat[];
}

export default function TeamListTab({ teams = [], players = [] }: TeamListTabProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailedRoster, setDetailedRoster] = useState<any[] | null>(null);
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(null);

  // Styles matching Archive Page
  const HITTER_COLOR = 'text-blue-600 dark:text-blue-400';
  const PITCHER_COLOR = 'text-purple-600 dark:text-purple-400';
  const KEEPER_SLOT_COLOR = 'text-amber-600 dark:text-amber-500 bg-amber-500/10 border-amber-500/20';

  // Fetch detailed roster when expanding
  useEffect(() => {
    if (!expandedId) {
        setDetailedRoster(null);
        return;
    }

    // If we have detailed roster for this ID already, maybe keep it? 
    // But we want to refresh on re-expand too.
    const fetchRoster = async () => {
        try {
            setLoadingIds(prev => new Set(prev).add(expandedId));
            const res = await fetch(`/api/teams/${expandedId}/summary`);
            if (!res.ok) throw new Error("Failed to fetch team summary");
            const data = await res.json();
            setDetailedRoster(data.currentRoster);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingIds(prev => {
                const next = new Set(prev);
                next.delete(expandedId);
                return next;
            });
        }
    };
    fetchRoster();
  }, [expandedId]);

  const handlePositionSwap = async (teamId: number, rosterId: number, newPos: string) => {
      // Optimistic update
      setDetailedRoster(prev => {
          if (!prev) return prev;
          return prev.map(r => {
              if (r.id === rosterId) {
                  return { ...r, assignedPosition: newPos };
              }
              return r;
          });
      });

      try {
           const res = await fetch(`/api/teams/${teamId}/roster/${rosterId}`, {
               method: 'PATCH',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ assignedPosition: newPos })
           });
           
           if (!res.ok) {
               throw new Error("Failed to update");
           }
           
           // Optionally confirm with server data, but optimistic is usually enough for this UX.
           // However, let's keep the re-fetch to be safe and ensure consistency with other fields if they changed.
           // Actually, if we re-fetch immediately, we might race? 
           // Let's just rely on the verify step or re-fetch silently.
           // For now, sticking with re-fetch to be robust against "smart" backend logic.
           const summaryRes = await fetch(`/api/teams/${teamId}/summary`);
           const data = await summaryRes.json();
           setDetailedRoster(data.currentRoster);

      } catch(err) {
          console.error("Failed to swap pos", err);
          alert("Failed to update position. Reverting...");
          // Revert would require keeping old state or just re-fetching.
          // Let's just re-fetch origin to reset.
          const summaryRes = await fetch(`/api/teams/${teamId}/summary`);
          if (summaryRes.ok) {
              const data = await summaryRes.json();
              setDetailedRoster(data.currentRoster);
          }
      }
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--fbst-table-border)]">
        <div className="divide-y divide-[var(--fbst-table-border)]">
            {teams.map((team, idx) => {
                const isExpanded = expandedId === team.id;
                const isLoading = loadingIds.has(team.id);
                
                // Use detailed roster if available for this team, otherwise fallback to props (which might be stale)
                const rosterSource = (isExpanded && detailedRoster) ? detailedRoster : (team.roster || []);
                
                const roster = rosterSource.map((rItem: any) => {
                   return {
                       ...rItem,
                       stat: players.find(p => String(p.mlb_id) == String(rItem.playerId)) 
                   };
                });
                
                return (
                    <div key={team.id} className={`bg-[var(--fbst-table-row-bg)] ${team.isMe ? 'bg-[var(--fbst-accent-warning)]/5' : ''}`}>
                        <div 
                            className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[var(--fbst-table-row-hover)]"
                            onClick={() => setExpandedId(isExpanded ? null : team.id)}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-[var(--fbst-text-muted)] font-mono text-xs w-4">{idx + 1}</span>
                                <div className="flex flex-col">
                                    <span className={`font-semibold ${team.isMe ? 'text-[var(--fbst-accent-primary)]' : 'text-[var(--fbst-text-primary)]'}`}>
                                        {team.name}
                                    </span>
                                    <span className="text-xs text-[var(--fbst-text-muted)]">{team.rosterCount} / 26 players</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 text-right">
                                <div className="flex flex-col">
                                    <span className="text-xs text-[var(--fbst-text-muted)] uppercase">Budget</span>
                                    <span className="font-bold text-[var(--fbst-text-primary)]">${team.budget}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-[var(--fbst-text-muted)] uppercase">Max</span>
                                    <span className="font-bold text-[var(--fbst-accent-success)]">${team.maxBid}</span>
                                </div>
                                <div className={`text-[var(--fbst-text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</div>
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="bg-[var(--fbst-surface-primary)] border-t border-[var(--fbst-table-border)]">
                                {isLoading ? (
                                    <div className="px-4 py-6 text-center text-[var(--fbst-text-muted)] italic text-xs">
                                        Loading roster...
                                    </div>
                                ) : (
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-[var(--fbst-surface-secondary)] text-[var(--fbst-text-muted)] text-xs uppercase font-semibold">
                                            <tr>
                                                <th className="px-4 py-2 w-12">Pos</th>
                                                <th className="px-2 py-2">Player</th>
                                                <th className="px-4 py-2 text-right">Salary</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--fbst-table-border)]">
                                            {roster.map((entry: any) => {
                                                const mlbId = entry.mlbId || entry.playerId; 
                                                const name = entry.name || `Player #${entry.playerId}`;
                                                
                                                const stat = players.find(p => String(p.mlb_id) == String(mlbId));
                                                const displayName = stat?.mlb_full_name || stat?.player_name || name;
                                                const displayPos = entry.assignedPosition || stat?.positions || 'BN';
                                                
                                                // Construct a synthetic player object if stat is missing, for the expanded view
                                                const playerObj = stat || {
                                                    mlb_id: mlbId,
                                                    player_name: name,
                                                    mlb_full_name: name,
                                                    positions: displayPos,
                                                    is_pitcher: displayPos === 'P' || (stat ? (stat as any).is_pitcher : false)
                                                } as PlayerSeasonStat;

                                                const isRowExpanded = expandedPlayerId === entry.id;
                                                const isPitcher = stat?.is_pitcher;
                                                const nameColor = isPitcher ? PITCHER_COLOR : HITTER_COLOR;

                                                return (
                                                    <React.Fragment key={entry.id}>
                                                        <tr 
                                                            className={`hover:bg-[var(--fbst-table-row-hover)] cursor-pointer ${isRowExpanded ? 'bg-[var(--fbst-table-row-alt-bg)]' : ''}`}
                                                            onClick={() => setExpandedPlayerId(isRowExpanded ? null : entry.id)}
                                                        >
                                                            <td className="px-4 py-1.5 font-bold text-[var(--fbst-text-muted)] cursor-pointer hover:bg-white/5 relative group/pos" onClick={(e) => e.stopPropagation()}>
                                                                <div className="relative">
                                                                    <select 
                                                                        className="appearance-none bg-transparent border-none outline-none cursor-pointer underline decoration-dotted underline-offset-2 hover:text-[var(--fbst-text-primary)]"
                                                                        value={displayPos}
                                                                        onChange={(e) => handlePositionSwap(team.id, entry.id, e.target.value)}
                                                                    >
                                                                        {(() => {
                                                                            const rawList = entry.posList || entry.posPrimary || entry.player?.posList || entry.player?.posPrimary || stat?.positions || 'BN';
                                                                            // Merge DB list and live stat list to be safe
                                                                            const statList = stat?.positions || '';
                                                                            const combined = [rawList, statList].join(',');
                                                                            
                                                                            const opts = combined.split(',').map((s: string) => s.trim()).filter(Boolean);
                                                                            const distinct = Array.from(new Set([...opts, 'BN', 'UTIL', 'P'])); 
                                                                            
                                                                            return distinct.map(p => (
                                                                                <option key={p} value={p} className="text-black">{p}</option>
                                                                            ));
                                                                        })()}
                                                                    </select>
                                                                </div>
                                                            </td>
                                                            <td className={`px-2 py-1.5 font-medium ${nameColor}`}>
                                                                {displayName}
                                                            </td>
                                                            <td className="px-4 py-1.5 text-right font-mono text-[var(--fbst-accent-success)]">
                                                                ${entry.price}
                                                            </td>
                                                        </tr>
                                                        {isRowExpanded && (
                                                            <PlayerExpandedRow 
                                                                player={playerObj} 
                                                                isTaken={true} 
                                                                ownerName={team.name}
                                                                colSpan={3} 
                                                            />
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                            {/* Dummy Keepers */}
                                            {Array.from({ length: Math.max(0, 4 - roster.length) }).map((_, i) => (
                                                 <tr key={`keeper-dummy-${i}`} className={`border-b border-[var(--fbst-table-border)] ${KEEPER_SLOT_COLOR} border-dashed opacity-70`}>
                                                    <td className="px-4 py-1.5 font-bold text-amber-500/50 italic text-xs">K</td>
                                                    <td className="px-2 py-1.5 font-medium text-amber-500/70 italic text-xs">Keeper Slot {roster.length + i + 1}</td>
                                                    <td className="px-4 py-1.5 text-right font-mono text-amber-500/50">$-</td>
                                                 </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
  );
}
