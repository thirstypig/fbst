import { fetchJsonApi, API_BASE } from "../../api/base";

export type SeasonStatus = "SETUP" | "DRAFT" | "IN_SEASON" | "COMPLETED";

export interface SeasonPeriod {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  leagueId: number | null;
  seasonId: number | null;
}

export interface Season {
  id: number;
  leagueId: number;
  year: number;
  status: SeasonStatus;
  createdAt: string;
  updatedAt: string;
  periods: SeasonPeriod[];
}

export async function getSeasons(leagueId: number): Promise<Season[]> {
  const resp = await fetchJsonApi<{ data: Season[] }>(`${API_BASE}/seasons?leagueId=${leagueId}`);
  return resp.data ?? [];
}

export async function getCurrentSeason(leagueId: number): Promise<Season | null> {
  const resp = await fetchJsonApi<{ data: Season | null }>(`${API_BASE}/seasons/current?leagueId=${leagueId}`);
  return resp.data ?? null;
}

export async function createSeason(leagueId: number, year: number): Promise<Season> {
  const resp = await fetchJsonApi<{ data: Season }>(`${API_BASE}/seasons`, {
    method: "POST",
    body: JSON.stringify({ leagueId, year }),
  });
  return resp.data;
}

export async function transitionSeason(seasonId: number, status: string): Promise<Season> {
  const resp = await fetchJsonApi<{ data: Season }>(`${API_BASE}/seasons/${seasonId}/transition`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
  return resp.data;
}

export async function createPeriod(data: {
  leagueId: number;
  seasonId: number;
  name: string;
  startDate: string;
  endDate: string;
}): Promise<SeasonPeriod> {
  const resp = await fetchJsonApi<{ data: SeasonPeriod }>(`${API_BASE}/periods`, {
    method: "POST",
    body: JSON.stringify({ ...data, status: "pending" }),
  });
  return resp.data;
}

export async function updatePeriod(periodId: number, data: {
  name?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}): Promise<SeasonPeriod> {
  const resp = await fetchJsonApi<{ data: SeasonPeriod }>(`${API_BASE}/periods/${periodId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return resp.data;
}

export async function deletePeriod(periodId: number): Promise<void> {
  await fetchJsonApi(`${API_BASE}/periods/${periodId}`, { method: "DELETE" });
}
