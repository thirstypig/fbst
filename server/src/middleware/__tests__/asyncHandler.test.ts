import { describe, it, expect, vi } from "vitest";
import { asyncHandler } from "../asyncHandler.js";

function mockReq(): any {
  return {};
}

function mockRes(): any {
  const res: any = { statusCode: 200, body: null };
  res.status = vi.fn((code: number) => { res.statusCode = code; return res; });
  res.json = vi.fn((data: any) => { res.body = data; return res; });
  return res;
}

describe("asyncHandler", () => {
  it("calls the wrapped async function normally", async () => {
    const handler = vi.fn(async (_req, res) => {
      res.json({ ok: true });
    });
    const wrapped = asyncHandler(handler);
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    await wrapped(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(res.body).toEqual({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards rejected promises to next(err)", async () => {
    const error = new Error("DB connection failed");
    const handler = vi.fn(async () => {
      throw error;
    });
    const wrapped = asyncHandler(handler);
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    await wrapped(req, res, next);

    // Wait for microtask to resolve the catch
    await new Promise((r) => setTimeout(r, 0));

    expect(next).toHaveBeenCalledWith(error);
  });

  it("handles synchronous errors wrapped in async", async () => {
    const handler = asyncHandler(async () => {
      JSON.parse("not json{{{");
    });
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    await handler(req, res, next);
    await new Promise((r) => setTimeout(r, 0));

    expect(next).toHaveBeenCalledWith(expect.any(SyntaxError));
  });

  it("does not call next on successful resolution", async () => {
    const wrapped = asyncHandler(async (_req, res) => {
      res.json({ done: true });
    });
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    await wrapped(req, res, next);
    await new Promise((r) => setTimeout(r, 0));

    expect(next).not.toHaveBeenCalled();
  });
});
