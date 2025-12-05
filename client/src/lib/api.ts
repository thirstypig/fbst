// client/src/lib/api.ts

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

/**
 * Helper to parse JSON and surface useful errors.
 */
async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let bodyText: string | undefined;
    try {
      bodyText = await res.text();
    } catch {
      // ignore
    }
    throw new Error(
      `HTTP ${res.status} – ${bodyText || res.statusText || "Request failed"}`
    );
  }
  return res.json() as Promise<T>;
}

// --------- TYPES ----------

export interface Team {
  id: number;
  name: string;
  owner: string | null;
  budget: number | null;
  leagueId: number;
}

export interface PlayerSeasonRow {
  mlb_id: string | null;
  name: string | null;
  team: string | null; // OGBA fantasy team name, when present
  pos: string | null;

  R: number | null;
  HR: number | null;
  RBI: number | null;
  SB: number | null;
  AVG: number | null;

  W: number | null;
  S: number | null;
  K: number | null;
  ERA: number | null;
  WHIP: number | null;
}

export interface AuctionValueRow {
  player_name: string;
  positions: string | null;
  dollar_value: number | null;
  ogba_team?: string | null;
}

export interface Period {
  id: number;
  name: string;
}

// --------- API CALLS ----------

export async function getTeams(): Promise<Team[]> {
  const res = await fetch(`${API_BASE}/api/teams`);
  return handleJson<Team[]>(res);
}

export async function getPlayers(): Promise<PlayerSeasonRow[]> {
  const res = await fetch(`${API_BASE}/api/players`);
  return handleJson<PlayerSeasonRow[]>(res);
}

export async function getAuctionValues(): Promise<AuctionValueRow[]> {
  const res = await fetch(`${API_BASE}/api/auction-values`);
  return handleJson<AuctionValueRow[]>(res);
}

/**
 * Temporary stub so /standings (Periods.tsx) can import `getPeriods`
 * without breaking the whole app. We can wire a real endpoint later.
 */
export async function getPeriods(): Promise<Period[]> {
  return [{ id: 1, name: "Period 1" }];
}
