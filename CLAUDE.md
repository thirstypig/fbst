# FBST - Fantasy Baseball Stat Tracker

## Project Overview
Fantasy baseball league management tool. Client/server monorepo organized by **feature modules**.

## Tech Stack
- **Client**: React 18 + Vite + TypeScript + Tailwind + React Router v6
- **Server**: Node.js + Express + TypeScript + Prisma ORM
- **Auth**: Supabase (Google/Yahoo OAuth, JWT)
- **Database**: PostgreSQL via Prisma
- **Testing**: Vitest (unit + integration)
- **Deployment**: Render (HTTP, SSL termination at proxy)

## Project Structure
```
fbst/
├── client/
│   └── src/
│       ├── features/        # Domain feature modules (see below)
│       ├── pages/           # App-level pages (Home, Guide)
│       ├── components/      # Shared components (AppShell, NavBar, ui/)
│       │   └── ui/          # shadcn-style primitives
│       ├── api/             # Shared API infra (base.ts, types.ts, index.ts barrel)
│       ├── auth/            # AuthProvider (Supabase context)
│       ├── hooks/           # Shared hooks (useAuth)
│       ├── lib/             # Utilities (baseballUtils, supabase client)
│       └── types.ts         # Global client types
├── server/
│   └── src/
│       ├── features/        # Domain feature modules (see below)
│       ├── routes/          # Shared routes (public.ts)
│       ├── middleware/      # Auth middleware (attachUser, requireAuth, requireLeagueRole)
│       ├── lib/             # Infra (prisma, supabase, logger, mlbApi, utils)
│       ├── db/              # Prisma singleton
│       ├── services/        # Shared services (aiAnalysisService)
│       └── types/           # Server-side types
├── prisma/                  # Schema + migrations
├── scripts/                 # One-off data processing scripts
└── docs/                    # Documentation
```

## Feature Modules

The codebase is organized by **domain feature modules**. Each feature encapsulates its own routes, services, pages, components, and API client in a self-contained directory.

### Current Feature Modules (15)

| Module | Server | Client | Description |
|--------|--------|--------|-------------|
| `auth` | routes | 5 pages, api | Login, signup, password reset, landing |
| `leagues` | routes, rules-routes | 2 pages, api | League CRUD, rules management |
| `teams` | routes, teamService | 2 pages, 4 components, api | Team management, roster views |
| `players` | routes, dataService | 1 page, 2 components, api | Player search, stats, detail modals |
| `roster` | routes, rosterImport-routes | 5 components | Roster grid, controls, import |
| `standings` | routes, standingsService | 3 pages, 1 component, api | Standings, categories, season |
| `trades` | routes | 1 page, 1 component, api | Trade proposals, voting |
| `waivers` | routes | (minimal) | Waiver claims workflow |
| `transactions` | routes | 1 page, api | Transaction history |
| `auction` | routes, auctionImport | 2 pages, 10 components, 2 hooks | Live auction draft |
| `keeper-prep` | routes, keeperPrepService | 1 page, 1 component, api | Keeper selection workflows |
| `commissioner` | routes, CommissionerService | 1 page, 3 components | Commissioner admin tools |
| `admin` | routes | 1 page, 1 component | System admin panel |
| `archive` | routes, 3 archive services | 1 page, api | Historical data import/export |
| `periods` | routes | 3 pages | Stat periods, season views |

### Feature Module Pattern
```
server/src/features/<feature>/
├── routes.ts          # Express router (named export: <feature>Router)
├── services/          # Business logic (if needed)
│   └── <name>Service.ts
├── types.ts           # Feature-specific types (if needed)
└── index.ts           # Re-exports router

client/src/features/<feature>/
├── pages/             # Page components for this feature
├── components/        # Feature-specific components
├── api.ts             # API client functions
├── hooks/             # Feature-specific hooks (if needed)
└── index.ts           # Re-exports pages for routing
```

### Adding a New Feature Module
1. Create `server/src/features/<name>/` with `routes.ts` and `index.ts`
2. Create `client/src/features/<name>/` with pages, components, api as needed
3. Mount router in `server/src/index.ts`: `app.use("/api/<prefix>", <name>Router)`
4. Import pages in `client/src/App.tsx` from `./features/<name>/pages/<Page>`
5. Add API re-exports to `client/src/api/index.ts` if needed
6. Write unit tests in `__tests__/` directories within the feature
7. Add integration tests if the feature interacts with other modules

### Cross-Feature Dependencies
Some features import from other features' services:
- `leagues/routes.ts` imports `keeper-prep/services/keeperPrepService`
- `leagues/rules-routes.ts` imports `commissioner/services/CommissionerService`
- `admin/routes.ts` imports `commissioner/services/CommissionerService`
- `commissioner/components/CommissionerRosterTool` imports `roster/components/`

When adding cross-feature imports, document them here to maintain visibility.

## Shared Infrastructure (do NOT move into features)
- `server/src/middleware/auth.ts` — global auth (attachUser, requireAuth, requireAdmin, requireLeagueRole)
- `server/src/lib/` — supabase.ts, prisma.ts, logger.ts, mlbApi.ts, utils.ts
- `server/src/db/prisma.ts` — Prisma singleton
- `client/src/auth/AuthProvider.tsx` — global React auth context
- `client/src/api/base.ts` — fetchJsonApi, API_BASE config
- `client/src/api/types.ts` — shared API response/request types
- `client/src/components/ui/` — shadcn-style UI primitives
- `client/src/components/AppShell.tsx`, `NavBar.tsx`, `Layout.tsx` — app shell

## Conventions
- TypeScript strict mode in both client and server
- Server files use `.js` extensions in imports (ESM compat): `from "../db/prisma.js"`
- Client files use no extensions in imports: `from "../api/base"`
- Prisma singleton imported from `server/src/db/prisma.ts` — NEVER create `new PrismaClient()` inline
- All routers use named exports: `export const fooRouter = router;`
- API client functions use `fetchJsonApi()` from `client/src/api/base.ts`
- Auth token passed via `Authorization: Bearer <token>` header
- Tailwind for all styling; shadcn-pattern components in `components/ui/`
- Named exports preferred; default exports only for page components

## Database
- Schema at `prisma/schema.prisma`
- Never run migrations without explicit confirmation
- Key models: User, League, LeagueMembership, Team, Player, Roster, Period, TeamStatsPeriod, TeamStatsSeason, Trade, WaiverClaim, AuctionLot, AuctionBid, TransactionEvent, HistoricalSeason, HistoricalStanding, HistoricalPlayerStat

## Development
- `npm run dev` (from root) — starts Vite dev server on :5173
- `npm run server` (from root) — starts Express on :4001
- Vite proxies `/api` to Express in dev
- `npm run test` (from root) — runs all tests
- `npm run test:server` — server unit + integration tests
- `npm run test:client` — client unit tests

## Testing Strategy

### Unit Tests (per feature module)
Each feature module should have tests co-located with the code:
```
server/src/features/<feature>/
├── __tests__/
│   ├── routes.test.ts         # Route handler tests (mock Prisma, test HTTP)
│   └── <name>Service.test.ts  # Service logic tests (mock DB)

client/src/features/<feature>/
├── __tests__/
│   ├── api.test.ts            # API client tests (mock fetch)
│   └── <Page>.test.tsx        # Component render tests
```

**What to test per module:**
- **Routes**: HTTP method, status codes, request validation, error responses
- **Services**: Business logic, edge cases, error handling
- **API clients**: Request construction, response parsing, error handling
- **Pages/Components**: Rendering, user interactions, loading/error states

### Integration Tests
Cross-feature interactions should be tested in a shared integration test directory:
```
server/src/__tests__/integration/
├── auction-roster.test.ts     # Auction draft populates roster
├── trade-roster.test.ts       # Trade execution moves players between rosters
├── waiver-roster.test.ts      # Waiver claims modify rosters and budgets
├── keeper-league.test.ts      # Keeper prep interacts with league settings
└── commissioner-league.test.ts # Commissioner actions affect league state
```

**Key integration scenarios:**
- Auction draft completion should create roster entries and update team budgets
- Trade processing should move players between rosters and adjust budgets
- Waiver claim processing should enforce budget limits and roster rules
- Commissioner roster lock should prevent trades/waivers for locked teams
- Keeper selection should respect league rules and roster constraints

### Test Configuration
- **Framework**: Vitest (fast, native TypeScript, Vite-compatible)
- **Server mocking**: Use Prisma mock client (`vitest-mock-extended`) for unit tests
- **Client mocking**: Use MSW (Mock Service Worker) for API mocking, React Testing Library for components
- **DB tests**: Use a test database with Prisma migrations for integration tests
- **CI**: Run `npm run test` in CI pipeline before deploy

### Running Tests
```bash
# All tests
npm run test

# Server tests only
npm run test:server

# Client tests only
npm run test:client

# Single feature (from server/ or client/)
npx vitest run src/features/auction/__tests__/

# Watch mode
npx vitest --watch
```

## Feedback Loop

### Purpose
Maintain a structured feedback loop between development sessions to ensure continuity, catch regressions, and improve code quality over time.

### Session Start Checklist
When starting a new session, review these items:
1. **Read `CLAUDE.md`** — confirms current architecture and conventions
2. **Check `FEEDBACK.md`** — review any open items from previous sessions
3. **Run `npm run test`** — verify all tests pass before making changes
4. **Run `git log --oneline -10`** — understand recent changes
5. **Check for open TODOs** — `grep -r "TODO\|FIXME\|HACK" server/src/ client/src/ --include="*.ts" --include="*.tsx" | head -20`

### Session End Checklist
Before ending a session:
1. **Run tests** — `npm run test` must pass
2. **Run builds** — `cd client && npx tsc --noEmit` and `cd server && npx tsc --noEmit`
3. **Update `FEEDBACK.md`** — log what was done, what's pending, any concerns
4. **Update `CLAUDE.md`** — if architecture or conventions changed
5. **Commit with descriptive message** — include scope of changes

### FEEDBACK.md Format
```markdown
## Session [DATE]

### Completed
- [ item ]

### Pending / Next Steps
- [ item ]

### Concerns / Tech Debt
- [ item ]

### Test Results
- Server: X passing, Y failing
- Client: X passing, Y failing
```

### Continuous Improvement Signals
Track these metrics across sessions:
- **Test coverage trend** — are new features being tested?
- **Build errors** — are pre-existing TypeScript errors being resolved?
- **Cross-feature dependencies** — are they growing? Should modules be refactored?
- **Import path consistency** — all Prisma imports from `db/prisma.ts`, all routers named exports
- **Feature module completeness** — does each module have tests, proper index.ts, types?

## Coding Guidelines
- **SOLID Principles**: Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **DRY**: Extract common logic into reusable functions/modules
- **KISS**: Strive for simplicity — avoid over-engineering
- **Clean Code**: Readable, self-documenting code with meaningful names
- **Error Handling**: Robust error handling with structured logging via `logger`
- **Performance**: Optimize where necessary, prioritize readability
