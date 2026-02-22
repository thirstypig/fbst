// client/src/api/keeperPrep.ts
import { API_BASE } from "../../api/index";

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
  const res = await fetch(`${API_BASE}/commissioner/${leagueId}/keeper-prep/status`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch keeper status");
  return res.json();
}

export async function populateRosters(leagueId: number): Promise<PopulateResponse> {
  const res = await fetch(`${API_BASE}/commissioner/${leagueId}/keeper-prep/populate`, {
    method: "POST",
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to populate rosters");
  return data;
}

export async function lockKeepers(leagueId: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/commissioner/${leagueId}/keeper-prep/lock`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to lock keepers");
  return res.json();
}

export async function unlockKeepers(leagueId: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/commissioner/${leagueId}/keeper-prep/unlock`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to unlock keepers");
  return res.json();
}

export async function getTeamRosterForKeeperPrep(leagueId: number, teamId: number) {
    const res = await fetch(`${API_BASE}/commissioner/${leagueId}/keeper-prep/team/${teamId}/roster`, {
        credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch team roster");
    return res.json();
}

export async function saveKeepersCommish(leagueId: number, teamId: number, keeperIds: number[]) {
    const res = await fetch(`${API_BASE}/commissioner/${leagueId}/keeper-prep/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, keeperIds }),
        credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save keepers");
    return data;
}
