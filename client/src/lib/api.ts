// Simple hard-coded base URL for local dev
const API_BASE_URL = "http://localhost:4000/api";

// ---------- Standings types ----------

export interface PeriodStanding {
  teamId: number;
  teamName: string;
  points: number;
  rank: number;
  delta: number;
}

export interface PeriodStandingsResponse {
  periodId: number;
  data: PeriodStanding[];
}

export interface CategoryRow {
  teamId: number;
  teamName: string;
  value: number;
  points: number;
  rank: number;
}

export interface CategoryStandingsResponse {
  periodId: number;
  categories: {
    key: string;
    label: string;
    rows: CategoryRow[];
  }[];
}

export interface PeriodInfo {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  isActive: boolean;
}

export interface PeriodsResponse {
  data: PeriodInfo[];
}

// ---------- Teams types ----------

export interface TeamListItem {
  id: number;
  name: string;
  owner: string | null;
  budget: number;
}

export interface TeamSummary {
  team: {
    id: number;
    name: string;
    owner: string | null;
    budget: number;
  };
  period: {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
  } | null;
  periodStats: any | null; // can be narrowed later
  seasonStats: any | null; // can be narrowed later
  currentRoster: {
    id: number;
    playerId: number;
    name: string;
    posPrimary: string;
    posList: string;
    acquiredAt: string;
    price: number;
    gamesByPos: Record<string, number>;
  }[];
  droppedPlayers: {
    id: number;
    playerId: number;
    name: string;
    posPrimary: string;
    posList: string;
    acquiredAt: string;
    releasedAt: string;
    price: number;
    gamesByPos: Record<string, number>;
  }[];
}


// ---------- Standings API ----------

export async function getCurrentPeriodStandings(): Promise<PeriodStandingsResponse> {
  const res = await fetch(`${API_BASE_URL}/standings/period/current`);
  if (!res.ok) {
    console.error("Standings fetch failed:", res.status, res.statusText);
    throw new Error("Failed to fetch period standings");
  }
  return res.json();
}

export async function getCategoryStandings(): Promise<CategoryStandingsResponse> {
  const res = await fetch(
    `${API_BASE_URL}/standings/period/current/categories`
  );
  if (!res.ok) {
    console.error(
      "Category standings fetch failed:",
      res.status,
      res.statusText
    );
    throw new Error("Failed to fetch category standings");
  }
  return res.json();
}

export async function getPeriods(): Promise<PeriodsResponse> {
  const res = await fetch(`${API_BASE_URL}/periods`);
  if (!res.ok) {
    console.error("Periods fetch failed:", res.status, res.statusText);
    throw new Error("Failed to fetch periods");
  }
  return res.json();
}


// ---------- Teams API ----------

export async function getTeams(): Promise<TeamListItem[]> {
  const res = await fetch(`${API_BASE_URL}/teams`);
  if (!res.ok) {
    console.error("Teams fetch failed:", res.status, res.statusText);
    throw new Error("Failed to fetch teams");
  }
  return res.json();
}

export async function getTeamSummary(teamId: number): Promise<TeamSummary> {
  const res = await fetch(`${API_BASE_URL}/teams/${teamId}/summary`);
  if (!res.ok) {
    console.error("Team summary fetch failed:", res.status, res.statusText);
    throw new Error("Failed to fetch team summary");
  }
  return res.json();
}
