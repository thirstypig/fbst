import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma and Supabase before importing auth module to avoid DB connection
vi.mock("../../db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    leagueMembership: { findUnique: vi.fn() },
  },
}));

vi.mock("../../lib/supabase.js", () => ({
  supabaseAdmin: {
    auth: { getUser: vi.fn() },
  },
}));

import { requireAuth, requireAdmin, parseIntParam } from "../auth.js";

/**
 * Tests for the auth middleware functions.
 * These test the synchronous middleware functions (requireAuth, requireAdmin, parseIntParam).
 * attachUser and requireLeagueRole require Supabase/Prisma mocking and are tested separately.
 */

function mockReq(user?: any): any {
  return { user: user ?? null };
}

function mockRes(): any {
  const res: any = {
    statusCode: 200,
    body: null,
  };
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((data: any) => {
    res.body = data;
    return res;
  });
  return res;
}

describe("requireAuth", () => {
  it("calls next() when user is present", () => {
    const req = mockReq({ id: 1, email: "test@test.com", isAdmin: false });
    const res = mockRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 401 when user is null", () => {
    const req = mockReq(null);
    const res = mockRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ error: "Not authenticated" });
  });

  it("returns 401 when user is undefined", () => {
    const req = mockReq(undefined);
    const res = mockRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe("requireAdmin", () => {
  it("calls next() when user is admin", () => {
    const req = mockReq({ id: 1, email: "admin@test.com", isAdmin: true });
    const res = mockRes();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 403 when user is not admin", () => {
    const req = mockReq({ id: 1, email: "user@test.com", isAdmin: false });
    const res = mockRes();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body).toEqual({ error: "Admin only" });
  });

  it("returns 401 when user is null", () => {
    const req = mockReq(null);
    const res = mockRes();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ error: "Not authenticated" });
  });
});

describe("parseIntParam", () => {
  it("parses valid integer strings", () => {
    expect(parseIntParam("42")).toBe(42);
    expect(parseIntParam("0")).toBe(0);
    expect(parseIntParam("-5")).toBe(-5);
  });

  it("parses numbers", () => {
    expect(parseIntParam(42)).toBe(42);
    expect(parseIntParam(3.14)).toBe(3.14);
  });

  it("returns null for non-numeric values", () => {
    expect(parseIntParam("abc")).toBeNull();
  });

  it("returns 0 for null/undefined (nullish coalescing → empty string → 0)", () => {
    // parseIntParam uses (v ?? "") so null/undefined become "", Number("") === 0
    expect(parseIntParam(null)).toBe(0);
    expect(parseIntParam(undefined)).toBe(0);
  });

  it("returns 0 for empty string (Number('') === 0)", () => {
    // Note: Number("") returns 0 in JS, so parseIntParam treats it as finite
    expect(parseIntParam("")).toBe(0);
    expect(parseIntParam("  ")).toBe(0);
  });

  it("handles strings with whitespace around numbers", () => {
    expect(parseIntParam("  42  ")).toBe(42);
  });

  it("returns null for Infinity", () => {
    expect(parseIntParam(Infinity)).toBeNull();
    expect(parseIntParam(-Infinity)).toBeNull();
    expect(parseIntParam(NaN)).toBeNull();
  });
});
