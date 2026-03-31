import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  league: {
    findUnique: vi.fn(),
  },
  season: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  leagueRule: {
    updateMany: vi.fn(),
  },
  tradeItem: {
    findMany: vi.fn(),
  },
  team: {
    update: vi.fn(),
  },
}));

vi.mock("../../../db/prisma.js", () => ({ prisma: mockPrisma }));
vi.mock("../../../lib/logger.js", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("../../../lib/auditLog.js", () => ({ writeAuditLog: vi.fn() }));

import { createSeason, getCurrentSeason, getSeasons, transitionStatus } from "../services/seasonService.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSeason", () => {
  it("creates a season in SETUP status", async () => {
    mockPrisma.league.findUnique.mockResolvedValueOnce({ id: 1 });
    mockPrisma.season.findUnique.mockResolvedValueOnce(null); // no duplicate
    mockPrisma.season.create.mockResolvedValueOnce({
      id: 1, leagueId: 1, year: 2026, status: "SETUP", periods: [],
    });

    const result = await createSeason(1, 2026);
    expect(result.status).toBe("SETUP");
    expect(result.year).toBe(2026);
  });

  it("rejects duplicate season", async () => {
    mockPrisma.league.findUnique.mockResolvedValueOnce({ id: 1 });
    mockPrisma.season.findUnique.mockResolvedValueOnce({ id: 1, year: 2026 });

    await expect(createSeason(1, 2026)).rejects.toThrow("already exists");
  });

  it("rejects if league not found", async () => {
    mockPrisma.league.findUnique.mockResolvedValueOnce(null);

    await expect(createSeason(999, 2026)).rejects.toThrow("League not found");
  });
});

describe("getCurrentSeason", () => {
  it("returns the latest non-completed season", async () => {
    mockPrisma.season.findFirst.mockResolvedValueOnce({
      id: 2, leagueId: 1, year: 2026, status: "DRAFT", periods: [],
    });

    const result = await getCurrentSeason(1);
    expect(result?.status).toBe("DRAFT");
  });

  it("returns null when no active season", async () => {
    mockPrisma.season.findFirst.mockResolvedValueOnce(null);
    const result = await getCurrentSeason(1);
    expect(result).toBeNull();
  });
});

describe("getSeasons", () => {
  it("returns all seasons for a league", async () => {
    mockPrisma.season.findMany.mockResolvedValueOnce([
      { id: 1, year: 2025, status: "COMPLETED", periods: [] },
      { id: 2, year: 2026, status: "SETUP", periods: [] },
    ]);

    const result = await getSeasons(1);
    expect(result).toHaveLength(2);
  });
});

describe("transitionStatus", () => {
  it("transitions SETUP → DRAFT and locks rules", async () => {
    mockPrisma.season.findUnique.mockResolvedValueOnce({
      id: 1, leagueId: 1, year: 2026, status: "SETUP", periods: [],
    });
    mockPrisma.leagueRule.updateMany.mockResolvedValueOnce({ count: 5 });
    mockPrisma.tradeItem.findMany.mockResolvedValueOnce([]); // No future budget adjustments
    mockPrisma.season.update.mockResolvedValueOnce({
      id: 1, leagueId: 1, year: 2026, status: "DRAFT", periods: [],
    });

    const result = await transitionStatus(1, "DRAFT");
    expect(result.status).toBe("DRAFT");
    // Verify rules were locked
    expect(mockPrisma.leagueRule.updateMany).toHaveBeenCalledWith({
      where: { leagueId: 1 },
      data: { isLocked: true },
    });
  });

  it("rejects invalid transition SETUP → IN_SEASON", async () => {
    mockPrisma.season.findUnique.mockResolvedValueOnce({
      id: 1, leagueId: 1, status: "SETUP", periods: [],
    });

    await expect(transitionStatus(1, "IN_SEASON")).rejects.toThrow("Invalid transition");
  });

  it("rejects DRAFT → IN_SEASON without periods", async () => {
    mockPrisma.season.findUnique.mockResolvedValueOnce({
      id: 1, leagueId: 1, status: "DRAFT", periods: [],
    });

    await expect(transitionStatus(1, "IN_SEASON")).rejects.toThrow("at least one period");
  });

  it("transitions DRAFT → IN_SEASON with periods", async () => {
    mockPrisma.season.findUnique.mockResolvedValueOnce({
      id: 1, leagueId: 1, status: "DRAFT",
      periods: [{ id: 1, name: "P1", status: "pending" }],
    });
    mockPrisma.season.update.mockResolvedValueOnce({
      id: 1, status: "IN_SEASON", periods: [{ id: 1 }],
    });

    const result = await transitionStatus(1, "IN_SEASON");
    expect(result.status).toBe("IN_SEASON");
  });

  it("rejects IN_SEASON → COMPLETED with incomplete periods", async () => {
    mockPrisma.season.findUnique.mockResolvedValueOnce({
      id: 1, leagueId: 1, status: "IN_SEASON",
      periods: [
        { id: 1, status: "completed" },
        { id: 2, status: "active" },
      ],
    });

    await expect(transitionStatus(1, "COMPLETED")).rejects.toThrow("not completed yet");
  });

  it("transitions IN_SEASON → COMPLETED when all periods done", async () => {
    mockPrisma.season.findUnique.mockResolvedValueOnce({
      id: 1, leagueId: 1, status: "IN_SEASON",
      periods: [
        { id: 1, status: "completed" },
        { id: 2, status: "completed" },
      ],
    });
    mockPrisma.season.update.mockResolvedValueOnce({
      id: 1, status: "COMPLETED", periods: [],
    });

    const result = await transitionStatus(1, "COMPLETED");
    expect(result.status).toBe("COMPLETED");
  });

  it("rejects transition on non-existent season", async () => {
    mockPrisma.season.findUnique.mockResolvedValueOnce(null);

    await expect(transitionStatus(999, "DRAFT")).rejects.toThrow("Season not found");
  });

  it("rejects backward transition COMPLETED → anything", async () => {
    mockPrisma.season.findUnique.mockResolvedValueOnce({
      id: 1, leagueId: 1, status: "COMPLETED", periods: [],
    });

    await expect(transitionStatus(1, "IN_SEASON")).rejects.toThrow("Invalid transition");
  });
});
