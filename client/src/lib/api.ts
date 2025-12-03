// client/src/lib/api.ts
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

/* ---------- Types ---------- */

export interface PeriodStandingRow {
  teamId: number;
  teamName: string;
  points: number;
  rank: number;
  delta: number | null;
}

export interface PeriodStandingsResponse {
  periodId: number;
  data: PeriodStandingRow[];
}

export interface CategoryRow {
  teamId: number;
  teamName: string;
  value: number;
  points: number;
  rank: number;
}

export interface CategoryBlock {
  key: string;
  label: string;
  rows: CategoryRow[];
}

export interface CategoryStandingsResponse {
  periodId: number;
  categories: CategoryBlock[];
}

export interface SeasonStandingRow {
  teamId: number;
  teamName: string;
  points: number;
  rank: number;
  delta: number | null;
  R: number;
  HR: number;
  RBI: number;
  SB: number;
  AVG: number;
  W: number;
  S: number;
  ERA: number;
  WHIP: number;
  K: number;
}

export interface SeasonStandingsResponse {
  data: SeasonStandingRow[];
}

export interface TeamSummaryResponse {
  team: {
    id: number;
    name: string;
    owner: string | null;
    budget: number;
  };
  period: {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
  } | null;
  periodStats: {
    id: number;
    teamId: number;
    periodId: number;
    R: number;
    HR: number;
    RBI: number;
    SB: number;
    AVG: number;
    W: number;
    S: number;
    ERA: number;
    WHIP: number;
    K: number;
    gamesPlayed: number;
  } | null;
  seasonStats: {
    id: number;
    teamId: number;
    R: number;
    HR: number;
    RBI: number;
    SB: number;
    AVG: number;
    W: number;
    S: number;
    ERA: number;
    WHIP: number;
    K: number;
    gamesPlayed: number;
  } | null;
  currentRoster: {
    id: number;
    playerId: number;
    name: string;
    posPrimary: string;
    posList: string;
    acquiredAt: string;
    price: number;
  }[];
  droppedPlayers: {
    id: number;
    playerId: number;
    name: string;
    releasedAt: string;
    price: number;
  }[];
}

/* ---------- Period types ---------- */

export interface PeriodInfo {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  isActive: boolean;
}

export interface PeriodsResponse {
  data: PeriodInfo[];
}

/* ---------- Auction types ---------- */

export interface AuctionTeamBudget {
  teamId: number;
  name: string;
  budget: number;
  spent: number;
}

export interface AuctionBid {
  id: number;
  teamName: string;
  amount: number;
  ts: string; // ISO timestamp
}

export interface AuctionLot {
  lotId: number;
  playerName: string;
  mlbTeam: string;
  positions: string[];
  nominatedBy: string;
  currentPrice: number;
  currentLeader: string;
  secondsRemaining: number;
}

export interface AuctionState {
  status: "idle" | "nominating" | "bidding" | "paused" | "closed";
  lot: AuctionLot | null;
  teams: AuctionTeamBudget[];
  recentBids: AuctionBid[];
}

/* ---------- Helpers ---------- */

async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `API ${res.status} ${res.statusText} – ${text || "request failed"}`
    );
  }
  return res.json() as Promise<T>;
}

/* ---------- Standings ---------- */

export async function getCurrentPeriodStandings(): Promise<PeriodStandingsResponse> {
  const res = await fetch(`${API_BASE}/api/standings/period/current`);
  return handleJson<PeriodStandingsResponse>(res);
}

export async function getCategoryStandings(): Promise<CategoryStandingsResponse> {
  const res = await fetch(
    `${API_BASE}/api/standings/period/current/categories`
  );
  return handleJson<CategoryStandingsResponse>(res);
}

export async function getSeasonStandings(): Promise<SeasonStandingsResponse> {
  const res = await fetch(`${API_BASE}/api/standings/season`);
  return handleJson<SeasonStandingsResponse>(res);
}

/* ---------- Teams ---------- */

export async function getTeams() {
  const res = await fetch(`${API_BASE}/api/teams`);
  return handleJson<
    { id: number; name: string; owner: string | null; budget: number }[]
  >(res);
}

export async function getTeamSummary(
  teamId: number
): Promise<TeamSummaryResponse> {
  const res = await fetch(`${API_BASE}/api/teams/${teamId}/summary`);
  return handleJson<TeamSummaryResponse>(res);
}

/* ---------- Periods ---------- */

export async function getPeriods(): Promise<PeriodsResponse> {
  const res = await fetch(`${API_BASE}/api/periods`);
  return handleJson<PeriodsResponse>(res);
}

/* ---------- Auction ---------- */

export async function getAuctionState(): Promise<AuctionState> {
  const res = await fetch(`${API_BASE}/api/auction/state`);
  return handleJson<AuctionState>(res);
}
