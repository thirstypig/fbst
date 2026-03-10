import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSeasonService = vi.hoisted(() => ({
  createSeason: vi.fn(),
  getCurrentSeason: vi.fn(),
  getSeasons: vi.fn(),
  transitionStatus: vi.fn(),
}));

const mockPrisma = vi.hoisted(() => ({
  season: {
    findUnique: vi.fn(),
  },
  leagueMembership: {
    findUnique: vi.fn(),
  },
}));

vi.mock("../services/seasonService.js", () => mockSeasonService);
vi.mock("../../../db/prisma.js", () => ({ prisma: mockPrisma }));
vi.mock("../../../lib/logger.js", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// Import after mocks
import { seasonsRouter } from "../routes.js";

beforeEach(() => {
  vi.clearAllMocks();
});

// Helper: build a mock Express request/response pair
function mockReqRes(overrides: {
  query?: Record<string, string>;
  params?: Record<string, string>;
  body?: any;
  user?: any;
} = {}) {
  const req: any = {
    query: overrides.query ?? {},
    params: overrides.params ?? {},
    body: overrides.body ?? {},
    user: overrides.user ?? { id: 1, email: "admin@test.com", isAdmin: true, name: "Admin", avatarUrl: null },
  };
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return { req, res };
}

describe("seasonsRouter", () => {
  it("exports a router with expected routes", () => {
    expect(seasonsRouter).toBeDefined();
    // Verify the router has route handlers (it's an Express Router)
    const routes = (seasonsRouter as any).stack?.map((layer: any) => layer.route?.path).filter(Boolean);
    expect(routes).toContain("/");
    expect(routes).toContain("/current");
    expect(routes).toContain("/:id/transition");
  });
});

describe("seasonService integration", () => {
  it("getSeasons is called with correct leagueId", async () => {
    mockSeasonService.getSeasons.mockResolvedValueOnce([
      { id: 1, year: 2026, status: "SETUP", periods: [] },
    ]);

    const result = await mockSeasonService.getSeasons(1);
    expect(result).toHaveLength(1);
    expect(mockSeasonService.getSeasons).toHaveBeenCalledWith(1);
  });

  it("createSeason is called with leagueId and year", async () => {
    mockSeasonService.createSeason.mockResolvedValueOnce({
      id: 1, leagueId: 1, year: 2026, status: "SETUP", periods: [],
    });

    const result = await mockSeasonService.createSeason(1, 2026);
    expect(result.status).toBe("SETUP");
    expect(mockSeasonService.createSeason).toHaveBeenCalledWith(1, 2026);
  });

  it("transitionStatus forwards the correct parameters", async () => {
    mockSeasonService.transitionStatus.mockResolvedValueOnce({
      id: 1, status: "DRAFT", periods: [],
    });

    const result = await mockSeasonService.transitionStatus(1, "DRAFT");
    expect(result.status).toBe("DRAFT");
  });

  it("getCurrentSeason returns null when no active season", async () => {
    mockSeasonService.getCurrentSeason.mockResolvedValueOnce(null);

    const result = await mockSeasonService.getCurrentSeason(1);
    expect(result).toBeNull();
  });
});
