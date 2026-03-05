// client/src/features/keeper-prep/api.ts
import { API_BASE, fetchJsonApi } from "../../api/base";

export interface TeamKeeperStatus {
  teamId: number;
  teamName: string;
  teamCode: string | null;
  budget: number;
  rosterCount: number;
  keeperCount: number;
  keeperCost: number;
  keeperLimit: number;
  isLocked: boolean;
}

export interface PopulateResponse {
  success: boolean;
  teamsPopulated: number;
  playersAdded: number;
  skipped: string[];
  errors: string[];
}

export async function getKeeperPrepStatus(leagueId: number): Promise<{ statuses: TeamKeeperStatus[]; isLocked: boolean }> {
  return fetchJsonApi(`${API_BASE}/commissioner/${leagueId}/keeper-prep/status`);
}

export async function populateRosters(leagueId: number): Promise<PopulateResponse> {
  return fetchJsonApi(`${API_BASE}/commissioner/${leagueId}/keeper-prep/populate`, {
    method: "POST",
  });
}

export async function lockKeepers(leagueId: number): Promise<{ success: boolean }> {
  return fetchJsonApi(`${API_BASE}/commissioner/${leagueId}/keeper-prep/lock`, {
    method: "POST",
  });
}

export async function unlockKeepers(leagueId: number): Promise<{ success: boolean }> {
  return fetchJsonApi(`${API_BASE}/commissioner/${leagueId}/keeper-prep/unlock`, {
    method: "POST",
  });
}

export async function getTeamRosterForKeeperPrep(leagueId: number, teamId: number): Promise<{ roster: any[]; keeperLimit: number }> {
  return fetchJsonApi(`${API_BASE}/commissioner/${leagueId}/keeper-prep/team/${teamId}/roster`);
}

export async function saveKeepersCommish(leagueId: number, teamId: number, keeperIds: number[]): Promise<{ success: boolean }> {
  return fetchJsonApi(`${API_BASE}/commissioner/${leagueId}/keeper-prep/save`, {
    method: "POST",
    body: JSON.stringify({ teamId, keeperIds }),
  });
}
