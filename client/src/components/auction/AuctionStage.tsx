
import React, { useEffect, useState, useRef } from 'react';
import { PlayerSeasonStat } from '../../api';
import { Settings, Play, Pause, RotateCcw, MonitorStop, Users } from 'lucide-react';
import { ClientAuctionState } from '../../hooks/useAuctionState';
import NominationQueue from './NominationQueue';

interface Team {
  id: number;
  name: string;
  code: string;
  budget: number;
  maxBid: number;
  rosterCount: number;
  isMe?: boolean;
}

interface AuctionStageProps {
    serverState: ClientAuctionState | null;
    myTeamId?: number;
    onBid: (amount: number) => void;
    onFinish: () => void;
    onPause?: () => void;
    onResume?: () => void;
    onReset?: () => void;
}

// ... (mapNominationToStat remains same)

export default function AuctionStage({ serverState, myTeamId, onBid, onFinish, onPause, onResume, onReset }: AuctionStageProps) {
  
  // Computed helpers
  const nomination = serverState?.nomination;
  const teams = serverState?.teams as Team[] || [];
  
  const [timeLeft, setTimeLeft] = useState(0);

  // Timer Sync and Auto-Finish
  useEffect(() => {
    if (!nomination || nomination.status !== 'running') {
        setTimeLeft(0);
        return;
    }
    
    // Check immediatley
    const checkTime = () => {
        const end = new Date(nomination.endTime).getTime();
        const now = Date.now();
        const diff = Math.max(0, Math.ceil((end - now)/1000));
        setTimeLeft(diff);

        if (diff <= 0) {
            // Timer expired, trigger finish
            // We use a small timeout to avoid double-triggers or race conditions with render
             // Only trigger if we are "running" (checked above)
            onFinish();
        }
    };

    checkTime(); // Initial check
    
    const interval = setInterval(checkTime, 200);

    return () => clearInterval(interval);
  }, [nomination?.endTime, nomination?.status, onFinish]);


  if (!nomination) {
      // Waiting State
      // Find up next
      const queueIds = serverState?.queue || [];
      const queueIndex = serverState?.queueIndex || 0;
      
      // We can map queue IDs to full team objects
      const rotationTeams = queueIds.slice(queueIndex, queueIndex + 5).map(qid => teams.find(t => t.id === qid)).filter(Boolean) as Team[];
      // If wrapping around logic needed, can do later.

      return (
          <div className="h-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-[var(--fbst-table-border)] rounded-xl relative overflow-hidden">
               <Users size={200} className="absolute -bottom-10 -right-10 opacity-[0.03] rotate-12" />

               <div className="flex flex-col items-center text-center z-10">
                  <MonitorStop size={48} className="mb-4 text-[var(--fbst-text-muted)] opacity-50" />
                  <h3 className="text-2xl font-bold mb-2 text-[var(--fbst-text-primary)]">Waiting for Nomination</h3>
                  <p className="text-sm max-w-xs text-[var(--fbst-text-muted)] mb-8">
                     {myTeamId && rotationTeams[0]?.id === myTeamId ? 
                        <span className="text-[var(--fbst-accent-success)] font-bold">It's your turn! Nominate a player.</span> : 
                        "Waiting for nomination..."}
                  </p>
                  
                  
                  {rotationTeams.length > 0 && (
                      <div className="w-full max-w-md">
                          <NominationQueue 
                                teams={teams} 
                                queue={queueIds} 
                                queueIndex={queueIndex} 
                                myTeamId={myTeamId} 
                          />
                      </div>
                  )}
               </div>
          </div>
      );
  }

  const isCriticalTime = timeLeft <= 5 && nomination.status === 'running';
  const currentBid = nomination.currentBid;
  const highBidderTeam = teams.find(t => t.id === nomination.highBidderTeamId);
  const myTeam = teams.find(t => t.id === myTeamId);

  // Derive "Min Raise" logic
  // Typically $1 raise
  const minRaise = currentBid + 1;
  const jumpRaise = currentBid + 5;
  const canAffordMin = myTeam ? myTeam.maxBid >= minRaise : false;
  const canAffordJump = myTeam ? myTeam.maxBid >= jumpRaise : false;
  const isHighBidder = nomination.highBidderTeamId === myTeamId;

  return (
    <div className="flex flex-col h-full gap-6">
        {/* Nominee Card */}
        <div className="bg-[var(--fbst-surface-elevated)] rounded-xl shadow-sm border border-[var(--fbst-table-border)] overflow-hidden flex flex-col md:flex-row relative">
            
            {/* Player Image */}
            <div className="w-full md:w-1/3 bg-gray-900 border-r border-[var(--fbst-table-border)] relative flex items-center justify-center min-h-[200px]">
                 <img 
                    src={`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_426,q_auto:best/v1/people/${nomination.playerId}/headshot/67/current`}
                    alt={nomination.playerName}
                    className="object-cover h-full w-full opacity-90 hover:opacity-100 transition-opacity"
                    onError={(e) => (e.currentTarget.src = 'https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_426,q_auto:best/v1/people/generic/headshot/67/current')}
                 />
                 <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold font-mono">
                    {nomination.positions || (nomination.isPitcher ? 'P' : 'UT')}
                 </div>
            </div>

            {/* Info & Timer */}
            <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-[var(--fbst-table-border)] flex justify-between items-start bg-[var(--fbst-surface-primary)]">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--fbst-text-primary)] leading-tight">{nomination.playerName}</h2>
                        <div className="text-sm font-medium text-[var(--fbst-text-muted)] mt-1 flex items-center gap-2">
                             {/* Logo logic if available */}
                             {nomination.playerTeam}
                        </div>
                    </div>
                    
                    {/* Timer Display */}
                    <div className="flex flex-col items-end">
                        <div className={`text-5xl font-mono font-bold tabular-nums transition-colors ${
                            isCriticalTime ? 'text-[var(--fbst-accent-error)] animate-pulse' : 'text-[var(--fbst-text-primary)]'
                        }`}>
                            {timeLeft}s
                        </div>
                        {nomination.status === 'paused' && <div className="text-red-500 font-bold uppercase text-xs">PAUSED</div>}
                    </div>
                </div>

                {/* NOTE: We don't have full stats in nomination payload yet, hiding grid or using placeholders */}
                <div className="p-4 bg-[var(--fbst-surface-secondary)] flex-1 flex items-center justify-center text-[var(--fbst-text-muted)] italic text-sm">
                   Full stats display requires DB lookup (coming soon)
                </div>
            </div>
        </div>

        {/* Admin Controls (Commissioner) */}
        <div className="flex gap-2 justify-end px-4 pb-2">
            {nomination.status === 'running' && (
                <button 
                    onClick={() => onPause && onPause()}
                    className="flex items-center gap-1 text-xs font-bold text-yellow-500 hover:text-yellow-400 bg-yellow-950/30 px-2 py-1 rounded border border-yellow-900/50"
                >
                    <Pause size={12} /> PAUSE
                </button>
            )}
             {nomination.status === 'paused' && (
                <button 
                    onClick={() => onResume && onResume()}
                    className="flex items-center gap-1 text-xs font-bold text-green-500 hover:text-green-400 bg-green-950/30 px-2 py-1 rounded border border-green-900/50"
                >
                    <Play size={12} /> RESUME
                </button>
            )}
             {/* Reset Button (Use with Caution) */}
             <button 
                onClick={() => {
                    if (window.confirm('Reset the entire auction? This clears all wins.')) {
                        onReset && onReset();
                    }
                }}
                className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-400 bg-red-950/30 px-2 py-1 rounded border border-red-900/50"
            >
                <RotateCcw size={12} /> RESET
            </button>
        </div>

        {/* Bidding Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current Status */}
            <div className={`bg-[var(--fbst-surface-elevated)] rounded-xl p-6 border flex flex-col justify-between shadow-sm relative overflow-hidden transition-colors ${isHighBidder ? 'border-[var(--fbst-accent-success)]' : 'border-[var(--fbst-table-border)]'}`}>
                <div>
                   <div className="text-sm font-medium text-[var(--fbst-text-muted)] uppercase tracking-wider mb-2">Current Bid</div>
                   <div className="text-6xl font-bold text-[var(--fbst-accent-success)] tabular-nums mb-1">${currentBid}</div>
                   <div className="text-lg font-medium text-[var(--fbst-text-primary)] flex items-center gap-2">
                       <span className="text-[var(--fbst-text-muted)]">Held by:</span> 
                       <span className={isHighBidder ? 'font-bold text-[var(--fbst-accent-success)]' : ''}>
                          {highBidderTeam?.name || 'Unknown'} {isHighBidder ? '(You)' : ''}
                       </span>
                   </div>
                </div>
            </div>

            {/* Actions */}
            <div className="bg-[var(--fbst-surface-elevated)] rounded-xl p-6 border border-[var(--fbst-table-border)] flex flex-col gap-4 justify-center shadow-sm">
                 <div className="grid grid-cols-2 gap-3">
                     <button 
                        disabled={!canAffordMin || isHighBidder || nomination.status !== 'running'}
                        onClick={() => onBid(minRaise)}
                        className="bg-[var(--fbst-accent-success)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--fbst-accent-success)]/90 text-white text-xl font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all flex flex-col items-center"
                    >
                        <span>+ Bid ${minRaise}</span>
                     </button>
                     <button 
                        disabled={!canAffordJump || isHighBidder || nomination.status !== 'running'}
                        onClick={() => onBid(jumpRaise)}
                        className="bg-[var(--fbst-surface-primary)] disabled:opacity-50 disabled:cursor-not-allowed border-2 border-[var(--fbst-accent-success)] text-[var(--fbst-accent-success)] text-xl font-bold py-4 rounded-xl hover:bg-[var(--fbst-accent-success)]/10 active:scale-95 transition-all flex flex-col items-center"
                     >
                        <span>Jump ${jumpRaise}</span>
                     </button>
                 </div>
            </div>
        </div>
        
        {/* Nomination Queue (Always Visible) */}
        <div className="w-full">
            <NominationQueue 
                teams={teams} 
                queue={serverState?.queue || []} 
                queueIndex={serverState?.queueIndex || 0} 
                myTeamId={myTeamId} 
            />
        </div>
    </div>
  );
}

function BigStat({ label, value }: { label: string, value: string | number | undefined }) {
    return (
        <div className="flex flex-col items-center justify-center p-2 bg-[var(--fbst-surface-primary)] rounded-lg border border-[var(--fbst-table-border)]/50 shadow-sm">
            <div className="text-xs text-[var(--fbst-text-muted)] font-bold uppercase mb-1">{label}</div>
            <div className="text-2xl font-bold text-[var(--fbst-text-primary)]">
                {value !== undefined && value !== null ? value : '-'}
            </div>
        </div>
    );
}

function SmallStat({ label, value }: { label: string, value: string | number | undefined }) {
    return (
        <div className="flex flex-col items-center justify-center p-1 opacity-75">
            <div className="text-[10px] text-[var(--fbst-text-muted)] uppercase">{label}</div>
            <div className="font-semibold text-[var(--fbst-text-primary)]">
                {value !== undefined && value !== null ? value : '-'}
            </div>
        </div>
    );
}
