
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
          <div className="h-full flex flex-col items-center justify-center p-8 liquid-glass rounded-3xl relative overflow-hidden bg-white/[0.02] border border-white/10">
               <Users size={200} className="absolute -bottom-10 -right-10 opacity-[0.02] rotate-12" />

               <div className="flex flex-col items-center text-center z-10">
                  <MonitorStop size={48} className="mb-6 text-[var(--fbst-text-muted)] opacity-30" />
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-[var(--fbst-text-heading)] mb-2">Awaiting Nomination</h3>
                  <p className="text-sm max-w-xs text-[var(--fbst-text-muted)] mb-10 font-bold uppercase tracking-widest leading-relaxed">
                     {myTeamId && rotationTeams[0]?.id === myTeamId ? 
                        <span className="text-[var(--fbst-accent)] animate-pulse">It's your turn. Select a player to begin.</span> : 
                        "The room is open. Stand by for the next nominee."}
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
    <div className="flex flex-col h-full gap-8">
        {/* Nominee Card */}
        <div className="liquid-glass rounded-3xl overflow-hidden flex flex-col md:flex-row relative bg-white/[0.02] border border-white/10 shadow-2xl">
            
            {/* Player Image */}
            <div className="w-full md:w-1/3 bg-black/40 border-r border-white/5 relative flex items-center justify-center min-h-[220px]">
                 <img 
                    src={`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_426,q_auto:best/v1/people/${nomination.playerId}/headshot/67/current`}
                    alt={nomination.playerName}
                    className="object-cover h-full w-full opacity-90 transition-opacity"
                    onError={(e) => (e.currentTarget.src = 'https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_426,q_auto:best/v1/people/generic/headshot/67/current')}
                 />
                 <div className="absolute top-4 left-4 bg-[var(--fbst-accent)] text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">
                    {nomination.positions || (nomination.isPitcher ? 'P' : 'UT')}
                 </div>
            </div>

            {/* Info & Timer */}
            <div className="flex-1 flex flex-col">
                <div className="p-6 border-b border-white/5 flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-black text-[var(--fbst-text-heading)] leading-none tracking-tighter mb-2">{nomination.playerName}</h2>
                        <div className="text-[10px] font-black text-[var(--fbst-text-muted)] uppercase tracking-widest flex items-center gap-2">
                             {nomination.playerTeam}
                        </div>
                    </div>
                    
                    {/* Timer Display */}
                    <div className="flex flex-col items-end">
                        <div className={`text-6xl font-mono font-black tabular-nums tracking-tighter transition-all ${
                            isCriticalTime ? 'text-[var(--fbst-accent)] animate-pulse scale-110 origin-right' : 'text-[var(--fbst-text-primary)] opacity-80'
                        }`}>
                            {timeLeft}
                        </div>
                        {nomination.status === 'paused' && <div className="text-[var(--fbst-accent)] font-black uppercase text-[10px] tracking-widest mt-1">SYSTEM PAUSED</div>}
                    </div>
                </div>

                <div className="p-6 bg-white/[0.02] flex-1 flex flex-col justify-center">
                   <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--fbst-text-muted)] mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[var(--fbst-accent)] animate-pulse" /> Live Analysis Active
                   </div>
                   <p className="text-xs font-bold text-[var(--fbst-text-muted)] uppercase tracking-wider leading-relaxed">
                      Detailed projections and value analysis are available in the war room panel.
                   </p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Status */}
            <div className={`liquid-glass rounded-3xl p-8 border flex flex-col justify-between shadow-xl relative overflow-hidden transition-all duration-500 ${isHighBidder ? 'bg-emerald-500/[0.05] border-emerald-500/30 ring-1 ring-emerald-500/20' : 'bg-white/[0.02] border-white/10'}`}>
                {isHighBidder && <div className="absolute top-0 right-0 bg-emerald-500 text-white px-4 py-1.5 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest">HIGHEST BIDDER</div>}
                <div>
                   <div className="text-[10px] font-black text-[var(--fbst-text-muted)] uppercase tracking-[0.2em] mb-4">Live Valuation</div>
                   <div className="text-7xl font-black text-[var(--fbst-text-primary)] tracking-tighter tabular-nums mb-4 flex items-start">
                       <span className="text-2xl mt-2 opacity-30">$</span>{currentBid}
                   </div>
                   <div className="text-xs font-bold text-[var(--fbst-text-primary)] uppercase tracking-widest flex items-center gap-3">
                       <span className="text-[var(--fbst-text-muted)] opacity-50">HELD BY:</span> 
                       <span className={isHighBidder ? 'text-emerald-400' : ''}>
                          {highBidderTeam?.name || 'INITIAL BID'} {isHighBidder ? '(YOU)' : ''}
                       </span>
                   </div>
                </div>
            </div>

            {/* Actions */}
            <div className="liquid-glass rounded-3xl p-8 border border-white/10 flex flex-col gap-4 justify-center bg-white/[0.02]">
                 <div className="grid grid-cols-2 gap-4">
                     <button 
                        disabled={!canAffordMin || isHighBidder || nomination.status !== 'running'}
                        onClick={() => onBid(minRaise)}
                        className="bg-[var(--fbst-accent)] disabled:opacity-20 disabled:grayscale disabled:scale-95 disabled:cursor-not-allowed text-white text-lg font-black uppercase tracking-widest py-6 rounded-2xl shadow-2xl shadow-red-500/30 hover:brightness-110 active:scale-95 transition-all flex flex-col items-center"
                    >
                        <span>BID ${minRaise}</span>
                     </button>
                     <button 
                        disabled={!canAffordJump || isHighBidder || nomination.status !== 'running'}
                        onClick={() => onBid(jumpRaise)}
                        className="bg-white/5 border border-white/10 disabled:opacity-20 disabled:cursor-not-allowed text-white text-lg font-black uppercase tracking-widest py-6 rounded-2xl hover:bg-white/10 active:scale-95 transition-all flex flex-col items-center"
                     >
                        <span>JUMP ${jumpRaise}</span>
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
