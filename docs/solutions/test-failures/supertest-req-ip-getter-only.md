---
title: "Cannot assign req.ip in supertest mock — getter-only property"
category: test-failures
problem_type: test_infrastructure
component: "supertest + express middleware"
tags:
  - supertest
  - express
  - vitest
  - node-http
  - testing
  - incomingmessage
  - getter-only
  - middleware-mock
symptoms:
  - "TypeError: Cannot set property ip of #<IncomingMessage> which has only a getter"
  - All 10 session route tests failed at mock middleware setup
  - Direct assignment `req.ip = "1.2.3.4"` throws in ESM/strict mode
  - Tests using supertest mock middleware cannot inject client IP via property assignment
date: 2026-04-13
status: resolved
severity: low
resolution_time: "~5 minutes once root cause identified"
---

# Cannot assign `req.ip` in supertest mock — getter-only property

## Symptoms

- `TypeError: Cannot set property ip of #<IncomingMessage> which has only a getter`
- Thrown the moment any request hits a test middleware that does `req.ip = "1.2.3.4"`
- All supertest-based tests for the affected router fail at setup, before the route handler runs
- Happens only in tests; production traffic works fine

## Root Cause

Express doesn't store `req.ip` as a plain property — it defines `ip` as a **getter** on `req` (via `Object.defineProperty` on the request prototype). The getter computes the value on read from `req.connection.remoteAddress`, combined with the `X-Forwarded-For` header when `app.set('trust proxy', ...)` is enabled. Because the property descriptor has a getter but no setter, plain assignment (`req.ip = "..."`) throws in strict mode / ES modules. In production this never surfaces because the codebase only *reads* `req.ip` (e.g., for hashing into a session-tracking IP fingerprint) — it never writes it. The bug only appears when test middleware tries to stub the value.

## Solution

```ts
// BEFORE — throws "Cannot set property ip of #<IncomingMessage> which has only a getter"
app.use((req: any, _res: any, next: NextFunction) => {
  req.user = { id: userId, email: "u@example.com", isAdmin: false };
  req.ip = "1.2.3.4"; // ❌ ip is a getter, direct assignment fails
  next();
});

// AFTER — define the property descriptor to override the getter
app.use((req: any, _res: any, next: NextFunction) => {
  req.user = { id: userId, email: "u@example.com", isAdmin: false };
  // req.ip is a getter on IncomingMessage — must shadow it via defineProperty
  Object.defineProperty(req, "ip", { value: "1.2.3.4", configurable: true });
  next();
});
```

Result: 16/16 tests pass.

## Why `configurable: true` matters

Setting `configurable: true` keeps the property re-definable after this call. Without it, the descriptor becomes locked — any subsequent `Object.defineProperty` call (from another test helper, a cleanup hook, or Express internals that may re-assert request properties) will throw `TypeError: Cannot redefine property: ip`. If multiple middlewares or per-test setup functions need to stub `req.ip` with different values across a suite, omitting `configurable` silently breaks the second stub. Always include it when shadowing native getters in tests.

## Prevention

- When mocking any Node.js request property in supertest tests, check if it's a getter on `IncomingMessage`/Express `Request` before assigning. Common getters: `ip`, `ips`, `protocol`, `secure`, `hostname`, `subdomains`, `xhr`, `fresh`, `stale` — all must use `Object.defineProperty` with `configurable: true`.
- Centralize all request/auth mocking in a shared helper (`server/src/__tests__/helpers/mockRequest.ts`) rather than inlining `(req as any).user = ...` in each test file — one fix propagates everywhere and prevents drift.
- Add a lint/review rule: any test that does `req.ip =`, `req.protocol =`, or direct getter assignment must be flagged. Grep for `req\.(ip|ips|protocol|hostname|secure)\s*=` in PR review.
- Prefer `supertest`'s built-in request shaping (`.set("X-Forwarded-For", ...)` with `app.set("trust proxy", true)`) over mocking `req.ip` directly when what you really want is to test rate-limiting or IP-based logic end-to-end.
- Document the getter-vs-setter trap in the feature-module test template so new contributors see it before they write their first middleware test.

## Reusable Test Helper (proposed)

Drop into `server/src/__tests__/helpers/mockRequest.ts` to centralize this once:

```ts
import type { Request } from "express";

export interface MockAuthOptions {
  userId: number | string;
  email?: string;
  isAdmin?: boolean;
  ip?: string;
  ips?: string[];
  protocol?: "http" | "https";
  hostname?: string;
}

/**
 * Attach a fake authenticated user + request metadata to an Express req.
 *
 * Uses Object.defineProperty for getter-only fields on IncomingMessage/Request
 * (ip, ips, protocol, hostname) to avoid "Cannot set property X which has only a getter".
 *
 * Usage:
 *   app.use((req, _res, next) => {
 *     mockAuthedRequest(req, { userId: 42, isAdmin: true });
 *     next();
 *   });
 */
export function mockAuthedRequest(req: Request, opts: MockAuthOptions): void {
  // Regular (writable) props — plain assignment is fine.
  (req as any).user = {
    id: opts.userId,
    email: opts.email ?? `user${opts.userId}@test.local`,
    isAdmin: opts.isAdmin ?? false,
  };

  // Getter-only fields — MUST use defineProperty.
  const getterFields: Array<[keyof MockAuthOptions, unknown]> = [
    ["ip", opts.ip ?? "127.0.0.1"],
    ["ips", opts.ips ?? []],
    ["protocol", opts.protocol ?? "http"],
    ["hostname", opts.hostname ?? "localhost"],
  ];

  for (const [key, value] of getterFields) {
    if (opts[key] === undefined && key !== "ip") continue; // only set defaults for ip
    Object.defineProperty(req, key, {
      value,
      configurable: true,
      writable: true,
      enumerable: true,
    });
  }
}

/** Escape hatch: clears overrides so the next test starts clean. */
export function resetMockedRequest(req: Request): void {
  delete (req as any).user;
  for (const key of ["ip", "ips", "protocol", "hostname"]) {
    if (Object.getOwnPropertyDescriptor(req, key)?.configurable) {
      delete (req as any)[key];
    }
  }
}
```

## Quick Regression Test

A canary test that fails loudly if anyone reverts the pattern:

```ts
// server/src/__tests__/helpers/__tests__/mockRequest.test.ts
import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { mockAuthedRequest } from "../mockRequest";

describe("mockRequest helper (regression guard)", () => {
  it("documents that req.ip is getter-only on IncomingMessage", async () => {
    const app = express();
    app.get("/probe", (req, res) => {
      // If someone removes Object.defineProperty from the helper and reverts
      // to `req.ip = "x"`, this assertion fires — that's the canary.
      expect(() => {
        (req as any).ip = "should-throw";
      }).toThrow(/has only a getter|Cannot set/);
      res.json({ ok: true });
    });
    await request(app).get("/probe").expect(200);
  });

  it("mockAuthedRequest sets req.ip without throwing", async () => {
    const app = express();
    app.use((req, _res, next) => {
      mockAuthedRequest(req, { userId: 1, ip: "10.0.0.5" });
      next();
    });
    app.get("/ip", (req, res) => res.json({ ip: req.ip }));
    const res = await request(app).get("/ip").expect(200);
    expect(res.body.ip).toBe("10.0.0.5");
  });
});
```

## Related

- No pre-existing entries in `docs/solutions/` directly cover this pattern.
- Reference implementation lives at `server/src/features/sessions/__tests__/routes.test.ts` lines 72–76 — canonical use of the fix.
- **Vulnerable test files** (review if they ever start mocking `req.ip`): all feature-module tests using the `(req as any).user = ...` pattern in an inline mock middleware. Currently only the sessions test mocks `req.ip`; other feature tests do not exercise it.
- **Recommended follow-up:** extract the proposed `mockAuthedRequest` helper, port the sessions test to use it, add the regression test.

## Encountered In

- **Session 63 Phase B (2026-04-13)** — implementing `POST /api/sessions/start | /heartbeat | /end` for user-engagement tracking. The parallel server agent wrote a supertest harness that mocked `req.ip` via direct assignment. All 10 initial tests failed with the getter TypeError. Orchestrator caught during integration, applied the `Object.defineProperty` fix, and all 16 tests passed on the next run. Total time lost: ~5 minutes.
