# FBST Security & Quality Roadmap

Long-term hardening tasks, organized by priority. Canonical tracker is now `TODO.md` — this file is kept for historical reference.

## P0 — Security & Stability (Sessions 5-8) ✅ COMPLETE

- [x] **Rate limiting** — `express-rate-limit`, global (100 req/min) and auth (10 req/min) *(Session 5)*
- [x] **Ownership validation** — `requireTeamOwner` middleware on teams, waivers, trades, transactions *(Session 5)*
- [x] **IDOR protection** — teams scoped to user's leagues, transactions require leagueId + membership *(Session 8)*
- [x] **Audit logging** — `writeAuditLog` utility, fire-and-forget to AuditLog table *(Session 7)*
- [x] **Input validation** — `zod` schemas on all POST/PATCH write endpoints with `validateBody` middleware *(Session 5)*
- [x] **`001` Remove hardcoded DB credentials** *(Session 8)*
- [x] **`002` Archive + roster import auth** *(Session 8)*
- [x] **`003` Auction ownership checks** *(Session 8)*
- [x] **`004` Roster ownership checks** *(Session 8)*
- [x] **`010` Waivers info disclosure** *(Session 8)*

## P1 — Resilience (Sessions 5-8) ✅ COMPLETE

- [x] **MLB API retry with backoff** — 3 retries, exponential backoff, circuit breaker *(Session 5)*
- [x] **Transaction timeouts** — `timeout: 30_000` on all `prisma.$transaction()` calls *(Session 5)*
- [x] **Idempotency keys** — `crypto.randomUUID()` *(Session 5)*
- [x] **Request ID tracking** — `x-request-id` middleware *(Session 5)*
- [x] **Health check expansion** — DB + Supabase *(Session 5)*

## P2 — Test Coverage & Code Quality (Sessions 6-24) ✅ COMPLETE

- [x] **Auth routes** — 8 tests *(Session 6)*
- [x] **Auction workflow** — 21 tests *(Session 6)*
- [x] **Trades** — 13 tests *(Session 6)*
- [x] **Waivers** — 12 tests *(Session 6)*
- [x] **Client component tests** — 22 StatsTables + 14 PlayerDetailModal *(Session 6)*
- [x] **New middleware tests** — 35 tests *(Session 6)*
- [x] **Integration tests** — auction-roster (9), auction-simulation (29), trade-roster (10), waiver-roster (11), transaction-claims (25) *(Sessions 19-24)*
- [x] **`005` Type standings service** *(Session 9)*
- [x] **`006` Cache standings computation** *(Session 9)*
- [x] **`007` Complete auth migration** *(Session 9)*
- [x] **`008` Fix test files testing copied logic** *(Session 9)*
- [x] **`009` Document cross-feature deps** *(Session 9)*

## P3 — Code Quality & Cleanup (Sessions 5-10) ✅ COMPLETE

- [x] **Async route wrapper** — `asyncHandler()` applied to all handlers *(Session 5)*
- [x] **Structured logging migration** — 39 `console.error()` → `logger.error()` *(Session 5)*
- [x] **Remove hardcoded season** — transactions routes use `league.season` lookup *(Session 5)*
- [x] **`011` AppShell cleanup** *(Session 10)*
- [x] **`012` RulesEditor simplification** *(Session 10)*
- [x] **`013` Commissioner design tokens** *(Session 10)*
- [x] **`014` Move parseIntParam** *(Session 10)*

## P4 — Dependency Hygiene (Sessions 28) ✅ COMPLETE

- [x] **Lazy-load heavy modules** — `xlsx` (2.3MB) and `@google/generative-ai` (1.2MB) via dynamic `import()` *(Session 28)*
- [x] **Prisma singleton enforcement** — 8 scripts converted to import from `db/prisma.ts` *(Session 28)*
- [x] **npm audit** — `.github/workflows/ci.yml` blocks on critical vulnerabilities *(Session 28)*
- [x] **Shared component extraction** — `PlayerDetailModal` and `StatsTables` moved to `client/src/components/shared/` *(Session 28)*
