import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("../../../db/prisma.js", () => ({
  prisma: {
    trade: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    roster: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    team: { update: vi.fn() },
    $transaction: vi.fn(),
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
import { tradesRouter } from "../routes.js";

const app = express();
app.use(express.json());
app.use("/trades", tradesRouter);

const mockPrisma = prisma as unknown as {
  trade: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  roster: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  team: { update: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

// --- POST /trades ---

describe("POST /trades", () => {
  const validBody = {
    leagueId: 1,
    proposerTeamId: 2,
    items: [
      { senderId: 2, recipientId: 3, assetType: "PLAYER", playerId: 10 },
    ],
  };

  it("creates a trade with valid input", async () => {
    const created = { id: 1, ...validBody, status: "PROPOSED", items: validBody.items };
    mockPrisma.trade.create.mockResolvedValueOnce(created);

    const res = await request(app).post("/trades").send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("PROPOSED");
    expect(mockPrisma.trade.create).toHaveBeenCalledOnce();
  });

  it("returns 400 when leagueId is missing", async () => {
    const res = await request(app)
      .post("/trades")
      .send({ proposerTeamId: 2, items: [{ senderId: 1, recipientId: 2, assetType: "PLAYER" }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/leagueId/i);
  });

  it("returns 400 when proposerTeamId is missing", async () => {
    const res = await request(app)
      .post("/trades")
      .send({ leagueId: 1, items: [{ senderId: 1, recipientId: 2, assetType: "PLAYER" }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/proposerTeamId/i);
  });

  it("returns 400 when items is empty", async () => {
    const res = await request(app)
      .post("/trades")
      .send({ leagueId: 1, proposerTeamId: 2, items: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/item/i);
  });

  it("returns 400 for invalid assetType", async () => {
    const res = await request(app)
      .post("/trades")
      .send({
        leagueId: 1,
        proposerTeamId: 2,
        items: [{ senderId: 1, recipientId: 2, assetType: "INVALID" }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assetType/i);
  });

  it("returns 400 for item missing senderId", async () => {
    const res = await request(app)
      .post("/trades")
      .send({
        leagueId: 1,
        proposerTeamId: 2,
        items: [{ recipientId: 2, assetType: "PLAYER" }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/senderId/i);
  });

  it("returns 500 on database error", async () => {
    mockPrisma.trade.create.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).post("/trades").send(validBody);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to create trade");
  });
});

// --- GET /trades ---

describe("GET /trades", () => {
  it("returns trades for a valid leagueId", async () => {
    const trades = [
      { id: 1, leagueId: 1, status: "PROPOSED", items: [], proposer: { id: 2, name: "Team A" } },
    ];
    mockPrisma.trade.findMany.mockResolvedValueOnce(trades);

    const res = await request(app).get("/trades?leagueId=1");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("returns 400 when leagueId is missing", async () => {
    const res = await request(app).get("/trades");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/leagueId/i);
  });

  it("returns 400 for non-numeric leagueId", async () => {
    const res = await request(app).get("/trades?leagueId=abc");

    expect(res.status).toBe(400);
  });

  it("returns empty array when no trades exist", async () => {
    mockPrisma.trade.findMany.mockResolvedValueOnce([]);

    const res = await request(app).get("/trades?leagueId=1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// --- POST /trades/:id/accept ---

describe("POST /trades/:id/accept", () => {
  it("accepts a PROPOSED trade", async () => {
    mockPrisma.trade.findUnique.mockResolvedValueOnce({ id: 1, status: "PROPOSED" });
    mockPrisma.trade.update.mockResolvedValueOnce({ id: 1, status: "ACCEPTED" });

    const res = await request(app).post("/trades/1/accept");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ACCEPTED");
  });

  it("returns 404 for non-existent trade", async () => {
    mockPrisma.trade.findUnique.mockResolvedValueOnce(null);

    const res = await request(app).post("/trades/999/accept");

    expect(res.status).toBe(404);
  });

  it("returns 400 for already accepted trade", async () => {
    mockPrisma.trade.findUnique.mockResolvedValueOnce({ id: 1, status: "ACCEPTED" });

    const res = await request(app).post("/trades/1/accept");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/ACCEPTED/);
  });

  it("returns 400 for invalid trade ID", async () => {
    const res = await request(app).post("/trades/abc/accept");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });
});

// --- POST /trades/:id/reject ---

describe("POST /trades/:id/reject", () => {
  it("rejects a PROPOSED trade", async () => {
    mockPrisma.trade.findUnique.mockResolvedValueOnce({ id: 1, status: "PROPOSED" });
    mockPrisma.trade.update.mockResolvedValueOnce({ id: 1, status: "REJECTED" });

    const res = await request(app).post("/trades/1/reject");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("REJECTED");
  });

  it("returns 404 for non-existent trade", async () => {
    mockPrisma.trade.findUnique.mockResolvedValueOnce(null);

    const res = await request(app).post("/trades/999/reject");

    expect(res.status).toBe(404);
  });

  it("returns 400 for already processed trade", async () => {
    mockPrisma.trade.findUnique.mockResolvedValueOnce({ id: 1, status: "PROCESSED" });

    const res = await request(app).post("/trades/1/reject");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/PROCESSED/);
  });
});

// --- POST /trades/:id/process ---

describe("POST /trades/:id/process", () => {
  it("processes an ACCEPTED trade", async () => {
    mockPrisma.trade.findUnique.mockResolvedValueOnce({
      id: 1,
      status: "ACCEPTED",
      items: [{ assetType: "PLAYER", playerId: 10, senderId: 2, recipientId: 3 }],
    });
    mockPrisma.$transaction.mockImplementationOnce(async (fn: Function) => fn(mockPrisma));
    mockPrisma.roster.findFirst.mockResolvedValueOnce({ id: 100, price: 15 });
    mockPrisma.roster.update.mockResolvedValueOnce({});
    mockPrisma.roster.create.mockResolvedValueOnce({});
    mockPrisma.trade.update.mockResolvedValueOnce({ id: 1, status: "PROCESSED" });

    const res = await request(app).post("/trades/1/process");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 for non-existent trade", async () => {
    mockPrisma.trade.findUnique.mockResolvedValueOnce(null);

    const res = await request(app).post("/trades/999/process");

    expect(res.status).toBe(404);
  });

  it("returns 400 for trade not in ACCEPTED status", async () => {
    mockPrisma.trade.findUnique.mockResolvedValueOnce({ id: 1, status: "PROPOSED", items: [] });

    const res = await request(app).post("/trades/1/process");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/PROPOSED/);
  });

  it("processes BUDGET transfers", async () => {
    mockPrisma.trade.findUnique.mockResolvedValueOnce({
      id: 1,
      status: "ACCEPTED",
      items: [{ assetType: "BUDGET", amount: 50, senderId: 2, recipientId: 3 }],
    });
    mockPrisma.$transaction.mockImplementationOnce(async (fn: Function) => fn(mockPrisma));
    mockPrisma.team.update.mockResolvedValue({});
    mockPrisma.trade.update.mockResolvedValueOnce({});

    const res = await request(app).post("/trades/1/process");

    expect(res.status).toBe(200);
    expect(mockPrisma.team.update).toHaveBeenCalledTimes(2);
  });

  it("returns 400 for invalid trade ID", async () => {
    const res = await request(app).post("/trades/abc/process");

    expect(res.status).toBe(400);
  });

  it("returns 500 on transaction failure", async () => {
    mockPrisma.trade.findUnique.mockResolvedValueOnce({
      id: 1,
      status: "ACCEPTED",
      items: [],
    });
    mockPrisma.$transaction.mockRejectedValueOnce(new Error("Transaction failed"));

    const res = await request(app).post("/trades/1/process");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to process trade");
  });
});
