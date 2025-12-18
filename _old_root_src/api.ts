// src/api.ts

// Base URL for the Express server
const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ||
  'http://localhost:4000';

export interface PlayerSeasonStats {
  mlb_id: string;
  name: string;
  team: string;
  pos: string;
  // Any other stat columns from the CSV live here dynamically
  [key: string]: string | number;
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

// ---------- Generic helper ----------

async function apiGet<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `GET ${url} failed: ${res.status} ${res.statusText}${
        text ? ` – ${text}` : ''
      }`,
    );
  }

  return (await res.json()) as T;
}

// ---------- Player stats ----------

/**
 * MLB player season stats.
 * If `mlbId` is provided, the server will filter by that mlb_id.
 */
export function getPlayerSeasonStats(
  mlbId?: string,
): Promise<PlayerSeasonStats[]> {
  const query = mlbId ? `?mlb_id=${encodeURIComponent(mlbId)}` : '';
  return apiGet<PlayerSeasonStats[]>(`/api/player-stats${query}`);
}

/**
 * Alias used in some of our earlier snippets.
 */
export const fetchPlayerStats = getPlayerSeasonStats;

// ---------- Auction values (for later) ----------

export function getAuctionValues(): Promise<AuctionValue[]> {
  return apiGet<AuctionValue[]>('/api/auction-values');
}

// ---------- Teams / Season standings ----------

/**
 * Teams – currently typed as any[] because TeamsGrid
 * likely has its own shape. We just pass through JSON.
 */
export function getTeams(): Promise<any[]> {
  return apiGet<any[]>('/api/teams');
}

// Many of your existing components probably do:
//   import { fetchTeams } from '../api';
export const fetchTeams = getTeams;

/**
 * Season standings (category standings)
 */
export function getSeasonStandings(): Promise<any[]> {
  return apiGet<any[]>('/api/season-standings');
}

// Many components do:
//   import { fetchSeasonStandings } from '../api';
export const fetchSeasonStandings = getSeasonStandings;
