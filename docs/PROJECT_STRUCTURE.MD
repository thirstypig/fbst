# FBST Project Structure & Dev Conventions

Last updated: 2026-01-03

Repository root: `/Users/jameschang/Documents/Projects/fbst`

---

## 1) High-level layout

- `client/`
  - Canonical React/Vite front-end app
  - Source code in `client/src`
- `server/`
  - Canonical Express + TypeScript API server
  - Runs with `npm start` inside `server` (uses `tsx` to run `src/index.ts`)
  - One-off scripts live in `server/src/scripts`
- `prisma/`
  - Prisma schema + migrations
- `docs/`
  - Documentation

External sibling folder (not inside this repo):

- `../fbst-stats-worker/`
  - Python scripts that produce CSV/JSON inputs for FBST
  - Example outputs: `ogba_transactions_2025.json`, `ogba_auction_values_2025.csv`

Legacy / archived items:

- `_old_root_src/`
- `_old_root_*`
- `client/_old_client_legacy/`

Do not edit legacy folders.

---

## 2) How to run full stack (local)

From repo root:

```bash
# Terminal 1 – API
npm run server

# Terminal 2 – client
npm run dev
Open:

Client: http://localhost:5173

API: http://localhost:4000/api/health

3) Prisma conventions
Run Prisma from repo root:

bash
Copy code
npx prisma format
npx prisma migrate dev --name <migration_name>
npx prisma generate
If P1000 occurs, fix DATABASE_URL credentials first.

4) Transactions workflow
Parse OnRoto HTML in ../fbst-stats-worker

Import JSON into DB using:

server/src/scripts/import_onroto_transactions.ts

markdown
Copy code
