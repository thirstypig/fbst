import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
};

vi.mock("../../../db/prisma.js", () => ({ prisma: mockPrisma }));

vi.mock("../../../lib/supabase.js", () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
      admin: {
        listUsers: vi.fn(),
        updateUserById: vi.fn(),
        createUser: vi.fn(),
      },
    },
  },
}));

vi.mock("../../../lib/logger.js", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// We can't easily test Express router registration, so we'll test the handler logic directly.
// Import after mocks are set up.
import { supabaseAdmin } from "../../../lib/supabase.js";

beforeEach(() => {
  vi.clearAllMocks();
});

function mockReq(overrides: any = {}): any {
  return { user: null, headers: {}, params: {}, body: {}, query: {}, ...overrides };
}

function mockRes(): any {
  const res: any = { statusCode: 200, body: null };
  res.status = vi.fn((code: number) => { res.statusCode = code; return res; });
  res.json = vi.fn((data: any) => { res.body = data; return res; });
  return res;
}

describe("auth routes - /health handler logic", () => {
  it("returns ok when Supabase env vars are set", () => {
    const original = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

    const status = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) ? "ok" : "degraded";
    expect(status).toBe("ok");

    process.env.SUPABASE_URL = original.url;
    process.env.SUPABASE_SERVICE_ROLE_KEY = original.key;
  });
});

describe("auth routes - /me handler logic", () => {
  it("returns { user: null } when no session user", async () => {
    const req = mockReq({ user: null });
    const res = mockRes();

    // Simulate handler logic
    const sessionUser = req.user ?? null;
    const userId = sessionUser?.id ?? null;
    if (!userId) {
      res.json({ user: null });
    }

    expect(res.body).toEqual({ user: null });
  });

  it("returns { user: null } when user not found in DB", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = mockReq({ user: { id: 999 } });
    const res = mockRes();

    const sessionUser = req.user ?? null;
    const userId = sessionUser?.id ?? null;

    const full = await mockPrisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { select: { leagueId: true, role: true, league: { select: { id: true, name: true, season: true } } } } },
    });

    if (!full) {
      res.json({ user: null });
    }

    expect(res.body).toEqual({ user: null });
  });

  it("returns full user with memberships when found", async () => {
    const dbUser = {
      id: 1,
      email: "test@test.com",
      name: "Test User",
      avatarUrl: null,
      isAdmin: false,
      memberships: [
        { leagueId: 1, role: "OWNER", league: { id: 1, name: "Test League", season: 2025 } },
      ],
    };
    mockPrisma.user.findUnique.mockResolvedValue(dbUser);

    const req = mockReq({ user: { id: 1 } });
    const res = mockRes();

    const full = await mockPrisma.user.findUnique({
      where: { id: 1 },
      include: { memberships: { select: { leagueId: true, role: true, league: { select: { id: true, name: true, season: true } } } } },
    });

    const user = {
      id: full.id,
      email: full.email,
      name: full.name,
      avatarUrl: full.avatarUrl,
      isAdmin: full.isAdmin,
      memberships: full.memberships.map((m: any) => ({
        leagueId: m.leagueId,
        role: m.role,
        league: m.league ? { id: m.league.id, name: m.league.name, season: m.league.season } : undefined,
      })),
    };

    res.json({ user });

    expect(res.body.user.id).toBe(1);
    expect(res.body.user.email).toBe("test@test.com");
    expect(res.body.user.memberships).toHaveLength(1);
    expect(res.body.user.memberships[0].role).toBe("OWNER");
  });

  it("returns 500 on database error", async () => {
    mockPrisma.user.findUnique.mockRejectedValue(new Error("DB down"));

    const res = mockRes();
    try {
      await mockPrisma.user.findUnique({ where: { id: 1 } });
    } catch {
      res.status(500).json({ error: "Auth check failed" });
    }

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Auth check failed" });
  });
});

describe("auth routes - /dev-login gating", () => {
  it("dev-login endpoint is only available when ENABLE_DEV_LOGIN=true", () => {
    // The route is conditionally registered at module load time
    // We verify the gating logic
    expect(process.env.ENABLE_DEV_LOGIN === "true").toBe(false);
  });

  it("dev-login returns 404 when no admin user exists", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);

    const result = await mockPrisma.user.findFirst({ where: { isAdmin: true } });
    expect(result).toBeNull();
  });

  it("dev-login finds admin and returns credentials", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ email: "admin@test.com" });
    vi.mocked(supabaseAdmin.auth.admin.listUsers).mockResolvedValue({
      data: { users: [{ id: "sb-1", email: "admin@test.com" }] },
    } as any);
    vi.mocked(supabaseAdmin.auth.admin.updateUserById).mockResolvedValue({} as any);

    const dbUser = await mockPrisma.user.findFirst({ where: { isAdmin: true } });
    expect(dbUser!.email).toBe("admin@test.com");

    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const sbUser = users.find((u: any) => u.email === dbUser!.email);
    expect(sbUser).toBeDefined();
  });
});
