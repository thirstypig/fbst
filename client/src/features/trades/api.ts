
import { fetchJsonApi, API_BASE } from '../../api/base';

export type TradeAssetType = "PLAYER" | "BUDGET" | "PICK";

export interface TradeProposal {
  id: number;
  proposingTeamId: number;
  acceptingTeamId: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "VETOED" | "PROCESSED";
  items: any[];
  votes: any[];
  createdAt: string;
  proposingTeam: { id: number; name: string; code: string; ownerUserId: number; };
  acceptingTeam: { id: number; name: string; code: string; ownerUserId: number; };
}

export async function getTrades(leagueId: number, view: "all" | "my" = "my"): Promise<{ trades: TradeProposal[] }> {
    return fetchJsonApi(`${API_BASE}/trades?leagueId=${leagueId}&view=${view}`);
}

export async function proposeTrade(payload: { proposingTeamId: number; acceptingTeamId: number; items: any[] }): Promise<any> {
    return fetchJsonApi(`${API_BASE}/trades/propose`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

export async function respondToTrade(tradeId: number, action: "ACCEPT" | "REJECT"): Promise<any> {
    return fetchJsonApi(`${API_BASE}/trades/${tradeId}/response`, {
        method: 'POST',
        body: JSON.stringify({ action })
    });
}

export async function cancelTrade(tradeId: number): Promise<any> {
    return fetchJsonApi(`${API_BASE}/trades/${tradeId}/cancel`, { method: 'POST' });
}

export async function voteOnTrade(tradeId: number, vote: "APPROVE" | "VETO", reason?: string): Promise<any> {
    return fetchJsonApi(`${API_BASE}/trades/${tradeId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ vote, reason })
    });
}

export async function processTrade(tradeId: number, action: "PROCESS" | "VETO"): Promise<any> {
    return fetchJsonApi(`${API_BASE}/trades/${tradeId}/process`, {
        method: 'POST',
        body: JSON.stringify({ action })
    });
}
