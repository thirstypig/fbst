# FBST Security & Quality Roadmap

Long-term hardening tasks, organized by priority. See `todos/` for detailed finding files.

## P0 — Security & Stability (Sessions 6-7)

- [x] **Rate limiting** — `express-rate-limit`, global (100 req/min) and auth (10 req/min) *(Session 5)*
- [x] **Ownership validation** — `requireTeamOwner` middleware on teams, waivers, trades, transactions *(Session 5)*
- [x] **IDOR protection** — teams scoped to user's leagues, transactions require leagueId + membership *(Session 8)*
- [x] **Audit logging** — `writeAuditLog` utility, fire-and-forget to AuditLog table *(Session 7)*
- [x] **Input validation** — `zod` schemas on all POST/PATCH write endpoints with `validateBody` middleware *(Session 5)*

### NEW — From Code Review (Session 7)

- [x] **`001` Remove hardcoded DB credentials** — deleted `.js` scripts with Neon password. **Rotate DB password manually.** *(Session 8)*
- [x] **`002` Archive + roster import auth** — `requireAuth` on all GETs, `requireAuth + requireAdmin` on all writes *(Session 8)*
- [x] **`003` Auction ownership checks** — `requireTeamOwner` on `/nominate` and `/bid` *(Session 8)*
- [x] **`004` Roster ownership checks** — inline `isTeamOwner()` on add-player and delete *(Session 8)*
- [x] **`010` Waivers info disclosure** — scoped to user's teams, ownership verified *(Session 8)*

## P1 — Resilience (Sessions 7-8)

- [x] **MLB API retry with backoff** — 3 retries, exponential backoff (1s, 2s, 4s), circuit breaker after 5 failures *(Session 5)*
- [x] **Transaction timeouts** — `timeout: 30_000` on all 7 `prisma.$transaction()` calls *(Session 5)*
- [x] **Idempotency keys** — replaced `Date.now()` in transaction `rowHash` with `crypto.randomUUID()` *(Session 5)*
- [x] **Request ID tracking** — `x-request-id` middleware on all requests *(Session 5)*
- [x] **Health check expansion** — `/api/health` checks DB + Supabase connectivity *(Session 5)*

## P2 — Test Coverage & Code Quality (Sessions 8-10)

- [x] **Auth routes** — 8 tests *(Session 6)*
- [x] **Auction workflow** — 21 tests *(Session 6)*
- [x] **Trades** — 13 tests *(Session 6)*
- [x] **Waivers** — 12 tests *(Session 6)*
- [x] **Client component tests** — 22 StatsTables + 14 PlayerDetailModal *(Session 6)*
- [x] **New middleware tests** — 35 tests *(Session 6)*
- [ ] **Integration tests** — auction->roster, trade->roster, waiver->roster, keeper->league (requires test DB setup)

### NEW — From Code Review (Session 7)

- [ ] **`005` Type standings service** — Replace `any[]` with proper interfaces (`CsvStatRow`, `TeamStatRow`, `StandingsResult`)
- [ ] **`006` Cache standings computation** — Results are static between restarts; cache in DataService singleton
- [ ] **`007` Complete auth migration** — ~6 client files still use raw `fetch()` (AIInsightsModal, Standings, ArchiveAdminPanel). Create `fetchWithAuth()` for multipart uploads.
- [ ] **`008` Fix test files testing copied logic** — auction/auth/trades/waivers tests re-implement source logic inline instead of importing real code (~550 LOC of false-confidence tests)
- [ ] **`009` Document cross-feature deps** — 3 new imports undocumented in CLAUDE.md (standings→players/DataService, transactions→players/DataService, commissioner→leagues/RulesEditor)

## P3 — Code Quality & Cleanup (Sessions 10-12)

- [x] **Async route wrapper** — `asyncHandler()` applied to all route handlers *(Session 5)*
- [x] **Structured logging migration** — replaced 39 `console.error()` with `logger.error()` *(Session 5)*
- [ ] **Shared component extraction** — move `PlayerDetailModal` and `StatsTables` to `client/src/components/shared/`
- [x] **Remove hardcoded season** — transactions routes use `league.season` lookup *(Session 5)*
- [ ] **Fix remaining TODOs** — auction draft ordering, standings tie handling, rules page commissioner check

### NEW — From Code Review (Session 7)

- [ ] **`011` AppShell cleanup** — Duplicates auth state from AuthProvider; has YAGNI sidebar resize (~60 LOC removable)
- [ ] **`012` RulesEditor simplification** — Derive `grouped` state with `useMemo`, fix `pendingChanges` key type, rename `RenderInput`
- [ ] **`013` Commissioner design tokens** — Replace hardcoded `text-white`, `bg-slate-950/60`, `font-bold` with `--lg-*` tokens
- [ ] **`014` Move parseIntParam** — From `auth.ts` to `utils.ts`, change `any` → `unknown`, add integer check

## P4 — Dependency Hygiene (Ongoing)

- [ ] **Lazy-load heavy modules** — `xlsx` (2.3MB) and `@google/generative-ai` (1.2MB) loaded only when needed
- [ ] **Prisma singleton enforcement** — fix 5 scripts that create `new PrismaClient()` directly
- [ ] **Version pinning** — switch critical deps to exact versions in CI
- [ ] **npm audit** — add to CI pipeline, block on critical vulnerabilities
