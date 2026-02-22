
import { normCode } from "../../../lib/utils.js";

// --- Types ---

/** A row of season standings data (from archive or season views) */
type StandingsRow = {
  teamCode?: string;
  code?: string;
  team?: string;
  teamName?: string;
  name?: string;
};

/** Season standings can be an array or an object with a `rows` property */
type SeasonStandingsInput = StandingsRow[] | { rows?: StandingsRow[] };

/** A row from seasonStats used for team code fallback */
type SeasonStatRow = { ogba_team_code: string };

/** Team stats row from Prisma (TeamStatsPeriod or TeamStatsSeason with team included) */
export type TeamStatsRow = {
  team: { id: number; name: string };
  R: number;
  HR: number;
  RBI: number;
  SB: number;
  AVG: number;
  W: number;
  S: number;
  ERA: number;
  WHIP: number;
  K: number;
  [key: string]: unknown;
};

/** Row returned by computeCategoryRows */
export type CategoryRow = {
  teamId: number;
  teamName: string;
  value: number;
  rank: number;
  points: number;
};

/** Row returned by computeStandingsFromStats */
export type StandingRow = {
  teamId: number;
  teamName: string;
  points: number;
  rank: number;
  delta: number;
};

// --- Constants ---

export const CATEGORY_CONFIG = [
  { key: "R", label: "Runs", lowerIsBetter: false },
  { key: "HR", label: "Home Runs", lowerIsBetter: false },
  { key: "RBI", label: "RBI", lowerIsBetter: false },
  { key: "SB", label: "Stolen Bases", lowerIsBetter: false },
  { key: "AVG", label: "Average", lowerIsBetter: false },
  { key: "W", label: "Wins", lowerIsBetter: false },
  { key: "S", label: "Saves", lowerIsBetter: false },
  { key: "ERA", label: "ERA", lowerIsBetter: true },
  { key: "WHIP", label: "WHIP", lowerIsBetter: true },
  { key: "K", label: "Strikeouts", lowerIsBetter: false },
] as const;

export type CategoryKey = (typeof CATEGORY_CONFIG)[number]["key"];

// --- Functions ---

export function buildTeamNameMap(
  seasonStandings: SeasonStandingsInput,
  seasonStats: SeasonStatRow[]
): Record<string, string> {
  const map: Record<string, string> = {};

  // 1. From seasonStandings
  const rows: StandingsRow[] = Array.isArray(seasonStandings)
    ? seasonStandings
    : seasonStandings?.rows || [];
  for (const r of rows) {
    const code = normCode(r.teamCode || r.code || r.team || "");
    const name = r.teamName || r.name || r.team || "";
    if (code && name) map[code] = name;
  }

  // 2. From seasonStats
  for (const s of seasonStats) {
    const code = normCode(s.ogba_team_code);
    if (code && !map[code]) map[code] = code;
  }

  return map;
}

export function computeCategoryRows(
  stats: TeamStatsRow[],
  key: CategoryKey,
  lowerIsBetter: boolean
): CategoryRow[] {
  const rows = stats.map((s) => ({
    teamId: s.team.id,
    teamName: s.team.name,
    value: s[key] as number,
  }));

  rows.sort((a, b) =>
    lowerIsBetter ? a.value - b.value : b.value - a.value
  );

  const n = rows.length;
  return rows.map((row, idx) => ({
    ...row,
    rank: idx + 1,
    points: n - idx,
  }));
}

export function computeStandingsFromStats(stats: TeamStatsRow[]): StandingRow[] {
  if (stats.length === 0) return [];

  const teamMap = new Map<number, { teamId: number; teamName: string; points: number }>();

  for (const row of stats) {
    teamMap.set(row.team.id, {
      teamId: row.team.id,
      teamName: row.team.name,
      points: 0,
    });
  }

  for (const cfg of CATEGORY_CONFIG) {
    const rows = computeCategoryRows(stats, cfg.key, cfg.lowerIsBetter);
    for (const r of rows) {
      const team = teamMap.get(r.teamId);
      if (!team) continue;
      team.points += r.points;
    }
  }

  const standings = Array.from(teamMap.values());
  standings.sort((a, b) => b.points - a.points);

  return standings.map((s, idx) => ({
    teamId: s.teamId,
    teamName: s.teamName,
    points: s.points,
    rank: idx + 1,
    delta: 0,
  }));
}

export function rankPoints(
  teams: Array<{ teamCode: string; value: number }>,
  higherIsBetter: boolean,
  totalTeams: number
): { pointsByTeam: Record<string, number>; rankByTeam: Record<string, number> } {
  const sorted = [...teams].sort((a, b) => {
    if (a.value === b.value) return 0;
    return higherIsBetter ? b.value - a.value : a.value - b.value;
  });

  const pointsByTeam: Record<string, number> = {};
  const rankByTeam: Record<string, number> = {};

  let i = 0;
  while (i < sorted.length) {
    // Find end of tie group
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].value === sorted[i].value) j++;

    const rankStart = i + 1;
    const tiedCount = j - i + 1;

    // Average points across tied ranks
    let pointSum = 0;
    for (let k = 0; k < tiedCount; k++) {
      pointSum += totalTeams - (i + k);
    }
    const avgPoints = pointSum / tiedCount;

    for (let k = i; k <= j; k++) {
      pointsByTeam[sorted[k].teamCode] = avgPoints;
      rankByTeam[sorted[k].teamCode] = rankStart;
    }

    i = j + 1;
  }

  return { pointsByTeam, rankByTeam };
}
