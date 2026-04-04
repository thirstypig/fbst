import { fetchJsonApi, API_BASE } from "../../api/base";

// ─── Types ───

export interface ManagerAward {
  teamId: number;
  teamName: string;
  teamCode: string;
  totalPoints: number;
}

export interface PickupAward {
  teamId: number;
  teamName: string;
  playerName: string;
  claimPrice: number;
  statsLine: string;
}

export interface CategoryKing {
  category: string;
  label: string;
  teamName: string;
  teamCode: string;
  value: number;
  isLowerBetter: boolean;
}

export interface PeriodAwards {
  periodId: number;
  periodName: string;
  managerOfPeriod: ManagerAward | null;
  pickupOfPeriod: PickupAward | null;
  categoryKings: CategoryKing[];
}

export interface PeriodInfo {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  isActive: boolean;
  leagueId: number | null;
  seasonId: number | null;
}

// ─── API Functions ───

export async function getPeriodAwards(
  periodId: number,
  leagueId: number,
): Promise<PeriodAwards> {
  const res = await fetchJsonApi<{ data: PeriodAwards }>(
    `${API_BASE}/periods/${periodId}/awards?leagueId=${leagueId}`,
  );
  return res.data;
}

export async function getPeriods(leagueId: number): Promise<PeriodInfo[]> {
  const res = await fetchJsonApi<{ data: PeriodInfo[] }>(
    `${API_BASE}/periods?leagueId=${leagueId}`,
  );
  return res.data;
}
