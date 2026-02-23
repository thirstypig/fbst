import { describe, it, expect } from "vitest";
import {
  buildTeamNameMap,
  computeCategoryRows,
  computeStandingsFromStats,
  rankPoints,
  CATEGORY_CONFIG,
} from "../services/standingsService.js";

describe("buildTeamNameMap", () => {
  it("builds map from standings array", () => {
    const standings = [
      { teamCode: "abc", teamName: "Alpha Bravo" },
      { teamCode: "xyz", teamName: "X-Ray Yankee" },
    ];
    const result = buildTeamNameMap(standings, []);
    expect(result).toEqual({ ABC: "Alpha Bravo", XYZ: "X-Ray Yankee" });
  });

  it("builds map from standings with rows property", () => {
    const standings = {
      rows: [{ teamCode: "foo", teamName: "Foo Team" }],
    };
    const result = buildTeamNameMap(standings, []);
    expect(result).toEqual({ FOO: "Foo Team" });
  });

  it("supplements with seasonStats team codes", () => {
    const standings: any[] = [];
    const seasonStats = [
      { ogba_team_code: "abc" },
      { ogba_team_code: "def" },
    ];
    const result = buildTeamNameMap(standings, seasonStats);
    expect(result).toEqual({ ABC: "ABC", DEF: "DEF" });
  });

  it("standings take precedence over seasonStats", () => {
    const standings = [{ teamCode: "abc", teamName: "Real Name" }];
    const seasonStats = [{ ogba_team_code: "abc" }];
    const result = buildTeamNameMap(standings, seasonStats);
    expect(result.ABC).toBe("Real Name");
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

  it("R, HR, RBI, SB, AVG, W, S, K are higher-is-better", () => {
    const higherKeys = ["R", "HR", "RBI", "SB", "AVG", "W", "S", "K"];
    for (const key of higherKeys) {
      const cfg = CATEGORY_CONFIG.find((c) => c.key === key);
      expect(cfg?.lowerIsBetter).toBe(false);
    }
  });
});

describe("computeCategoryRows", () => {
  const stats = [
    { team: { id: 1, name: "Team A" }, HR: 50, ERA: 3.5 },
    { team: { id: 2, name: "Team B" }, HR: 70, ERA: 2.8 },
    { team: { id: 3, name: "Team C" }, HR: 60, ERA: 4.1 },
  ];

  it("ranks higher-is-better categories correctly", () => {
    const rows = computeCategoryRows(stats, "HR", false);
    expect(rows[0]).toMatchObject({ teamName: "Team B", value: 70, rank: 1, points: 3 });
    expect(rows[1]).toMatchObject({ teamName: "Team C", value: 60, rank: 2, points: 2 });
    expect(rows[2]).toMatchObject({ teamName: "Team A", value: 50, rank: 3, points: 1 });
  });

  it("ranks lower-is-better categories correctly", () => {
    const rows = computeCategoryRows(stats, "ERA", true);
    expect(rows[0]).toMatchObject({ teamName: "Team B", value: 2.8, rank: 1, points: 3 });
    expect(rows[1]).toMatchObject({ teamName: "Team A", value: 3.5, rank: 2, points: 2 });
    expect(rows[2]).toMatchObject({ teamName: "Team C", value: 4.1, rank: 3, points: 1 });
  });
});

describe("computeStandingsFromStats", () => {
  it("returns empty array for empty stats", () => {
    expect(computeStandingsFromStats([])).toEqual([]);
  });

  it("computes total points across all categories", () => {
    const stats = [
      {
        team: { id: 1, name: "Team A" },
        R: 100, HR: 50, RBI: 80, SB: 20, AVG: 0.280,
        W: 15, S: 10, ERA: 3.5, WHIP: 1.2, K: 200,
      },
      {
        team: { id: 2, name: "Team B" },
        R: 120, HR: 60, RBI: 90, SB: 15, AVG: 0.300,
        W: 18, S: 12, ERA: 3.0, WHIP: 1.1, K: 220,
      },
    ];

    const standings = computeStandingsFromStats(stats);
    expect(standings).toHaveLength(2);
    // Team B should be #1 since they lead in most categories
    expect(standings[0].teamName).toBe("Team B");
    expect(standings[0].rank).toBe(1);
    expect(standings[1].teamName).toBe("Team A");
    expect(standings[1].rank).toBe(2);
  });
});

describe("rankPoints", () => {
  it("assigns points based on ranking for higher-is-better", () => {
    const teams = [
      { teamCode: "A", value: 100 },
      { teamCode: "B", value: 200 },
      { teamCode: "C", value: 150 },
    ];
    const { pointsByTeam, rankByTeam } = rankPoints(teams, true, 3);
    expect(rankByTeam.B).toBe(1);
    expect(rankByTeam.C).toBe(2);
    expect(rankByTeam.A).toBe(3);
    expect(pointsByTeam.B).toBe(3);
    expect(pointsByTeam.C).toBe(2);
    expect(pointsByTeam.A).toBe(1);
  });

  it("assigns points based on ranking for lower-is-better", () => {
    const teams = [
      { teamCode: "A", value: 3.5 },
      { teamCode: "B", value: 2.8 },
      { teamCode: "C", value: 4.1 },
    ];
    const { pointsByTeam, rankByTeam } = rankPoints(teams, false, 3);
    expect(rankByTeam.B).toBe(1);
    expect(rankByTeam.A).toBe(2);
    expect(rankByTeam.C).toBe(3);
  });

  it("handles ties by averaging points", () => {
    const teams = [
      { teamCode: "A", value: 100 },
      { teamCode: "B", value: 100 },
      { teamCode: "C", value: 50 },
    ];
    const { pointsByTeam, rankByTeam } = rankPoints(teams, true, 3);
    // A and B are tied for 1st. Points for rank 1 = 3, rank 2 = 2. Average = 2.5
    expect(pointsByTeam.A).toBe(2.5);
    expect(pointsByTeam.B).toBe(2.5);
    expect(rankByTeam.A).toBe(1);
    expect(rankByTeam.B).toBe(1);
    expect(pointsByTeam.C).toBe(1);
  });
});
