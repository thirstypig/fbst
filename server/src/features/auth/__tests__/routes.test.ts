import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("../../../db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
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
import { authRouter } from "../routes.js";

const mockPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
};

function createApp(user?: { id: number; email: string; isAdmin: boolean } | null) {
  const app = express();
  app.use(express.json());
  // Simulate attachUser middleware
  app.use((req, _res, next) => {
    (req as any).user = user ?? null;
    next();
  });
  app.use("/auth", authRouter);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// --- GET /auth/health ---

describe("GET /auth/health", () => {
  it("returns ok when Supabase env vars are set", async () => {
    const origUrl = process.env.SUPABASE_URL;
    const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

    try {
      const app = createApp();
      const res = await request(app).get("/auth/health");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.provider).toBe("supabase");
    } finally {
      process.env.SUPABASE_URL = origUrl;
      process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
    }
  });

  it("returns degraded when Supabase env vars are missing", async () => {
    const origUrl = process.env.SUPABASE_URL;
    const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      const app = createApp();
      const res = await request(app).get("/auth/health");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("degraded");
    } finally {
      process.env.SUPABASE_URL = origUrl;
      process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
    }
  });
});

// --- GET /auth/me ---

describe("GET /auth/me", () => {
  it("returns null user when not authenticated", async () => {
    const app = createApp(null);

    const res = await request(app).get("/auth/me");

    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns full user with memberships when authenticated", async () => {
    const app = createApp({ id: 1, email: "test@test.com", isAdmin: false });
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 1,
      email: "test@test.com",
      name: "Test User",
      avatarUrl: null,
      isAdmin: false,
      memberships: [
        {
          leagueId: 10,
          role: "OWNER",
          league: { id: 10, name: "Fantasy League", season: 2025 },
        },
      ],
    });

    const res = await request(app).get("/auth/me");

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(1);
    expect(res.body.user.email).toBe("test@test.com");
    expect(res.body.user.memberships).toHaveLength(1);
    expect(res.body.user.memberships[0].leagueId).toBe(10);
    expect(res.body.user.memberships[0].role).toBe("OWNER");
    expect(res.body.user.memberships[0].league.name).toBe("Fantasy League");
  });

  it("returns null user when user not found in database", async () => {
    const app = createApp({ id: 999, email: "ghost@test.com", isAdmin: false });
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);

    const res = await request(app).get("/auth/me");

    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });

  it("returns admin user correctly", async () => {
    const app = createApp({ id: 1, email: "admin@test.com", isAdmin: true });
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 1,
      email: "admin@test.com",
      name: "Admin",
      avatarUrl: "https://example.com/avatar.jpg",
      isAdmin: true,
      memberships: [],
    });

    const res = await request(app).get("/auth/me");

    expect(res.status).toBe(200);
    expect(res.body.user.isAdmin).toBe(true);
    expect(res.body.user.avatarUrl).toBe("https://example.com/avatar.jpg");
    expect(res.body.user.memberships).toEqual([]);
  });

  it("handles user with multiple league memberships", async () => {
    const app = createApp({ id: 1, email: "multi@test.com", isAdmin: false });
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 1,
      email: "multi@test.com",
      name: "Multi User",
      avatarUrl: null,
      isAdmin: false,
      memberships: [
        { leagueId: 1, role: "COMMISSIONER", league: { id: 1, name: "League A", season: 2025 } },
        { leagueId: 2, role: "OWNER", league: { id: 2, name: "League B", season: 2025 } },
        { leagueId: 3, role: "VIEWER", league: { id: 3, name: "League C", season: 2024 } },
      ],
    });

    const res = await request(app).get("/auth/me");

    expect(res.status).toBe(200);
    expect(res.body.user.memberships).toHaveLength(3);
    expect(res.body.user.memberships[0].role).toBe("COMMISSIONER");
    expect(res.body.user.memberships[2].league.season).toBe(2024);
  });

  it("returns 500 on database error", async () => {
    const app = createApp({ id: 1, email: "test@test.com", isAdmin: false });
    mockPrisma.user.findUnique.mockRejectedValueOnce(new Error("Connection refused"));

    const res = await request(app).get("/auth/me");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Auth check failed");
  });
});
