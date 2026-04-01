import { fetchJsonApi, API_BASE } from "../../api/base";

export interface TradingBlockItem {
  id: number;
  teamId: number;
  teamName: string;
  teamCode: string;
  player: {
    id: number;
    name: string;
    posPrimary: string;
    mlbTeam: string | null;
    mlbId: number | null;
  };
  askingFor: string | null;
  createdAt: string;
}

export async function getTradingBlock(leagueId: number): Promise<{ items: TradingBlockItem[] }> {
  return fetchJsonApi(`${API_BASE}/trading-block?leagueId=${leagueId}`);
}

export async function getMyTradingBlock(teamId: number): Promise<{ items: TradingBlockItem[] }> {
  return fetchJsonApi(`${API_BASE}/trading-block/my?teamId=${teamId}`);
}

export async function addToTradingBlock(data: {
  teamId: number;
  playerId: number;
  askingFor?: string;
}): Promise<TradingBlockItem> {
  return fetchJsonApi(`${API_BASE}/trading-block`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateTradingBlockItem(
  id: number,
  data: { askingFor?: string }
): Promise<TradingBlockItem> {
  return fetchJsonApi(`${API_BASE}/trading-block/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function removeFromTradingBlock(playerId: number, teamId: number): Promise<void> {
  await fetchJsonApi(`${API_BASE}/trading-block/${playerId}?teamId=${teamId}`, {
    method: "DELETE",
  });
}
