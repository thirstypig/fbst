import { fetchJsonApi, API_BASE } from "../../api/base";

export interface WatchlistItem {
  id: number;
  teamId: number;
  playerId: number;
  player: {
    id: number;
    name: string;
    posPrimary: string;
    mlbTeam: string | null;
    mlbId: number | null;
  };
  note: string | null;
  tags: string[];
  createdAt: string;
}

export async function getWatchlist(teamId: number): Promise<{ items: WatchlistItem[] }> {
  return fetchJsonApi(`${API_BASE}/watchlist?teamId=${teamId}`);
}

export async function addToWatchlist(data: {
  teamId: number;
  playerId: number;
  note?: string;
  tags?: string[];
}): Promise<WatchlistItem> {
  return fetchJsonApi(`${API_BASE}/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateWatchlistItem(
  id: number,
  data: { note?: string; tags?: string[] }
): Promise<WatchlistItem> {
  return fetchJsonApi(`${API_BASE}/watchlist/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function removeFromWatchlist(playerId: number, teamId: number): Promise<void> {
  await fetchJsonApi(`${API_BASE}/watchlist/${playerId}?teamId=${teamId}`, {
    method: "DELETE",
  });
}
