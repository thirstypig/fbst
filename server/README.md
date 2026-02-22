# FBST Server

Express + TypeScript + Prisma API server for FBST, organized by domain feature modules.

## Architecture

```
server/src/
├── features/              # Domain feature modules
│   ├── auth/              #   Auth routes (/api/auth/*)
│   ├── leagues/           #   League + rules routes
│   ├── teams/             #   Team routes + teamService
│   ├── players/           #   Player routes + dataService
│   ├── roster/            #   Roster + import routes
│   ├── standings/         #   Standings routes + standingsService
│   ├── trades/            #   Trade routes (/api/trades/*)
│   ├── waivers/           #   Waiver routes (/api/waivers/*)
│   ├── transactions/      #   Transaction routes
│   ├── auction/           #   Auction routes + auctionImport
│   ├── keeper-prep/       #   Keeper prep routes + keeperPrepService
│   ├── commissioner/      #   Commissioner routes + CommissionerService
│   ├── admin/             #   Admin routes
│   ├── archive/           #   Archive routes + 3 archive services
│   └── periods/           #   Period routes
├── middleware/            # Shared auth middleware
├── lib/                   # Shared infra (supabase, prisma, logger, mlbApi, utils)
├── db/                    # Prisma singleton
├── routes/                # Shared routes (public.ts)
└── types/                 # Server-side types
```

### Feature Module Structure
```
features/<name>/
├── routes.ts              # Express router (named export)
├── services/              # Business logic (if needed)
│   └── <name>Service.ts
├── __tests__/             # Unit tests
│   ├── routes.test.ts
│   └── <name>Service.test.ts
├── types.ts               # Feature-specific types (if needed)
└── index.ts               # Re-exports router
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
```

3. Set up the database:
```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Start the development server:
```bash
npm run dev
```

## Scripts

- `npm run dev` — Start development server with hot reload (tsx --watch)
- `npm start` — Start production server
- `npm run test` — Run all tests
- `npm run db:push` — Push schema changes (dev only)

## Conventions

- All imports use `.js` extensions (ESM compatibility)
- Prisma singleton from `db/prisma.ts` — never instantiate `new PrismaClient()` inline
- All routers use named exports: `export const fooRouter = router;`
- Feature routers mounted in `src/index.ts`
- Auth middleware applied globally via `app.use(attachUser)`
- Protected routes add `requireAuth`, `requireAdmin`, or `requireLeagueRole`

## Testing

```bash
# All server tests
npm run test

# Single feature
npx vitest run src/features/standings/__tests__/

# Watch mode
npx vitest --watch
```
