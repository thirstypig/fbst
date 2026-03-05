import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { validateBody } from "../validate.js";

function mockReq(body: any): any {
  return { body };
}

function mockRes(): any {
  const res: any = { statusCode: 200, body: null };
  res.status = vi.fn((code: number) => { res.statusCode = code; return res; });
  res.json = vi.fn((data: any) => { res.body = data; return res; });
  return res;
}

const schema = z.object({
  name: z.string().min(1),
  age: z.number().int().positive(),
});

describe("validateBody", () => {
  const middleware = validateBody(schema);

  it("calls next() and sets req.body to parsed data on valid input", () => {
    const req = mockReq({ name: "Alice", age: 30 });
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.body).toEqual({ name: "Alice", age: 30 });
  });

  it("strips extra fields from req.body", () => {
    const req = mockReq({ name: "Bob", age: 25, extra: "ignored" });
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ name: "Bob", age: 25 });
    expect(req.body.extra).toBeUndefined();
  });

  it("returns 400 with details when required field is missing", () => {
    const req = mockReq({ name: "Alice" });
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Validation failed");
    expect(res.body.details).toBeInstanceOf(Array);
    expect(res.body.details.length).toBeGreaterThan(0);
    expect(res.body.details[0].path).toBe("age");
  });

  it("returns 400 when field has wrong type", () => {
    const req = mockReq({ name: "Alice", age: "not-a-number" });
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 when body is empty", () => {
    const req = mockReq({});
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.details.length).toBeGreaterThanOrEqual(2);
  });

  it("returns 400 when body is null/undefined", () => {
    const req = mockReq(null);
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  it("returns multiple error details for multiple invalid fields", () => {
    const req = mockReq({ name: "", age: -5 });
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.details.length).toBe(2);
  });
});
