import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// Mock Prisma before importing routes
vi.mock("../../../db/prisma.js", () => ({
  prisma: {
    period: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    teamStatsPeriod: { findMany: vi.fn() },
    teamStatsSeason: { findMany: vi.fn() },
  },
}));

vi.mock("../../../lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { prisma } from "../../../db/prisma.js";
import { standingsRouter } from "../routes.js";

const app = express();
app.use(express.json());
app.use("/standings", standingsRouter);

const mockPrisma = prisma as unknown as {
  period: {
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  teamStatsPeriod: { findMany: ReturnType<typeof vi.fn> };
  teamStatsSeason: { findMany: ReturnType<typeof vi.fn> };
};

function makeTeamStats(teamId: number, teamName: string, overrides: Record<string, number> = {}) {
  return {
    teamId,
    team: { id: teamId, name: teamName },
    R: 50, HR: 20, RBI: 45, SB: 10, AVG: 0.260,
    W: 8, S: 5, ERA: 3.50, WHIP: 1.20, K: 120,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /standings/period/current", () => {
  it("returns standings for the active period", async () => {
    mockPrisma.period.findFirst.mockResolvedValueOnce({ id: 3, status: "active", startDate: new Date() });
    mockPrisma.teamStatsPeriod.findMany.mockResolvedValueOnce([
      makeTeamStats(1, "Team A", { HR: 40 }),
      makeTeamStats(2, "Team B", { HR: 20 }),
    ]);

    const res = await request(app).get("/standings/period/current");

    expect(res.status).toBe(200);
    expect(res.body.periodId).toBe(3);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toHaveProperty("teamId");
    expect(res.body.data[0]).toHaveProperty("teamName");
    expect(res.body.data[0]).toHaveProperty("points");
    expect(res.body.data[0]).toHaveProperty("rank");
  });

  it("falls back to period id=1 when no active period", async () => {
    mockPrisma.period.findFirst
      .mockResolvedValueOnce(null)  // no active period
      .mockResolvedValueOnce({ id: 1, status: "closed" }); // fallback to id=1
    mockPrisma.teamStatsPeriod.findMany.mockResolvedValueOnce([
      makeTeamStats(1, "Team A"),
    ]);

    const res = await request(app).get("/standings/period/current");

    expect(res.status).toBe(200);
    expect(res.body.periodId).toBe(1);
  });

  it("returns 404 when no periods exist at all", async () => {
    mockPrisma.period.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const res = await request(app).get("/standings/period/current");

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no active period/i);
  });

  it("returns empty data when period has no stats", async () => {
    mockPrisma.period.findFirst.mockResolvedValueOnce({ id: 1 });
    mockPrisma.teamStatsPeriod.findMany.mockResolvedValueOnce([]);

    const res = await request(app).get("/standings/period/current");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("returns 500 on database error", async () => {
    mockPrisma.period.findFirst.mockRejectedValueOnce(new Error("DB connection failed"));

    const res = await request(app).get("/standings/period/current");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to fetch period standings");
  });
});

describe("GET /standings/period-category-standings", () => {
  it("returns category standings for a valid period", async () => {
    mockPrisma.period.findUnique.mockResolvedValueOnce({ id: 2 });
    mockPrisma.teamStatsPeriod.findMany.mockResolvedValueOnce([
      makeTeamStats(1, "Yankees", { HR: 50 }),
      makeTeamStats(2, "Red Sox", { HR: 30 }),
    ]);

    const res = await request(app).get("/standings/period-category-standings?periodId=2");

    expect(res.status).toBe(200);
    expect(res.body.periodId).toBe(2);
    expect(res.body.teamCount).toBe(2);
    expect(res.body.categories).toHaveLength(10);

    const hrCat = res.body.categories.find((c: { key: string }) => c.key === "HR");
    expect(hrCat).toBeDefined();
    expect(hrCat.rows).toHaveLength(2);
    expect(hrCat.rows[0].teamName).toBe("Yankees"); // higher HR
    expect(hrCat.rows[0].rank).toBe(1);
  });

  it("defaults to periodId=1 when no query param", async () => {
    mockPrisma.period.findUnique.mockResolvedValueOnce({ id: 1 });
    mockPrisma.teamStatsPeriod.findMany.mockResolvedValueOnce([]);

    const res = await request(app).get("/standings/period-category-standings");

    expect(res.status).toBe(200);
    expect(mockPrisma.period.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("parses period IDs with prefix like P3", async () => {
    mockPrisma.period.findUnique.mockResolvedValueOnce({ id: 3 });
    mockPrisma.teamStatsPeriod.findMany.mockResolvedValueOnce([]);

    const res = await request(app).get("/standings/period-category-standings?periodId=P3");

    expect(res.status).toBe(200);
    expect(mockPrisma.period.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
  });

  it("returns 400 for non-numeric periodId", async () => {
    const res = await request(app).get("/standings/period-category-standings?periodId=abc");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("returns 404 when period does not exist", async () => {
    mockPrisma.period.findUnique.mockResolvedValueOnce(null);

    const res = await request(app).get("/standings/period-category-standings?periodId=999");

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

describe("GET /standings/season", () => {
  it("returns season standings with stat columns", async () => {
    mockPrisma.teamStatsSeason.findMany.mockResolvedValueOnce([
      makeTeamStats(1, "Team A", { HR: 60, ERA: 2.50 }),
      makeTeamStats(2, "Team B", { HR: 30, ERA: 4.00 }),
    ]);

    const res = await request(app).get("/standings/season");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);

    const first = res.body.data[0];
    expect(first).toHaveProperty("teamId");
    expect(first).toHaveProperty("points");
    expect(first).toHaveProperty("rank");
    expect(first).toHaveProperty("HR");
    expect(first).toHaveProperty("ERA");
  });

  it("returns empty data when no season stats exist", async () => {
    mockPrisma.teamStatsSeason.findMany.mockResolvedValueOnce([]);

    const res = await request(app).get("/standings/season");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("returns 500 on database error", async () => {
    mockPrisma.teamStatsSeason.findMany.mockRejectedValueOnce(new Error("timeout"));

    const res = await request(app).get("/standings/season");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to fetch season standings");
  });
});
