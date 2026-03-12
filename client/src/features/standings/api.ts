
import { fetchJsonApi, API_BASE } from '../../api/base';

export async function getPeriodStandings(periodId?: number, leagueId?: number): Promise<any> {
  const lid = leagueId || 1;
  return fetchJsonApi(`${API_BASE}/period/current?leagueId=${lid}`);
}

export type SettlementOwner = {
  id: number;
  name: string | null;
  email: string;
  venmoHandle?: string | null;
  zelleHandle?: string | null;
  paypalHandle?: string | null;
};

export type SettlementTeam = {
  id: number;
  name: string;
  code: string | null;
  owners: SettlementOwner[];
};

export type SettlementData = {
  leagueId: number;
  entryFee: number;
  totalPot: number;
  payoutPcts: Record<string, number>;
  teams: SettlementTeam[];
};

export async function getSettlement(leagueId: number): Promise<SettlementData> {
  return fetchJsonApi<SettlementData>(`${API_BASE}/standings/settlement/${leagueId}`);
}
