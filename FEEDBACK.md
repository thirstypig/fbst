# FBST Development Feedback Log

This file tracks session-over-session progress, pending work, and concerns. Review at the start of each session.

---

## Session 2026-03-04 (Session 6)

### Completed
- **P2 — Test Coverage** (125 new tests, 228 total):
  - **New middleware tests** (35 tests across 3 files):
    - `middleware/__tests__/validate.test.ts` — 7 tests (valid/invalid input, type errors, null body, multiple errors)
    - `middleware/__tests__/asyncHandler.test.ts` — 4 tests (success, rejection forwarding, sync error wrapping)
    - `middleware/__tests__/authExtended.test.ts` — 24 tests (attachUser: 5, requireLeagueRole: 5, requireCommissionerOrAdmin: 5, isTeamOwner: 4, requireTeamOwner: 5)
  - **Auth routes** — `features/auth/__tests__/routes.test.ts` — 8 tests (health check, /me session lookup, /me DB user, /me error, dev-login gating, dev-login admin lookup, dev-login credentials)
  - **Trades routes** — `features/trades/__tests__/routes.test.ts` — 13 tests (schema validation: 6, propose, list, accept, reject, process rejection, player trade processing, budget trade processing)
  - **Waivers routes** — `features/waivers/__tests__/routes.test.ts` — 12 tests (schema: 5, list: 2, submit, delete, process FAAB: highest bidder wins, budget insufficient, drop player processing)
  - **Auction routes** — `features/auction/__tests__/routes.test.ts` — 21 tests (calculateMaxBid: 6, state transitions: 3, bidding: 5, pause/resume: 2, finish DB: 2, reset: 2, refreshTeams: 1)
  - **Client StatsTables** — `features/standings/__tests__/StatsTables.test.tsx` — 22 tests (PeriodSummaryTable: 5, CategoryPeriodTable: 3, SeasonTable: 4, TeamSeasonSummaryTable: 3, HittersTable: 3, PitchersTable: 4)
  - **Client PlayerDetailModal** — `features/players/__tests__/PlayerDetailModal.test.tsx` — 14 tests (null/closed states, rendering, API fetch, loading, recent/career stats, overlay close, Escape key, profile tab, error state, pitcher badge)
- **Bugfix**: Fixed `validate.ts` — `result.error.errors` → `result.error.issues` (Zod v4 API change)

### Pending / Next Steps
- [ ] IDOR protection — league-scoped queries should filter by user's memberships
- [ ] Audit logging — log admin/commissioner actions to AuditLog table
- [ ] Trade accept/reject ownership check — currently any authed user can accept/reject
- [ ] Waiver delete ownership check — any authed user can cancel anyone's claim
- [ ] Extract `PlayerDetailModal` and `StatsTables` to shared components

### Concerns / Tech Debt
- **Trade accept/reject**: still no ownership check — any authenticated user can accept/reject any trade
- **Waiver DELETE**: no ownership check — any authed user can cancel anyone's claim
- **Auction routes**: no auth middleware at all — significant security gap
- **PlayerDetailModal tests**: React act() warnings from async state updates (non-blocking, cosmetic)

### Test Results
- Server: 11 files, 158 tests passing
- Client: 4 files, 70 tests passing
- Total: 228 tests, all green
- Zod bugfix: `validate.ts` now uses `.issues` (Zod v4 compatible)

---

## Session 2026-03-04 (Session 5)

### Completed
- **Phase 1 — Immediate Security Fixes**:
  - Added `requireAuth` to 15 unprotected write endpoints across 5 route files
  - Added `requireAdmin` to waivers `/process` and trades `/process`
  - Hard-gated `/auth/dev-login` behind `ENABLE_DEV_LOGIN=true` env var
  - Added 10s `AbortSignal.timeout` to MLB API fetch calls
  - Env var validation at startup — server exits if missing
  - Graceful shutdown (SIGTERM/SIGINT)
  - Sanitized global error handler — no internal details leaked
  - Removed unused deps: `csv-parser`, `papaparse`, `socket.io-client`
- **P0 — Security & Stability**:
  - **Rate limiting**: `express-rate-limit` — global 100 req/min, auth 10 req/min
  - **Ownership validation**: `requireTeamOwner` middleware — checks both legacy `ownerUserId` and `TeamOwnership` table. Applied to teams PATCH, waivers POST, transactions claim, trades propose
  - **Input validation**: `zod` schemas on all 5 write endpoints (roster add-player, waivers claim, trades propose, transactions claim, teams roster update). `validateBody` middleware factory.
- **P3 — Code Quality**:
  - **asyncHandler**: utility wrapping all async route handlers (roster, waivers, trades, transactions, teams, standings) — catches unhandled rejections
  - **Structured logging**: replaced 39 `console.error()` calls across 17 files with `logger.error()`. Only 5 remaining in seed/logger/startup (appropriate)
  - **Hardcoded season removed**: transactions routes now look up `league.season` dynamically
  - **Idempotency keys**: replaced `Date.now()` in transaction rowHash with `crypto.randomUUID()`
- **P1 — Resilience**:
  - **MLB API retry**: 3 retries with exponential backoff (1s, 2s, 4s) + circuit breaker (opens after 5 failures, resets after 60s)
  - **Transaction timeouts**: all 7 `prisma.$transaction()` calls now have `{ timeout: 30_000 }`
  - **Request ID tracking**: `x-request-id` middleware on all requests
  - **Health check expansion**: `/api/health` now checks both DB and Supabase connectivity
- **Documentation**:
  - Created `docs/SECURITY.md`, `docs/ROADMAP.md`
  - Updated `CLAUDE.md` with security conventions
  - New middleware files: `asyncHandler.ts`, `validate.ts`

### Pending / Next Steps
- [ ] IDOR protection — league-scoped queries should filter by user's memberships
- [ ] Audit logging — log admin/commissioner actions to AuditLog table
- [ ] Test coverage for new middleware (requireTeamOwner, validateBody, asyncHandler)
- [ ] Increase overall test coverage (currently 1.4%, 103 tests)

### Concerns / Tech Debt
- **Trade accept/reject**: currently only requires `requireAuth`, not ownership of the counterparty team. Would need to fetch the trade to determine recipient.
- **Roster routes use `teamCode` not `teamId`**: can't apply `requireTeamOwner` to legacy `RosterEntry` model — separate ownership pattern needed
- **IDOR risk**: league-scoped GET queries don't verify the user is a league member

### Test Results
- Server: 69 tests passing (4 files)
- Client: 34 tests passing (2 files)
- Total: 103 tests, all green
- TypeScript: 0 new errors (server has 10 pre-existing in test file)

---

## Session 2026-03-04 (Session 4)

### Completed
- **UI/UX Redesign** (PR #10, merged to main, 67 files changed):
  - Removed wave background image entirely (both light/dark mode)
  - Unified all table styling through `table.tsx` as single source of truth
  - Stripped inline style overrides from ThemedTh/ThemedTd across 22 table-using files
  - Converted raw `<table>/<th>/<td>` to ThemedTable in 6 files (Period, PlayerDetailModal, RosterManagementForm, ArchivePage, AuctionValues, PlayerExpandedRow)
  - Removed blue accent color from all table headers — consistent muted gray everywhere
  - Added `tabular-nums` to base TableCell component
  - Toned down typography: `font-bold` → `font-medium` on labels, `font-bold` → `font-semibold` on headings
  - Deleted 3 stale files (Layout.tsx, NavBar.tsx, ThemeContext.tsx)
  - Migrated all `--fbst-*` CSS vars to `--lg-*`, removed legacy shim block
  - Compacted sidebar nav, tuned liquid glass opacity/blur
  - Added Inter font import
  - Cleaned sci-fi/military naming across ~30 files
- **Feature Module Isolation Audit** — comprehensive audit of client + server
  - Found 9 undocumented client cross-feature imports, 1 undocumented server import
  - Updated CLAUDE.md with full cross-feature dependency map
  - All 15 modules properly structured with index.ts barrels

### Pending / Next Steps
- [ ] Visual QA: run dev server and inspect all pages in light/dark mode after design reset
- [ ] Consider extracting `PlayerDetailModal` and `StatsTables` to `src/components/` (used by 3+ features each)
- [ ] Consider extracting shared auction import logic from CommissionerService → auction dependency
- [ ] 46 unmatched archive players still need manual matching
- [ ] Feature-by-feature quality pass (types, error handling, validation, tests)

### Concerns / Tech Debt
- **`PlayerDetailModal`** used by 3 features (auction, teams, archive) — candidate for promotion to shared components
- **`StatsTables`** used by 3 features (standings, archive, periods) — candidate for promotion to shared components
- **CommissionerService → AuctionImportService** server dependency — tightest coupling; consider shared service extraction
- **14 stale worktrees** exist in `.claude/worktrees/` — should clean up
- **ThemeContext still imported** in `roster/RosterManagementForm.tsx` and `periods/Season.tsx` — verify it's actually needed after the `useTheme()` removal from Period.tsx

### Test Results
- Server: 4 files, 69 tests passing
- Client: 2 files, 34 tests passing
- Total: 103 tests, all green
- TypeScript: zero errors (client)

---

## Session 2026-03-03 (Session 3)

### Completed
- Fixed `ArchiveAdminPanel.tsx` auth: replaced 5x `localStorage.getItem('token')` with `supabase.auth.getSession()` helper
- Added MIME types to file input accept attribute for better browser compatibility
- Imported 2025 season from `Fantasy_Baseball_2025 - FINAL.xlsx` via terminal curl (UI was inaccessible)
  - 8 teams, 7 periods, 184 draft picks, 251 auto-matched players (46 unmatched)
- Ran MLB data sync: 1,110 player records updated with real stats
- Confirmed user `jimmychang316@gmail.com` is already admin + commissioner (leagues 1 & 2)
- Researched UI/UX best practices for dark/light mode, liquid glass, and sidebar spacing

### Pending / Next Steps — UI/UX Redesign
- [ ] **Compact sidebar nav** — current items are `10px font-black uppercase tracking-widest` with `10px 16px` padding. Change to `text-sm font-medium` (14px/500), normal case, `6px 10px` padding
- [ ] **Fix dark/light mode colors** — align with shadcn v4 OKLCH defaults or fix `--lg-*` token inconsistencies
- [ ] **Clean up legacy CSS vars** — audit & replace all `var(--fbst-*)` references with `var(--lg-*)` tokens
- [ ] **Delete stale files**: `components/ThemeContext.tsx`, `components/NavBar.tsx`, `components/Layout.tsx`
- [ ] **Liquid glass tuning** — light mode glass too opaque (0.65 → 0.15), dark mode blur too strong (40px sidebar → 16-20px)
- [ ] See detailed plan: `.claude/projects/.../memory/ui-redesign.md`

### Pending / Next Steps — Archive
- [ ] 46 unmatched players still need manual matching or improved auto-match logic
- [ ] Verify archive page period/season sections display correctly with populated stats

### Concerns / Tech Debt
- **Duplicate ThemeContext**: `contexts/ThemeContext.tsx` (active, key: `fbst-theme`) vs `components/ThemeContext.tsx` (stale, key: `theme`) — delete the stale one
- **ArchiveAdminPanel uses legacy `--fbst-*` vars** — needs migration to `--lg-*`
- **Orchestration tab invisible** — only shows for `isAdmin` users; no way to discover it exists if you're not admin

### Test Results
- Did not run tests this session (focused on data import + UI research)

---

## Session 2026-02-21 (Session 2)

### Completed
- Merged all 4 open PRs to main in order (#2 → #3 → #4 → #5)
  - PR #2: Feature module extraction (15 modules, 122 files) — already merged
  - PR #3: Fix 320 TypeScript strict mode errors — rebased, 1 conflict resolved
  - PR #4: Clean up stale Prisma duplicates, unused routes, backup files — rebased, 6 conflicts resolved
  - PR #5: Consolidate inline auth middleware — rebased, 5 conflicts resolved
- Set up Vitest infrastructure (PR #6, merged)
  - Server: `vitest.config.ts`, `vitest` + `@vitest/coverage-v8` deps, test scripts
  - Client: `vitest.config.ts` with jsdom + React Testing Library, test setup file
  - Root `npm run test` / `test:server` / `test:client` scripts
- Wrote 103 tests across 6 test files:
  - `server/src/lib/__tests__/utils.test.ts` (28 tests)
  - `server/src/features/standings/__tests__/standingsService.test.ts` (21 tests)
  - `server/src/features/standings/__tests__/standings.integration.test.ts` (7 tests)
  - `server/src/middleware/__tests__/auth.test.ts` (13 tests)
  - `client/src/api/__tests__/base.test.ts` (17 tests)
  - `client/src/lib/__tests__/baseballUtils.test.ts` (17 tests)

### Pending / Next Steps
- [ ] Feature-by-feature quality pass (types, error handling, validation, tests, API shapes)
  - Start with: standings, trades, auth
  - Then: leagues, teams, players, roster, auction
  - Then: keeper-prep, commissioner, admin, archive, periods, waivers, transactions
- [ ] UI/Design system module (theme tokens, shared patterns, component audit)
- [ ] New feature work (auction improvements, standings visualizations, etc.)

### Concerns / Tech Debt
- **`parseIntParam` edge case**: Returns 0 for null/undefined/empty string due to `Number("") === 0`. May want to treat these as null for stricter validation.
- **Cross-feature imports**: leagues→keeper-prep, leagues→commissioner, admin→commissioner, commissioner→roster. Monitor for circular dependency risk.
- **No MSW setup**: Client API tests could benefit from Mock Service Worker for more realistic HTTP mocking.
- **Supabase debug logging**: Client `base.test.ts` outputs Supabase init debug info — consider suppressing in test environment.
- **Multiple worktrees**: 11 worktrees exist, most on stale commit `29af429`. Consider cleaning up unused worktrees.

### Test Results
- Server: 4 files, 69 tests passing
- Client: 2 files, 34 tests passing
- Total: 103 tests, all green

---

## Session 2026-02-21 (Session 1)

### Completed
- Extracted 15 feature modules from layer-based architecture (both server and client)
- Fixed inconsistent Prisma imports in 5 route files (roster, rosterImport, trades, waivers, rules)
- Standardized all router exports to named exports
- Updated all import paths across 77 files
- Updated CLAUDE.md with full feature module documentation
- Created FEEDBACK.md for session continuity
- Created PR #2 (merged)

### Test Results
- Server TypeScript: 319 pre-existing errors (0 from refactoring)
- Client TypeScript: 0 errors
- Client Vite build: Passes
