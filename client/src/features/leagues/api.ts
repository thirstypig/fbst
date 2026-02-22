
import { API_BASE, fetchJsonApi } from '../../api/base';
import {
  LeaguesListResponse,
  LeagueDetail,
  AdminCreateLeagueInput,
  AdminCreateLeagueResponse,
  PeriodDef,
  LeagueRule
} from '../../api/types';

export async function getLeagues(): Promise<LeaguesListResponse> {
  return fetchJsonApi<LeaguesListResponse>(`${API_BASE}/leagues`);
}

export async function getLeague(id: number | string): Promise<{ league: LeagueDetail }> {
  return fetchJsonApi<{ league: LeagueDetail }>(`${API_BASE}/leagues/${id}`);
}

export async function adminCreateLeague(input: AdminCreateLeagueInput): Promise<AdminCreateLeagueResponse> {
  return fetchJsonApi<AdminCreateLeagueResponse>(`${API_BASE}/admin/league`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getPeriods(): Promise<{ periods: PeriodDef[] }> {
  return fetchJsonApi<{ periods: PeriodDef[] }>(`${API_BASE}/commissioner/periods/list`);
}

export async function savePeriod(p: Partial<PeriodDef>): Promise<{ period: PeriodDef }> {
  return fetchJsonApi(`${API_BASE}/commissioner/periods`, {
    method: "POST",
    body: JSON.stringify(p),
  });
}

export async function deletePeriod(id: number): Promise<{ success: boolean }> {
  return fetchJsonApi(`${API_BASE}/commissioner/periods/${id}`, { method: "DELETE" });
}

export async function getLeagueRules(leagueId: number): Promise<{ rules: LeagueRule[] }> {
    return fetchJsonApi(`${API_BASE}/commissioner/${leagueId}/rules`);
}

export async function saveLeagueRule(leagueId: number, rule: Partial<LeagueRule>): Promise<{ rule: LeagueRule }> {
    return fetchJsonApi(`${API_BASE}/commissioner/${leagueId}/rules`, {
        method: "POST",
        body: JSON.stringify(rule)
    });
}

export async function endAuction(leagueId: number): Promise<{ success: boolean; snapshotted: number }> {
    return fetchJsonApi(`${API_BASE}/commissioner/${leagueId}/end-auction`, { method: "POST" });
}

export async function adminImportRosters(leagueId: number, csvContent: string): Promise<{ success: boolean; count: number; errors: string[] }> {
    // Note: CSV content is not JSON, so we use raw fetch for body but might expect JSON response
    // Actually base fetchJsonApi expects JSON body if init is provided?
    // Let's use raw fetch for this one to be safe with CSV content-type
    const res = await fetch(`${API_BASE}/admin/league/${leagueId}/import-rosters`, {
        method: "POST",
        headers: { 
           "Content-Type": "text/csv", 
           Accept: "application/json" 
        },
        credentials: "include",
        body: csvContent,
    });
    
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Import failed: ${text}`);
    }
    return res.json();
}

export async function getMyRoster(leagueId: number): Promise<{ team: any; roster: any[]; isLocked: boolean; keeperLimit: number }> {
    return fetchJsonApi<{ team: any; roster: any[]; isLocked: boolean; keeperLimit: number }>(`${API_BASE}/leagues/${leagueId}/my-roster`);
}

export async function saveKeepers(leagueId: number, keeperIds: number[]): Promise<{ success: boolean; count: number }> {
    return fetchJsonApi(`${API_BASE}/leagues/${leagueId}/my-roster/keepers`, {
        method: "POST",
        body: JSON.stringify({ keeperIds })
    });
}
