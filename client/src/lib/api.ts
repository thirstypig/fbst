const API_BASE = "http://localhost:4000/api";

export interface Team {
  id: number;
  name: string;
  owner: string;
  budget: number;
  leagueId: number;
}

export interface TeamSummaryRow {
  periodName: string;
  periodPoints: number;
  seasonPoints: number;
}

export interface Player {
  mlb_id: string;
  name: string;
  team: string;
  pos: string;
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
  isFreeAgent: boolean;
  isPitcher: boolean;
}

export interface AuctionValue {
  mlb_id: string;
  name: string;
  team: string;
  pos: string;
  value: number;
  relValue: number;
  isPitcher: boolean;
}

async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = res.statusText || `HTTP ${res.status}`;
    try {
      const detail = await res.json();
      if (detail && typeof detail === "object" && "error" in detail) {
        message = String((detail as any).error);
      }
    } catch {
      // ignore body parse errors
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export async function getTeams(): Promise<Team[]> {
  const res = await fetch(`${API_BASE}/teams`);
  return handleJson<Team[]>(res);
}

export async function getTeamSummary(
  teamId: number,
): Promise<TeamSummaryRow[]> {
  const res = await fetch(`${API_BASE}/teams/${teamId}/summary`);
  return handleJson<TeamSummaryRow[]>(res);
}

export async function getPlayers(): Promise<Player[]> {
  const res = await fetch(`${API_BASE}/players`);
  return handleJson<Player[]>(res);
}

export async function getAuctionValues(): Promise<AuctionValue[]> {
  const res = await fetch(`${API_BASE}/auction-values`);
  return handleJson<AuctionValue[]>(res);
}
