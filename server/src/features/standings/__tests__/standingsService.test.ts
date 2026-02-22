import { describe, it, expect } from "vitest";
import {
  buildTeamNameMap,
  CATEGORY_CONFIG,
  computeCategoryRows,
  computeStandingsFromStats,
  rankPoints,
} from "../services/standingsService.js";

describe("buildTeamNameMap", () => {
  it("builds map from seasonStandings rows", () => {
    const standings = {
      rows: [
        { teamCode: "NYY", teamName: "Yankees" },
        { teamCode: "BOS", teamName: "Red Sox" },
      ],
    };
    const result = buildTeamNameMap(standings, []);
    expect(result).toEqual({ NYY: "Yankees", BOS: "Red Sox" });
  });

  it("handles array-form seasonStandings", () => {
    const standings = [
      { code: "nyy", name: "Yankees" },
      { code: "bos", name: "Red Sox" },
    ];
    const result = buildTeamNameMap(standings, []);
    expect(result).toEqual({ NYY: "Yankees", BOS: "Red Sox" });
  });

  it("falls back to team field", () => {
    const standings = [{ team: "NYY" }];
    const result = buildTeamNameMap(standings, []);
    expect(result).toEqual({ NYY: "NYY" });
  });

  it("adds team codes from seasonStats if not in standings", () => {
    const standings: any[] = [];
    const stats = [
      { ogba_team_code: "LAD" },
      { ogba_team_code: "SF" },
    ];
    const result = buildTeamNameMap(standings, stats);
    expect(result).toEqual({ LAD: "LAD", SF: "SF" });
  });

  it("does not overwrite standings names with stats codes", () => {
    const standings = [{ teamCode: "NYY", teamName: "Yankees" }];
    const stats = [{ ogba_team_code: "NYY" }];
    const result = buildTeamNameMap(standings, stats);
    expect(result.NYY).toBe("Yankees");
  });

  it("normalizes codes to uppercase", () => {
    const standings = [{ teamCode: "nyy", teamName: "Yankees" }];
    const result = buildTeamNameMap(standings, []);
    expect(result).toHaveProperty("NYY");
    expect(result).not.toHaveProperty("nyy");
  });
});

describe("CATEGORY_CONFIG", () => {
  it("has 10 categories", () => {
    expect(CATEGORY_CONFIG).toHaveLength(10);
  });

  it("ERA and WHIP are lower-is-better", () => {
    const era = CATEGORY_CONFIG.find((c) => c.key === "ERA");
    const whip = CATEGORY_CONFIG.find((c) => c.key === "WHIP");
    expect(era?.lowerIsBetter).toBe(true);
    expect(whip?.lowerIsBetter).toBe(true);
  });

  it("hitting categories are higher-is-better", () => {
    const hittingKeys = ["R", "HR", "RBI", "SB", "AVG"];
    for (const key of hittingKeys) {
      const cat = CATEGORY_CONFIG.find((c) => c.key === key);
      expect(cat?.lowerIsBetter).toBe(false);
    }
  });
});

import type { TeamStatsRow } from "../services/standingsService.js";

const STAT_DEFAULTS = { R: 0, HR: 0, RBI: 0, SB: 0, AVG: 0, W: 0, S: 0, ERA: 0, WHIP: 0, K: 0 };

function makeStats(teams: Array<{ id: number; name: string } & Partial<typeof STAT_DEFAULTS>>): TeamStatsRow[] {
  return teams.map((t) => ({
    ...STAT_DEFAULTS,
    ...t,
    team: { id: t.id, name: t.name },
  }));
}

describe("computeCategoryRows", () => {
  it("ranks teams by value descending for higher-is-better", () => {
    const stats = makeStats([
      { id: 1, name: "A", HR: 50 },
      { id: 2, name: "B", HR: 80 },
      { id: 3, name: "C", HR: 30 },
    ]);

    const rows = computeCategoryRows(stats, "HR", false);
    expect(rows[0].teamName).toBe("B");
    expect(rows[0].rank).toBe(1);
    expect(rows[0].points).toBe(3);
    expect(rows[1].teamName).toBe("A");
    expect(rows[1].rank).toBe(2);
    expect(rows[1].points).toBe(2);
    expect(rows[2].teamName).toBe("C");
    expect(rows[2].rank).toBe(3);
    expect(rows[2].points).toBe(1);
  });

  it("ranks teams by value ascending for lower-is-better (ERA)", () => {
    const stats = makeStats([
      { id: 1, name: "A", ERA: 4.5 },
      { id: 2, name: "B", ERA: 2.1 },
      { id: 3, name: "C", ERA: 3.3 },
    ]);

    const rows = computeCategoryRows(stats, "ERA", true);
    expect(rows[0].teamName).toBe("B"); // lowest ERA is best
    expect(rows[0].rank).toBe(1);
    expect(rows[0].points).toBe(3);
    expect(rows[2].teamName).toBe("A"); // highest ERA is worst
    expect(rows[2].rank).toBe(3);
    expect(rows[2].points).toBe(1);
  });

  it("handles empty stats", () => {
    const rows = computeCategoryRows([], "HR", false);
    expect(rows).toEqual([]);
  });

  it("handles single team", () => {
    const stats = makeStats([{ id: 1, name: "Solo", HR: 25 }]);
    const rows = computeCategoryRows(stats, "HR", false);
    expect(rows).toHaveLength(1);
    expect(rows[0].rank).toBe(1);
    expect(rows[0].points).toBe(1);
  });
});

describe("computeStandingsFromStats", () => {
  it("returns empty array for empty stats", () => {
    expect(computeStandingsFromStats([])).toEqual([]);
  });

  it("computes aggregate standings across all categories", () => {
    // Team A: best at everything except ERA/WHIP
    // Team B: worst at everything except ERA/WHIP
    const stats = makeStats([
      {
        id: 1, name: "Team A",
        R: 100, HR: 50, RBI: 90, SB: 20, AVG: 0.3,
        W: 15, S: 10, ERA: 5.0, WHIP: 1.5, K: 200,
      },
      {
        id: 2, name: "Team B",
        R: 50, HR: 20, RBI: 40, SB: 5, AVG: 0.22,
        W: 5, S: 2, ERA: 2.5, WHIP: 1.0, K: 100,
      },
    ]);

    const standings = computeStandingsFromStats(stats);
    expect(standings).toHaveLength(2);

    // Team A wins 8 categories (higher in R, HR, RBI, SB, AVG, W, S, K)
    // Team B wins 2 categories (lower ERA, lower WHIP)
    // Team A: 8 * 2 + 2 * 1 = 18 points
    // Team B: 8 * 1 + 2 * 2 = 12 points
    expect(standings[0].teamName).toBe("Team A");
    expect(standings[0].points).toBe(18);
    expect(standings[0].rank).toBe(1);

    expect(standings[1].teamName).toBe("Team B");
    expect(standings[1].points).toBe(12);
    expect(standings[1].rank).toBe(2);
  });

  it("includes delta field (currently always 0)", () => {
    const stats = makeStats([
      {
        id: 1, name: "T1",
        R: 10, HR: 10, RBI: 10, SB: 10, AVG: 0.25,
        W: 10, S: 10, ERA: 3.0, WHIP: 1.2, K: 100,
      },
    ]);
    const standings = computeStandingsFromStats(stats);
    expect(standings[0].delta).toBe(0);
  });
});

describe("rankPoints", () => {
  it("ranks teams and assigns points for higher-is-better", () => {
    const teams = [
      { teamCode: "A", value: 100 },
      { teamCode: "B", value: 200 },
      { teamCode: "C", value: 50 },
    ];
    const { pointsByTeam, rankByTeam } = rankPoints(teams, true, 3);

    expect(rankByTeam.B).toBe(1);
    expect(rankByTeam.A).toBe(2);
    expect(rankByTeam.C).toBe(3);

    expect(pointsByTeam.B).toBe(3);
    expect(pointsByTeam.A).toBe(2);
    expect(pointsByTeam.C).toBe(1);
  });

  it("ranks teams for lower-is-better (ERA)", () => {
    const teams = [
      { teamCode: "A", value: 4.5 },
      { teamCode: "B", value: 2.1 },
      { teamCode: "C", value: 3.3 },
    ];
    const { pointsByTeam, rankByTeam } = rankPoints(teams, false, 3);

    expect(rankByTeam.B).toBe(1); // lowest ERA
    expect(pointsByTeam.B).toBe(3);
    expect(rankByTeam.C).toBe(2);
    expect(pointsByTeam.C).toBe(2);
    expect(rankByTeam.A).toBe(3);
    expect(pointsByTeam.A).toBe(1);
  });

  it("handles ties by averaging points", () => {
    const teams = [
      { teamCode: "A", value: 100 },
      { teamCode: "B", value: 100 }, // tie with A
      { teamCode: "C", value: 50 },
    ];
    const { pointsByTeam, rankByTeam } = rankPoints(teams, true, 3);

    // A and B tie for 1st — ranks 1 and 2 share points: (3+2)/2 = 2.5
    expect(rankByTeam.A).toBe(1);
    expect(rankByTeam.B).toBe(1);
    expect(pointsByTeam.A).toBe(2.5);
    expect(pointsByTeam.B).toBe(2.5);

    expect(rankByTeam.C).toBe(3);
    expect(pointsByTeam.C).toBe(1);
  });

  it("handles three-way tie", () => {
    const teams = [
      { teamCode: "A", value: 50 },
      { teamCode: "B", value: 50 },
      { teamCode: "C", value: 50 },
    ];
    const { pointsByTeam } = rankPoints(teams, true, 3);

    // All tied: (3+2+1)/3 = 2
    expect(pointsByTeam.A).toBe(2);
    expect(pointsByTeam.B).toBe(2);
    expect(pointsByTeam.C).toBe(2);
  });

  it("uses totalTeams for point calculation", () => {
    const teams = [
      { teamCode: "A", value: 100 },
      { teamCode: "B", value: 50 },
    ];
    // 10 total teams in league, but only 2 have values
    const { pointsByTeam } = rankPoints(teams, true, 10);
    expect(pointsByTeam.A).toBe(10); // rank 1 → 10 - 1 + 1 = 10
    expect(pointsByTeam.B).toBe(9); // rank 2 → 10 - 2 + 1 = 9
  });
});
