import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma.js";

const router = Router();

// --- Types ---

export type AuctionStatus = "not_started" | "nominating" | "bidding" | "paused" | "completed";

export interface AuctionTeam {
  id: number;
  name: string;
  code: string;
  budget: number;       // Remaining budget
  maxBid: number;       // Calculated max bid
  rosterCount: number;  // Players on roster
  spotsLeft: number;
  roster: { playerId: number; price: number; assignedPosition?: string | null }[];
}

export interface NominationState {
  playerId: string;       // mlbId
  playerName: string;
  playerTeam: string;     // MLB Team
  positions: string;
  isPitcher: boolean;
  
  nominatorTeamId: number;
  
  currentBid: number;
  highBidderTeamId: number;
  
  endTime: string;        // ISO string for when timer expires
  timerDuration: number;
  status: 'running' | 'paused' | 'ended';
  pausedRemainingMs?: number; // If paused, how much time was left
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

export interface AuctionState {
  leagueId: number | null;
  status: AuctionStatus;
  
  // The active item being auctioned
  nomination: NominationState | null;
  
  // Teams State (Authoritative)
  teams: AuctionTeam[];
  
  // Nomination Order
  queue: number[]; // Array of Team IDs
  queueIndex: number;
  
  config: {
    bidTimer: number;
    nominationTimer: number; // For "You're up" (not implemented yet)
  };

  log: AuctionLogEvent[];

  lastUpdate: number;
}


// --- In-Memory Store ---
// NOTE: This resets on server restart. For prod, use Redis or DB.
let STATE: AuctionState = {
  leagueId: null,
  status: "not_started",
  nomination: null,
  teams: [],
  queue: [],
  queueIndex: 0,
  config: {
    bidTimer: 15, // seconds
    nominationTimer: 30,
  },
  log: [],
  lastUpdate: Date.now()
};

// --- Helpers ---

const calculateMaxBid = (budget: number, spots: number) => {
  // Can bid up to (Budget - (Spots - 1)). i.e. must save $1 for every other spot.
  if (spots <= 0) return 0;
  if (spots === 1) return budget;
  return budget - (spots - 1);
};

const refreshTeams = async (leagueId: number) => {
  // 1. Fetch League Teams
  const teams = await prisma.team.findMany({
    where: { leagueId },
    include: {
      rosters: {
        where: { releasedAt: null },
        include: { player: true }
      }
    },
    orderBy: { id: 'asc' }
  });

  // 2. Fetch League Settings (Optional - hardcoded 260/25 for now)
  const BUDGET_CAP = 260;
  const ROSTER_SIZE = 25;

  // 3. Map to AuctionTeam
  STATE.teams = teams.map(t => {
    const spent = t.rosters.reduce((sum, r) => sum + (Number(r.price) || 0), 0);
    const count = t.rosters.length;
    const remaining = BUDGET_CAP - spent;
    const spots = ROSTER_SIZE - count;
    
    return {
      id: t.id,
      name: t.name,
      code: t.code || 'UNK',
      budget: remaining,
      rosterCount: count,
      spotsLeft: spots,
      maxBid: calculateMaxBid(remaining, spots),
      roster: t.rosters.map(r => ({
          id: r.id,
          playerId: r.playerId,
          price: Number(r.price),
          assignedPosition: r.assignedPosition // Now correctly mapped
      }))
    };
  });
  
  // 4. Reset Queue if empty
  if (STATE.queue.length === 0) {
      STATE.queue = STATE.teams.map(t => t.id);
      // TODO: Shuffle or snake logic
  }
};


// --- Routes ---

// GET /api/auction/state
router.get("/state", (req, res) => {
  try {
    res.json(STATE);
  } catch (e: any) {
    res.status(500).json({ 
      error: "Failed to fetch state", 
      message: e.message, 
      stack: e.stack 
    });
  }
});

// POST /api/auction/init
// Load teams from DB for a specific league
router.post("/init", async (req, res) => {
  try {
    const leagueId = Number(req.body.leagueId);
    if (!leagueId) return res.status(400).json({ error: "Missing leagueId" });

    STATE.leagueId = leagueId;
    await refreshTeams(leagueId);
    
    STATE.status = "nominating"; // Ready to go
    STATE.nomination = null;
    STATE.lastUpdate = Date.now();

    res.json(STATE);
  } catch (e: any) {
    console.error("Auction /init error:", e);
    res.status(500).json({ 
      error: "Failed to initialize auction", 
      message: e.message, 
      stack: e.stack,
      env: { hasDbUrl: !!process.env.DATABASE_URL }
    });
  }
});

// POST /api/auction/nominate
router.post("/nominate", (req, res) => {
  // Basic validation
  // if (STATE.status !== 'nominating') return res.status(400).json({ error: "Not in nominating phase" });

  const { nominatorTeamId, playerId, playerName, startBid, positions, team, isPitcher } = req.body;
  
  if (!nominatorTeamId || !playerId) return res.status(400).json({ error: "Missing fields" });

  // Validate nominator affordance
  const teamObj = STATE.teams.find(t => t.id === nominatorTeamId);
  if (!teamObj) return res.status(400).json({ error: "Invalid team" });
  if (teamObj.maxBid < startBid) return res.status(400).json({ error: "Insufficent funds" });

  // Start Nomination
  const now = Date.now();
  STATE.nomination = {
    playerId,
    playerName,
    playerTeam: team,
    positions,
    isPitcher,
    nominatorTeamId,
    currentBid: Number(startBid),
    highBidderTeamId: nominatorTeamId,
    endTime: new Date(now + STATE.config.bidTimer * 1000).toISOString(),
    timerDuration: STATE.config.bidTimer,
    status: 'running'
  };
  
  STATE.log.unshift({
    type: 'NOMINATION',
    teamId: nominatorTeamId,
    teamName: teamObj.name,
    playerId,
    playerName,
    amount: startBid,
    timestamp: now,
    message: `${teamObj.name} nominated ${playerName} for $${startBid}`
  });

  STATE.status = 'bidding';
  STATE.lastUpdate = Date.now();
  
  res.json(STATE);
});

// POST /api/auction/bid
router.post("/bid", (req, res) => {
  if (STATE.status !== 'bidding' || !STATE.nomination) {
    return res.status(400).json({ error: "Auction not active" });
  }

  const { bidderTeamId, amount } = req.body;
  
  // 1. Check if expired
  const endTime = new Date(STATE.nomination.endTime).getTime();
  const now = Date.now();
  if (now > endTime + 500) { // 500ms grace
      return res.status(400).json({ error: "Auction ended" });
  }

  // 2. Check validity
  if (amount <= STATE.nomination.currentBid) {
      return res.status(400).json({ error: "Bid too low" });
  }

  const bidder = STATE.teams.find(t => t.id === bidderTeamId);
  if (!bidder) return res.status(400).json({ error: "Bidder not found" });
  if (bidder.maxBid < amount) return res.status(400).json({ error: "Not enough budget" });

  // 3. Update State
  STATE.nomination.currentBid = amount;
  STATE.nomination.highBidderTeamId = bidderTeamId;

  STATE.log.unshift({
    type: 'BID',
    teamId: bidderTeamId,
    teamName: bidder.name,
    playerName: STATE.nomination.playerName,
    amount: amount,
    timestamp: Date.now(),
    message: `${bidder.name} bid $${amount}`
  });
  
  // 4. Reset Timer (Soft Reset)
  // If time left < 10s, reset to 10s? Or hard reset?
  // User asked for "pause/resume/reset". Standard auction is "reset to X if under Y".
  // For simplicity: Reset to full timer or ensure at least 10s?
  // Let's Set to Now + BidTimer (Going Fast!)
  STATE.nomination.endTime = new Date(now + STATE.config.bidTimer * 1000).toISOString();
  STATE.lastUpdate = Date.now();

  res.json(STATE);
});

// POST /api/auction/finish
// Called when client timer detects ends (or manually by commish)
// Commits the winner to DB
router.post("/finish", async (req, res) => {
  if (!STATE.nomination || !STATE.leagueId) return res.status(400).json({ error: "No active nomination" });

  const { playerId, currentBid, highBidderTeamId, playerName, positions } = STATE.nomination;
  
  // 1. DB Update check
  try {
     // Check if Player exists, if not create (should exist from pool)
     let dbPlayer = await prisma.player.findFirst({ where: { mlbId: Number(playerId) } });
     if (!dbPlayer) {
         // Create stub if missing
         dbPlayer = await prisma.player.create({
             data: {
                 mlbId: Number(playerId),
                 name: playerName,
                 posPrimary: positions.split('/')[0] || 'UT',
                 posList: positions.split('/').join(',')
             }
         });
     }

     // 2. Create Roster Entry
     await prisma.roster.create({
         data: {
             teamId: highBidderTeamId,
             playerId: dbPlayer.id,
             price: currentBid,
             source: 'auction_2025'
         }
     });

     // 3. Server State Update
     // Refresh teams (budgets)
     await refreshTeams(STATE.leagueId);
     
     // Advance Queue
     STATE.queueIndex = (STATE.queueIndex + 1) % STATE.queue.length;

     const winner = STATE.teams.find(t => t.id === highBidderTeamId);
     STATE.log.unshift({
       type: 'WIN',
       teamId: highBidderTeamId,
       teamName: winner?.name,
       playerName,
       amount: currentBid,
       timestamp: Date.now(),
       message: `${winner?.name || 'Winner'} won ${playerName} for $${currentBid}`
     });
     
     // Clear Nomination
     STATE.status = 'nominating';
     STATE.nomination = null;
     STATE.lastUpdate = Date.now();

     res.json(STATE);

  } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to commit auction result" });
  }
});

// POST /api/auction/pause
router.post("/pause", (req, res) => {
    if (STATE.nomination && STATE.nomination.status === 'running') {
        const now = Date.now();
        const end = new Date(STATE.nomination.endTime).getTime();
        STATE.nomination.pausedRemainingMs = Math.max(0, end - now);
        STATE.nomination.status = 'paused';
    }
    res.json(STATE);
});

// POST /api/auction/resume
router.post("/resume", (req, res) => {
    if (STATE.nomination && STATE.nomination.status === 'paused') {
        const now = Date.now();
        const remaining = STATE.nomination.pausedRemainingMs || (STATE.config.bidTimer * 1000);
        STATE.nomination.endTime = new Date(now + remaining).toISOString();
        STATE.nomination.status = 'running';
    }
    res.json(STATE);
});

// POST /api/auction/reset
router.post("/reset", async (req, res) => {
    // Clear State
    STATE.status = "nominating";
    STATE.nomination = null;
    STATE.lastUpdate = Date.now();
    STATE.log = [];
    
    // Also reset teams? 
    // If we want a full "dry run" reset, we should probably reload teams from DB (which resets budgets based on DB rosters).
    // BUT DB rosters persist. So "Reset" implies clearing DB rosters too?
    // User said "dry run... so they know how this works". They will likely bid, win players.
    // So we need to DELETE the roster entries created during the dry run.
    try {
        if (STATE.leagueId) {
           // Delete all rosters for this league? Or just "auction_2025" source?
           // Safest is to handle "auction_2025" source if we added it in finish.
           await prisma.roster.deleteMany({
               where: { source: 'auction_2025', team: { leagueId: STATE.leagueId } }
           });
           await refreshTeams(STATE.leagueId);
        }
        res.json(STATE);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
