# FBST · OGBA Fantasy Baseball Stat Tool

Simple league tool for OGBA: teams, standings, players (2025 stats), and auction values.

This repo is split into:

- `server/` – Node/Express + Prisma + PostgreSQL  
- `client/` – React + Vite front-end

---

## 1. URLs and `/api` Convention (IMPORTANT)

We **always** put the API behind `/api` on the server and **always** point the client to that.

Server routes look like:

- `GET /api/health`
- `GET /api/teams`
- `GET /api/teams/:id/summary`
- `GET /api/players`
- `GET /api/auction-values`
- `GET /api/standings/...` (period + season)

Client config:

```ts
// client/src/lib/api.ts
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";
Local dev default: API_BASE = http://localhost:4000/api

Production (Render): set this env var on the client:

env
Copy code
VITE_API_BASE_URL=https://fbst-api.onrender.com/api
Every fetch in the client should look like:

ts
Copy code
fetch(`${API_BASE}/teams`);
fetch(`${API_BASE}/standings/period/current`);
fetch(`${API_BASE}/players`);
Never hard-code /api again in the path. If we ever want to change the prefix, we only touch API_BASE.

When adding new endpoints or client code, check this section first so we don’t reintroduce /api/api/... bugs.

2. Local Development
Server
Prereqs:

Node 22.x

A local Postgres instance (or use the same DB as Render, but local is safer)

Steps:

bash
Copy code
# from repo root
cp .env.example .env  # if present, or create .env
.env should include at least:

env
Copy code
DATABASE_URL=postgresql://user:pass@localhost:5432/fbst_db
PORT=4000
Then:

bash
Copy code
cd server

# Install dependencies
npm install

# Apply schema to DB
npx prisma db push --schema ../prisma/schema.prisma --accept-data-loss

# Seed OGBA 2025 league data
npx tsx src/seed.ts

# Start API (runs: npx tsx src/index.ts)
npm start
You should see:

🔥 FBST server listening on http://localhost:4000

GET /api/health logged as you hit it

Quick sanity checks:

bash
Copy code
curl http://localhost:4000/api/health
# {"ok":true}

curl http://localhost:4000/api/teams

curl http://localhost:4000/api/players | head
Client
bash
Copy code
cd client
npm install

# Optional: configure local override
echo "VITE_API_BASE_URL=http://localhost:4000/api" > .env.local

npm run dev
# open http://localhost:5173/
Nav links:

/standings – current period standings

/season – season totals (also responds to /standings/season via redirect)

/teams – team list

/teams/:teamId – single team view, including 2025 roster from stats

/players – all players from 2025 stats CSV

/auction – auction values (filtered / sortable table)

3. Render Deployment
Server (API)
Service name: fbst-api

Build command (root = server/):

bash
Copy code
npm install
Start command:

bash
Copy code
npx prisma db push --schema ../prisma/schema.prisma --accept-data-loss && npx tsx src/seed.ts && npx tsx src/index.ts
Environment variables on Render:

env
Copy code
DATABASE_URL=postgresql://...  # from Render Postgres
PORT=10000                     # or use Render's defaults
Routes on Render:

https://fbst-api.onrender.com/api/health

https://fbst-api.onrender.com/api/teams

https://fbst-api.onrender.com/api/players

https://fbst-api.onrender.com/api/auction-values

etc.

Client (if deployed)
Build command:

bash
Copy code
cd client
npm install
npm run build
Static build output: client/dist

Environment variable:

env
Copy code
VITE_API_BASE_URL=https://fbst-api.onrender.com/api
4. Data Sources
2025 Player Season Stats
File: server/src/data/ogba_player_season_totals_2025.csv

Exposed via API: GET /api/players

Client types: PlayerSeasonRow in client/src/lib/api.ts

Example:

ts
Copy code
export interface PlayerSeasonRow {
  mlb_id: string;
  name: string;
  team: string;  // OGBA code: LDY, DMK, etc.
  pos: string;   // 1B, 2B, SS, OF, P, etc.
  R: number;
  HR: number;
  RBI: number;
  SB: number;
  AVG: number;
  W: number;
  S: number;
  ERA: number;
  WHIP: number;
  K: number;
}
Auction Values
File: server/data/ogba_auction_values_2025.csv

Exposed via API: GET /api/auction-values

Client page: client/src/pages/AuctionValues.tsx

5. Adding / Changing Endpoints
When adding a new API endpoint:

Add route in server/src/index.ts or a router under server/src/routes/.

All routes should be under /api/....

If it uses CSV-backed data, put the loader in server/src/data/.

Add a typed function in client/src/lib/api.ts:

Export the TypeScript type(s).

Export a helper function that uses API_BASE.

Example:

ts
Copy code
// client/src/lib/api.ts
export interface FooRow {
  id: number;
  name: string;
}

export async function getFoos(): Promise<FooRow[]> {
  const res = await fetch(`${API_BASE}/foos`);
  return handleJson<FooRow[]>(res);
}
Use the helper in your page instead of inlining fetch(".../api/...").

Before proposing new code or wiring new pages, always check this README’s /api section and lib/api.ts so everything stays consistent.

6. Known Limitations / To-Do
2025 player stats do not include games played per position, so GP is not shown yet.

Auction logic is currently static (CSV-based values only).

Period standings are stubbed / simplified; full category scoring can be expanded later.

Free-agent / waiver logic is not implemented yet; /players is a flat pool.

sql
Copy code

If you overwrite your current `README.md` with this, then:

```bash
