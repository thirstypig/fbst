# FBST Development Feedback Log

This file tracks session-over-session progress, pending work, and concerns. Review at the start of each session.

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
