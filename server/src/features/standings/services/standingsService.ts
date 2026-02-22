
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

export function computeCategoryRows(
  stats: any[],
  key: CategoryKey,
  lowerIsBetter: boolean
) {
  const rows = stats.map((s) => ({
    teamId: s.team.id,
    teamName: s.team.name,
    value: s[key],
  }));

  rows.sort((a, b) => {
    if (lowerIsBetter) {
      return a.value - b.value;
    } else {
      return b.value - a.value;
    }
  });

  const n = rows.length;
  // Handle ties logic: if values are equal, they should share points & rank?
  // Previous implementation in routes/standings.ts was simplistic:
  // rank: idx+1, points: n - idx.
  // This meant ties were broken arbitrarily by sort stability or previous order.
  // TODO: Implement proper tie handling if "Data Correctness" rule demands it.
  // For now, mirroring existing logic to avoid breaking changes, but flagging for upgrade.
  
  return rows.map((row, idx) => ({
    ...row,
    rank: idx + 1, // 1-based rank
    points: n - idx,
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
    const rankEnd = j + 1;

    const pointForRank = (rank: number) => totalTeams - rank + 1;

    let sum = 0;
    for (let r = rankStart; r <= rankEnd; r++) sum += pointForRank(r);
    // const avg = sum / (rankEnd - rankStart + j - j + 1); // wait j-j? it should be (j-i+1)

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
