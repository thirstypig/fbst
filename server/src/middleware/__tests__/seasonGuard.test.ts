import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireSeasonStatus } from "../seasonGuard.js";

// Mock Prisma
vi.mock("../../db/prisma.js", () => ({
  prisma: {
    season: { findFirst: vi.fn() },
    team: { findUnique: vi.fn() },
  },
}));

import { prisma } from "../../db/prisma.js";

const mockPrisma = prisma as any;

function mockReq(body: any): any {
  return { body };
}

function mockRes(): any {
  const res: any = { statusCode: 200, body: null };
  res.status = vi.fn((code: number) => { res.statusCode = code; return res; });
  res.json = vi.fn((data: any) => { res.body = data; return res; });
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireSeasonStatus", () => {
  describe("with body.leagueId source", () => {
    const guard = requireSeasonStatus(["DRAFT"]);

    it("calls next() when season is in allowed status", async () => {
      mockPrisma.season.findFirst.mockResolvedValue({ status: "DRAFT" });
      const req = mockReq({ leagueId: 1 });
      const res = mockRes();
      const next = vi.fn();

      await guard(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("returns 403 when season is not in allowed status", async () => {
      mockPrisma.season.findFirst.mockResolvedValue({ status: "IN_SEASON" });
      const req = mockReq({ leagueId: 1 });
      const res = mockRes();
      const next = vi.fn();

      await guard(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.error).toContain("DRAFT");
      expect(res.body.error).toContain("IN_SEASON");
    });

    it("returns 403 when no active season exists", async () => {
      mockPrisma.season.findFirst.mockResolvedValue(null);
      const req = mockReq({ leagueId: 1 });
      const res = mockRes();
      const next = vi.fn();

      await guard(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.error).toContain("no active season");
    });

    it("returns 400 when leagueId is missing", async () => {
      const req = mockReq({});
      const res = mockRes();
      const next = vi.fn();

      await guard(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("accepts multiple allowed statuses", async () => {
      const multiGuard = requireSeasonStatus(["SETUP", "DRAFT"]);
      mockPrisma.season.findFirst.mockResolvedValue({ status: "SETUP" });
      const req = mockReq({ leagueId: 1 });
      const res = mockRes();
      const next = vi.fn();

      await multiGuard(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe("with body.teamId source", () => {
    const guard = requireSeasonStatus(["IN_SEASON"], "body.teamId");

    it("resolves leagueId from team and checks season", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({ leagueId: 5 });
      mockPrisma.season.findFirst.mockResolvedValue({ status: "IN_SEASON" });
      const req = mockReq({ teamId: 10 });
      const res = mockRes();
      const next = vi.fn();

      await guard(req, res, next);

      expect(mockPrisma.team.findUnique).toHaveBeenCalledWith({
        where: { id: 10 },
        select: { leagueId: true },
      });
      expect(next).toHaveBeenCalledOnce();
    });

    it("returns 404 when team not found", async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);
      const req = mockReq({ teamId: 999 });
      const res = mockRes();
      const next = vi.fn();

      await guard(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 when teamId is missing", async () => {
      const req = mockReq({});
      const res = mockRes();
      const next = vi.fn();

      await guard(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 403 when season status doesn't match", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({ leagueId: 5 });
      mockPrisma.season.findFirst.mockResolvedValue({ status: "COMPLETED" });
      const req = mockReq({ teamId: 10 });
      const res = mockRes();
      const next = vi.fn();

      await guard(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  it("forwards errors to next()", async () => {
    const guard = requireSeasonStatus(["DRAFT"]);
    const err = new Error("DB down");
    mockPrisma.season.findFirst.mockRejectedValue(err);
    const req = mockReq({ leagueId: 1 });
    const res = mockRes();
    const next = vi.fn();

    await guard(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});
