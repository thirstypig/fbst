// server/src/routes/auction.ts

import { Router, Request, Response } from "express";

const router = Router();

export type AuctionStatus = "not_started" | "nominating" | "bidding" | "completed";

export interface AuctionTeam {
  id: string;
  name: string;
  budget: number;
  players: {
    id: string;
    name: string;
    price: number;
    position: string;
  }[];
}

export interface AuctionEvent {
  id: string;
  type: string;
  timestamp: string;
  payload: unknown;
}

export interface AuctionState {
  status: AuctionStatus;
  currentNomination: {
    playerId: string;
    playerName: string;
    nominatingTeamId: string;
    price: number;
  } | null;
  teams: AuctionTeam[];
  history: AuctionEvent[];
}

// --- In-memory state for now ---
// Later you can swap this to a DB.

function createInitialAuctionState(): AuctionState {
  return {
    status: "not_started",
    currentNomination: null,
    teams: [],
    history: [],
  };
}

let auctionState: AuctionState = createInitialAuctionState();

function nowIso(): string {
  return new Date().toISOString();
}

function pushEvent(type: string, payload: unknown = null) {
  const event: AuctionEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    timestamp: nowIso(),
    payload,
  };

  auctionState = {
    ...auctionState,
    history: [...auctionState.history, event],
  };
}

// GET /auction/state AND /api/auction/state (because of mounts in index.ts)
router.get("/state", (_req: Request, res: Response) => {
  res.json(auctionState);
});

// POST /auction/start – start the auction
router.post("/start", (_req: Request, res: Response) => {
  if (auctionState.status !== "not_started") {
    return res.status(400).json({
      error: `Cannot start auction when status is ${auctionState.status}`,
    });
  }

  auctionState = {
    ...auctionState,
    status: "nominating",
  };

  pushEvent("AUCTION_STARTED", null);

  res.json(auctionState);
});

// POST /auction/reset – wipe back to initial state
router.post("/reset", (_req: Request, res: Response) => {
  auctionState = createInitialAuctionState();
  pushEvent("AUCTION_RESET", null);
  res.json(auctionState);
});

export default router;
