
import { normCode } from "../../../lib/utils.js";


export function buildTeamNameMap(seasonStandings: any, seasonStats: any[]): Record<string, string> {
  const map: Record<string, string> = {};

  // 1. From seasonStandings
  const rows = Array.isArray(seasonStandings) ? seasonStandings : seasonStandings?.rows || [];
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

export const CATEGORY_CONFIG = [
  { key: "R", label: "Runs", lowerIsBetter: false, group: "H" },
  { key: "HR", label: "Home Runs", lowerIsBetter: false, group: "H" },
  { key: "RBI", label: "RBI", lowerIsBetter: false, group: "H" },
  { key: "SB", label: "Stolen Bases", lowerIsBetter: false, group: "H" },
  { key: "AVG", label: "Average", lowerIsBetter: false, group: "H" },
  { key: "W", label: "Wins", lowerIsBetter: false, group: "P" },
  { key: "SV", label: "Saves", lowerIsBetter: false, group: "P" },
  { key: "ERA", label: "ERA", lowerIsBetter: true, group: "P" },
  { key: "WHIP", label: "WHIP", lowerIsBetter: true, group: "P" },
  { key: "K", label: "Strikeouts", lowerIsBetter: false, group: "P" },
] as const;

export type CategoryKey = (typeof CATEGORY_CONFIG)[number]["key"];

// Map config keys to DB column names where they differ
const KEY_TO_DB_FIELD: Partial<Record<CategoryKey, string>> = {
  SV: "S",
};

export function computeCategoryRows(
  stats: any[],
  key: CategoryKey,
  lowerIsBetter: boolean
) {
  const dbField = KEY_TO_DB_FIELD[key] || key;
  const rows = stats.map((s) => ({
    teamId: s.team.id,
    teamName: s.team.name,
    teamCode: s.team.code || s.team.name.substring(0, 3).toUpperCase(),
    value: s[dbField],
  }));

  const n = rows.length;
  if (n === 0) return [];

  // Use rankPoints for proper tie handling
  const teamsForRank = rows.map((r) => ({
    teamCode: String(r.teamId), // use teamId as key
    value: r.value,
  }));
  const { pointsByTeam, rankByTeam } = rankPoints(
    teamsForRank,
    !lowerIsBetter,
    n
  );

  // Sort for display order
  rows.sort((a, b) => {
    if (lowerIsBetter) {
      return a.value - b.value;
    } else {
      return b.value - a.value;
    }
  });

  return rows.map((row) => ({
    ...row,
    rank: rankByTeam[String(row.teamId)] ?? 0,
    points: pointsByTeam[String(row.teamId)] ?? 0,
  }));
}

export function computeStandingsFromStats(stats: any[]) {
  if (stats.length === 0) {
    return [];
  }

  const teamMap = new Map<
    number,
    {
      teamId: number;
      teamName: string;
      points: number;
    }
  >();

  for (const row of stats) {
    teamMap.set(row.team.id, {
      teamId: row.team.id,
      teamName: row.team.name,
      points: 0,
    });
  }

  // For each category, rank and add points
  for (const cfg of CATEGORY_CONFIG) {
    const rows = computeCategoryRows(stats, cfg.key as CategoryKey, cfg.lowerIsBetter);
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
    delta: 0, // later we can compute movement vs previous snapshot
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
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].value === sorted[i].value) j++;

    const rankStart = i + 1;

    // Average points across tied ranks
    const tiedCount = j - i + 1;
    let pointSum = 0;
    for (let k = 0; k < tiedCount; k++) {
      pointSum += totalTeams - (i + k + 1) + 1;
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
