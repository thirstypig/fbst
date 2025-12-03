// client/src/api.ts

// ---------- Base + helpers ----------

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function handleJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(
      `API ${res.status} ${res.statusText} – ${typeof data === "string" ? data : text}`,
      res.status,
      data
    );
  }

  return data as T;
}

async function apiGet<T = unknown>(path: string): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  return handleJson<T>(res);
}

async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return handleJson<T>(res);
}

// ---------- Auction types & API ----------

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

export async function getAuctionState(): Promise<AuctionState> {
  return apiGet<AuctionState>("/auction/state");
}

export async function startAuction(): Promise<AuctionState> {
  return apiPost<AuctionState>("/auction/start");
}

export async function resetAuction(): Promise<AuctionState> {
  return apiPost<AuctionState>("/auction/reset");
}
