
import { API_BASE, fetchJsonApi } from './base';
import { TeamDetailResponse } from './types';

export async function getTeamDetails(teamId: number): Promise<TeamDetailResponse> {
  return fetchJsonApi<TeamDetailResponse>(`${API_BASE}/teams/${teamId}/summary`);
}

export async function getTeams(): Promise<any[]> {
  return fetchJsonApi<any[]>(`${API_BASE}/teams`);
}

export async function updateRosterPosition(teamId: number, rosterId: number, position: string | null): Promise<any> {
  return fetchJsonApi(`${API_BASE}/teams/${teamId}/roster/${rosterId}`, {
    method: 'PATCH',
    body: JSON.stringify({ assignedPosition: position }),
  });
}
