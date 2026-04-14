import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextFunction } from "express";

// Ensure IP_HASH_SECRET is set BEFORE any import that transitively loads
// lib/ipHash.ts — that module throws at import time if the secret is missing.
// Assignment runs in module-init order, so this must appear above the
// static import of `../routes.js` below.
process.env.IP_HASH_SECRET =
  process.env.IP_HASH_SECRET ??
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// ── Mocks (hoisted) ──────────────────────────────────────────────

vi.mock("../../../db/prisma.js", () => ({
  prisma: {
    userSession: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    userMetrics: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(async (fn: any) => {
      // Support both callback and array forms. We only use the callback form
      // in /start, so we route the tx object back to the same mocked prisma.
      if (typeof fn === "function") {
        const { prisma } = await import("../../../db/prisma.js");
        return fn(prisma);
      }
      return Promise.all(fn);
    }),
    $executeRaw: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock("../../../lib/logger.js", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("../../../lib/auditLog.js", () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock("../../../middleware/auth.js", () => ({
  requireAuth: (_req: unknown, _res: unknown, next: NextFunction) => next(),
}));

vi.mock("../../../middleware/asyncHandler.js", () => ({
  asyncHandler: (fn: Function) => fn,
}));

// Keep real validateBody — we want to exercise Zod shape checks.
// (The real implementation lives at ../../../middleware/validate.js)

import { prisma } from "../../../db/prisma.js";
import { writeAuditLog } from "../../../lib/auditLog.js";
import express from "express";
import supertest from "supertest";

// Dynamic import so the process.env assignment above lands before the module
// under test evaluates (ipHash.ts throws at import time without the secret).
const { sessionsRouter, __resetSessionRateLimitersForTests } = await import("../routes.js");

const mockPrisma = prisma as any;

function makeApp(userId = 42) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: NextFunction) => {
    req.user = { id: userId, email: "u@example.com", isAdmin: false };
    // req.ip is a getter on IncomingMessage — must define via descriptor
    Object.defineProperty(req, "ip", { value: "1.2.3.4", configurable: true });
    next();
  });
  app.use(sessionsRouter);
  app.use((err: any, _req: any, res: any, _next: NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  __resetSessionRateLimitersForTests();
  // Default mocks — tests override as needed
  mockPrisma.userSession.count.mockResolvedValue(0);
  mockPrisma.userSession.findFirst.mockResolvedValue(null);
  mockPrisma.userSession.create.mockResolvedValue({
    token: "tok-abc",
    startedAt: new Date(),
  });
  mockPrisma.userMetrics.upsert.mockResolvedValue({ userId: 42 });
});

// ── POST /start ──────────────────────────────────────────────────

describe("POST /start", () => {
  it("creates a session, upserts metrics, writes audit log, returns 201 with token", async () => {
    const app = makeApp();
    const res = await supertest(app).post("/start").send({ signupSource: "google" });

    expect(res.status).toBe(201);
    expect(res.body.token).toBe("tok-abc");
    expect(res.body.expiresAt).toEqual(expect.any(String));

    expect(mockPrisma.userSession.create).toHaveBeenCalledOnce();
    const createArgs = mockPrisma.userSession.create.mock.calls[0][0];
    expect(createArgs.data.userId).toBe(42);
    expect(createArgs.data.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(createArgs.data.ipTruncated).toBe("1.2.3.0");
    expect(createArgs.data.ipRaw).toBe("1.2.3.4");

    expect(mockPrisma.userMetrics.upsert).toHaveBeenCalledOnce();
    const upsertArgs = mockPrisma.userMetrics.upsert.mock.calls[0][0];
    expect(upsertArgs.where).toEqual({ userId: 42 });
    expect(upsertArgs.create.totalLogins).toBe(1);
    expect(upsertArgs.update.totalLogins).toEqual({ increment: 1 });
    expect(upsertArgs.update.totalSessions).toEqual({ increment: 1 });

    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42, action: "LOGIN", resourceType: "User" }),
    );
  });

  it("closes the oldest open session when concurrent-session cap is reached", async () => {
    mockPrisma.userSession.count.mockResolvedValue(10);
    mockPrisma.userSession.findFirst.mockResolvedValue({
      id: 7,
      startedAt: new Date(Date.now() - 60 * 60 * 1000),
      lastSeenAt: new Date(Date.now() - 30 * 60 * 1000),
    });

    const app = makeApp();
    const res = await supertest(app).post("/start").send({});

    expect(res.status).toBe(201);
    expect(mockPrisma.userSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: expect.objectContaining({ endReason: "session_cap" }),
      }),
    );
  });

  it("rejects with 429 when credential-stuffing canary fires", async () => {
    // count() is used for BOTH the canary (first call) and the cap check (inside tx).
    // Return 101 first, then 0 — canary should short-circuit before the tx runs.
    mockPrisma.userSession.count.mockResolvedValueOnce(101).mockResolvedValue(0);

    const app = makeApp();
    const res = await supertest(app).post("/start").send({});

    expect(res.status).toBe(429);
    expect(mockPrisma.userSession.create).not.toHaveBeenCalled();
  });
});

// ── POST /heartbeat ──────────────────────────────────────────────

describe("POST /heartbeat", () => {
  it("returns 204 with no DB write when token belongs to a different user", async () => {
    mockPrisma.userSession.findUnique.mockResolvedValue({
      id: 1,
      userId: 999, // different user
      lastSeenAt: new Date(Date.now() - 60_000),
      endedAt: null,
    });
    const app = makeApp();
    const res = await supertest(app).post("/heartbeat").send({ token: "abc" });

    expect(res.status).toBe(204);
    expect(mockPrisma.userSession.update).not.toHaveBeenCalled();
  });

  it("deduplicates heartbeats within 25s without writing", async () => {
    mockPrisma.userSession.findUnique.mockResolvedValue({
      id: 1,
      userId: 42,
      lastSeenAt: new Date(Date.now() - 10_000), // 10s ago — within dedupe window
      endedAt: null,
    });
    const app = makeApp();
    const res = await supertest(app).post("/heartbeat").send({ token: "abc" });

    expect(res.status).toBe(204);
    expect(mockPrisma.userSession.update).not.toHaveBeenCalled();
  });

  it("updates lastSeenAt on a valid heartbeat outside the dedupe window", async () => {
    mockPrisma.userSession.findUnique.mockResolvedValue({
      id: 1,
      userId: 42,
      lastSeenAt: new Date(Date.now() - 60_000), // 60s ago
      endedAt: null,
    });
    mockPrisma.userSession.update.mockResolvedValue({});
    const app = makeApp();
    const res = await supertest(app).post("/heartbeat").send({ token: "abc" });

    expect(res.status).toBe(204);
    expect(mockPrisma.userSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ lastSeenAt: expect.any(Date) }),
      }),
    );
  });

  it("returns 400 on validation failure (missing token)", async () => {
    const app = makeApp();
    const res = await supertest(app).post("/heartbeat").send({});
    expect(res.status).toBe(400);
  });
});

// ── POST /end ────────────────────────────────────────────────────

describe("POST /end", () => {
  it("computes duration, sets endReason, and rolls up UserMetrics via $executeRaw", async () => {
    const startedAt = new Date(Date.now() - 5 * 60 * 1000); // 5 min ago
    mockPrisma.userSession.findUnique.mockResolvedValue({
      id: 1,
      userId: 42,
      startedAt,
      endedAt: null,
    });
    mockPrisma.userSession.update.mockResolvedValue({});

    const app = makeApp();
    const res = await supertest(app).post("/end").send({ token: "abc", reason: "logout" });

    expect(res.status).toBe(204);
    expect(mockPrisma.userSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          endReason: "logout",
          durationSec: expect.any(Number),
          endedAt: expect.any(Date),
        }),
      }),
    );
    const durationArg = mockPrisma.userSession.update.mock.calls[0][0].data.durationSec;
    expect(durationArg).toBeGreaterThan(0);
    expect(durationArg).toBeLessThanOrEqual(28_800);

    expect(mockPrisma.$executeRaw).toHaveBeenCalled();
  });

  it("returns 204 silently when token is not owned by the requester", async () => {
    mockPrisma.userSession.findUnique.mockResolvedValue({
      id: 1,
      userId: 999,
      startedAt: new Date(),
      endedAt: null,
    });
    const app = makeApp();
    const res = await supertest(app).post("/end").send({ token: "abc" });

    expect(res.status).toBe(204);
    expect(mockPrisma.userSession.update).not.toHaveBeenCalled();
    expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
  });

  it("returns 204 silently when session is already ended", async () => {
    mockPrisma.userSession.findUnique.mockResolvedValue({
      id: 1,
      userId: 42,
      startedAt: new Date(Date.now() - 60_000),
      endedAt: new Date(),
    });
    const app = makeApp();
    const res = await supertest(app).post("/end").send({ token: "abc" });

    expect(res.status).toBe(204);
    expect(mockPrisma.userSession.update).not.toHaveBeenCalled();
  });
});
