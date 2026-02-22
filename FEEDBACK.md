# FBST Development Feedback Log

This file tracks session-over-session progress, pending work, and concerns. Review at the start of each session.

---

## Session 2026-02-21

### Completed
- Extracted 15 feature modules from layer-based architecture (both server and client)
- Fixed inconsistent Prisma imports in 5 route files (roster, rosterImport, trades, waivers, rules)
- Standardized all router exports to named exports
- Updated all import paths across 77 files
- Updated CLAUDE.md with full feature module documentation
- Created FEEDBACK.md for session continuity

### Pending / Next Steps
- [ ] Set up Vitest for server (`server/vitest.config.ts`, add `vitest` dependency)
- [ ] Set up Vitest for client (`client/vitest.config.ts`, add `vitest` + `@testing-library/react` dependencies)
- [ ] Add `npm run test`, `npm run test:server`, `npm run test:client` scripts to package.json files
- [ ] Write first unit tests for a simple feature module (e.g., `standings` or `periods`)
- [ ] Write first integration test (e.g., trade execution affecting roster)
- [ ] Resolve 319 pre-existing server TypeScript errors (mostly TS7006 implicit any, TS7016 missing type declarations)
- [ ] Install missing `@types/express`, `@types/multer`, `@types/cookie-parser` for server
- [ ] Clean up stale files: `server/src/routes/auctionValues.ts`, `server/src/routes/archive.ts.backup`, `client/src/pages/ArchivePage.tsx.bak`
- [ ] Remove empty `server/src/routes/` directory (only `public.ts` and stale files remain)
- [ ] Consider moving `server/src/routes/public.ts` into a `public` feature or keeping as shared

### Concerns / Tech Debt
- **319 pre-existing TS errors** — mostly implicit `any` and missing type declarations. Should be fixed incrementally.
- **No test suite** — testing infrastructure needs to be set up before adding more features
- **Cross-feature imports** — leagues imports from keeper-prep and commissioner services. Monitor for circular dependency risk.
- **Inline auth middleware** — Several route files define their own auth checks instead of using shared middleware from `middleware/auth.ts`. Consider standardizing.
- **`server/src/prisma.ts`** and **`server/src/lib/prisma.ts`** still exist alongside the canonical `server/src/db/prisma.ts` — should be removed to avoid confusion
- **`auctionValues.ts`** route file in `routes/` is not mounted in `index.ts` — appears unused, verify and remove

### Test Results
- Server TypeScript: 319 pre-existing errors (0 from refactoring)
- Client TypeScript: 0 errors
- Client Vite build: Passes
- Test suite: Not yet set up
