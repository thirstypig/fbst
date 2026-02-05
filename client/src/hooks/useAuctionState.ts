import { useState, useEffect, useRef } from 'react';

// Types redefined locally to avoid build issues importing from server
export type AuctionStatus = "not_started" | "nominating" | "bidding" | "paused" | "completed";

export interface AuctionTeam {
  id: number;
  name: string;
  code: string;
  budget: number;
  maxBid: number;
  rosterCount: number;
  spotsLeft: number;
  roster: { id: number; playerId: number; price: number; assignedPosition?: string | null }[];
}

export interface NominationState {
  playerId: string;
  playerName: string;
  playerTeam: string;
  positions: string;
  isPitcher: boolean;
  nominatorTeamId: number;
  currentBid: number;
  highBidderTeamId: number;
  endTime: string;
  timerDuration: number;
  status: 'running' | 'paused' | 'ended';
  pausedRemainingMs?: number;
}

export interface ClientNominationState {
  playerId: string;
  playerName: string;
  playerTeam: string;
  positions: string;
  isPitcher: boolean;
  nominatorTeamId: number;
  currentBid: number;
  highBidderTeamId: number;
  endTime: string;
  timerDuration: number;
  status: 'running' | 'paused' | 'ended';
  pausedRemainingMs?: number;
}

export interface ClientAuctionState {
  leagueId: number | null;
  status: AuctionStatus;
  nomination: ClientNominationState | null;
  teams: any[]; // Using any to avoid strict type duplication for now
  queue: number[];
  queueIndex: number;
  config: {
    bidTimer: number;
    nominationTimer: number;
  };
  log: AuctionLogEvent[];
  lastUpdate: number;
}

export interface AuctionLogEvent {
  type: 'NOMINATION' | 'BID' | 'WIN' | 'PAUSE' | 'RESUME';
  teamId?: number;
  teamName?: string;
  playerId?: string;
  playerName?: string;
  amount?: number;
  timestamp: number;
  message: string;
}

export function useAuctionState() {
    const [state, setState] = useState<ClientAuctionState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchState = async () => {
        try {
            const res = await fetch('/api/auction/state');
            if (!res.ok) throw new Error('Failed to fetch auction state');
            const data = await res.json();
            setState(data);
            setError(null);
        } catch (e: any) {
            console.error(e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchState();
        pollRef.current = setInterval(fetchState, 1000); // Poll every 1s

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    // Actions
    const nominate = async (payload: { nominatorTeamId: number, playerId: string, playerName: string, startBid: number, positions: string, team: string, isPitcher: boolean }) => {
        await fetch('/api/auction/nominate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        fetchState(); // Immediate refresh
    };

    const bid = async (payload: { bidderTeamId: number, amount: number }) => {
        await fetch('/api/auction/bid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        fetchState();
    };

    const initAuction = async (leagueId: number) => {
        await fetch('/api/auction/init', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ leagueId })
        });
        fetchState();
    };

    const finishAuction = async () => {
        await fetch('/api/auction/finish', { method: 'POST' });
        fetchState();
    };

    return {
        state,
        loading,
        error,
        actions: {
            nominate,
            bid,
            initAuction,
            finishAuction,
            pause: async () => { await fetch('/api/auction/pause', { method: 'POST' }); fetchState(); },
            resume: async () => { await fetch('/api/auction/resume', { method: 'POST' }); fetchState(); },
            reset: async () => { await fetch('/api/auction/reset', { method: 'POST' }); fetchState(); }
        }
    };
}
