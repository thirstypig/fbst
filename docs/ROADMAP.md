# FBST Security & Quality Roadmap

Long-term hardening tasks, organized by priority.

## P0 — Security & Stability (Sessions 6-7)

- [x] **Rate limiting** — `express-rate-limit`, global (100 req/min) and auth (10 req/min) *(Session 5)*
- [x] **Ownership validation** — `requireTeamOwner` middleware on teams, waivers, trades, transactions *(Session 5)*
- [ ] **IDOR protection** — league-scoped queries must filter by user's league memberships
- [ ] **Audit logging** — log admin/commissioner actions to `AuditLog` table
- [x] **Input validation** — `zod` schemas on all POST/PATCH write endpoints with `validateBody` middleware *(Session 5)*

## P1 — Resilience (Sessions 7-8)

- [x] **MLB API retry with backoff** — 3 retries, exponential backoff (1s, 2s, 4s), circuit breaker after 5 failures *(Session 5)*
- [x] **Transaction timeouts** — `timeout: 30_000` on all 7 `prisma.$transaction()` calls *(Session 5)*
- [x] **Idempotency keys** — replaced `Date.now()` in transaction `rowHash` with `crypto.randomUUID()` *(Session 5)*
- [x] **Request ID tracking** — `x-request-id` middleware on all requests *(Session 5)*
- [x] **Health check expansion** — `/api/health` checks DB + Supabase connectivity *(Session 5)*

## P2 — Test Coverage (Sessions 8-10)

- [ ] **Auth routes** — 15 tests (login flow, token validation, dev-login gating, /me endpoint)
- [ ] **Auction workflow** — 20 tests (init, nominate, bid, budget enforcement, draft completion -> roster)
- [ ] **Trades** — 15 tests (propose, accept, reject, process with roster transfer, budget adjustment)
- [ ] **Waivers** — 10 tests (submit claim, process FAAB, priority ordering, budget limit enforcement)
- [ ] **Integration tests** — auction->roster, trade->roster, waiver->roster, keeper->league
- [ ] **Client component tests** — PlayerDetailModal, StatsTables, auction components
- [ ] **New middleware tests** — requireTeamOwner, validateBody, asyncHandler, rate limiting

## P3 — Code Quality (Sessions 10-12)

- [x] **Async route wrapper** — `asyncHandler()` utility applied to all route handlers in roster, waivers, trades, transactions, teams, standings *(Session 5)*
- [x] **Structured logging migration** — replaced 39 `console.error()` calls with `logger.error()` across 17 files *(Session 5)*
- [ ] **Shared component extraction** — move `PlayerDetailModal` and `StatsTables` to `client/src/components/shared/`
- [x] **Remove hardcoded season** — replaced `season: 2025` in transactions routes with `league.season` lookup *(Session 5)*
- [ ] **Fix remaining TODOs** — auction draft ordering, standings tie handling, rules page commissioner check

## P4 — Dependency Hygiene (Ongoing)

- [ ] **Lazy-load heavy modules** — `xlsx` (2.3MB) and `@google/generative-ai` (1.2MB) loaded only when needed
- [ ] **Prisma singleton enforcement** — fix 5 scripts that create `new PrismaClient()` directly
- [ ] **Version pinning** — switch critical deps to exact versions in CI
- [ ] **npm audit** — add to CI pipeline, block on critical vulnerabilities
