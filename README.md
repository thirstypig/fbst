# FBST · OGBA Fantasy Baseball Stat Tool

Simple league tool for OGBA: teams, period/season standings, players (2025 stats), and auction values.

This repo is split into:

- `server/` – Node/Express + Prisma + PostgreSQL  
- `client/` – React + Vite front-end

---

## 1. URLs and `/api` Convention (IMPORTANT)

We **always**:

- Expose server routes behind `/api`
- Point the client at the **base origin**, and append `/api/...` in code

### Server routes

Current core endpoints:

- `GET /api/health`
- `GET /api/teams`
- `GET /api/players`
- `GET /api/auction-values`
- `GET /api/season-standings` – season-long 7×7 roto standings per team
- `GET /api/teams/:id/summary` – per-team period breakdown + season total

(Period standings endpoints can be added later; see TODOs at the bottom.)

### Client config

```ts
// client/src/lib/api.ts
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
Local dev default:

API_BASE = http://localhost:4000

Render (prod) client env:

env
Copy code
VITE_API_BASE_URL=https://fbst-api.onrender.com
Every fetch in the client should look like:

ts
Copy code
fetch(`${API_BASE}/api/teams`);
fetch(`${API_BASE}/api/players`);
fetch(`${API_BASE}/api/auction-values`);
fetch(`${API_BASE}/api/season-standings`);
fetch(`${API_BASE}/api/teams/${teamId}/summary`);
Rules:

Never put /api inside VITE_API_BASE_URL

Always append /api/... in code

This matches:

Local: http://localhost:4000/api/...

Render: https://fbst-api.onrender.com/api/...

When adding new endpoints or client code, check this section first so we don’t re-introduce /api/api/... bugs.

2. Local Development
2.1 Server
Prereqs

Node 22.x

A Postgres instance you can reach from your machine

Server .env

From repo root, create server/.env with at least:

env
Copy code
DATABASE_URL=postgresql://user:pass@localhost:5432/fbst_db
PORT=4000
DATABASE_URL must match whatever DB you’re actually using (local or Render DB).

Install, migrate, seed, run

bash
Copy code
# from repo root
cd server

# install dependencies
npm install

# apply schema to DB
npx prisma db push --schema ../prisma/schema.prisma --accept-data-loss

# seed OGBA league / periods / sample roster
npx tsx src/seed.ts

# start API (runs tsx src/index.ts)
npm start
You should see:

text
Copy code
🔥 FBST server listening on http://localhost:4000
Quick sanity checks

In another terminal:

bash
Copy code
curl http://localhost:4000/api/health
# -> {"ok":true}

curl http://localhost:4000/api/teams
# -> JSON list of OGBA teams

curl http://localhost:4000/api/players | head
# -> CSV-backed player rows as JSON

curl http://localhost:4000/api/season-standings
# -> array of teams with category totals + roto points
If these fail, the client will also fail.

2.2 Client
From repo root:

bash
Copy code
cd client
npm install
Local env (either client/.env or .env.local):

env
Copy code
VITE_API_BASE_URL=http://localhost:4000
Run Vite dev server:

bash
Copy code
npm run dev
# open http://localhost:5173/
3. Client App Structure
Layout / navigation
client/src/components/AppShell.tsx

Left sidebar: app title + nav

Main content: route content wrapped in padded container

client/src/components/ThemeContext.tsx / ThemeToggle.tsx

Dark/light mode stored in localStorage (fbst-theme)

Applies .dark class to <html> for Tailwind dark styles

Routes
Configured in client/src/main.tsx (React Router):

/period – Period standings (stub / future)

/season – Season standings (implemented)

/teams – Team list + per-team period summary table

/players – 2025 player pool table, filterable

/auction – Auction values table

If you hit a white screen, first confirm:

npm start is still running in server/

VITE_API_BASE_URL is pointing at the right origin (no /api)

4. Data Sources
4.1 2025 Player Season Stats
File: server/src/data/ogba_player_season_totals_2025.csv

Endpoint: GET /api/players

Client type: PlayerSeasonRow in client/src/lib/api.ts

Client page: client/src/pages/Players.tsx

Simplified shape:

ts
Copy code
export interface PlayerSeasonRow {
  mlb_id: string | null;
  name: string | null;
  team: string | null; // OGBA fantasy team name (when present)
  pos: string | null;  // 1B, 2B, SS, OF, P, etc.

  R: number | null;
  HR: number | null;
  RBI: number | null;
  SB: number | null;
  AVG: number | null;

  W: number | null;
  S: number | null;
  K: number | null;
  ERA: number | null;
  WHIP: number | null;

  isFreeAgent?: boolean;
  isPitcher?: boolean;
}
Some numeric fields may be null depending on how the CSV was generated.

The Players page:

Calls getPlayers() from lib/api

Allows text search across name / team / pos / mlb_id

Optional toggle: “show only rostered players”

Uses a composite React key (mlb_id-index) to avoid duplicate key warnings

4.2 Auction Values
File: server/src/data/ogba_auction_values_2025.csv

Endpoint: GET /api/auction-values

Client type: AuctionValueRow in client/src/lib/api.ts

Client page: client/src/pages/AuctionValues.tsx

Shape:

ts
Copy code
export interface AuctionValueRow {
  player_name: string;
  positions: string | null;  // e.g. "1B", "2B/SS"
  dollar_value: number | null;
  ogba_team?: string | null; // optional if we add it later
}
4.3 Teams
Source: Prisma + seed (server/src/seed.ts)

Table: Team (see prisma/schema.prisma)

Endpoint: GET /api/teams

Client type: Team (inline in Teams.tsx or lib/api.ts)

Fields:

ts
Copy code
type Team = {
  id: number;
  name: string;
  owner: string | null;
  budget: number;
  leagueId: number;
};
4.4 Season Standings (7×7 roto points)
Endpoint: GET /api/season-standings

Server calculates, per team:

Raw category totals across all players (R, HR, RBI, SB, W, S, K)

Roto points per category (1–8 in an 8-team league, higher is better)

Sum of category points as totalPoints

Client page: client/src/pages/Season.tsx

Table shows:

Team / owner

Raw totals per category

Final Pts column (sum of category points)

The hint in the UI: 7×7 roto-style points (higher is better).

4.5 Team Period Summary
Endpoint: GET /api/teams/:id/summary

Returns:

ts
Copy code
type PeriodSummary = {
  periodId: number;
  label: string;        // e.g. "Period 1"
  periodPoints: number | null;
  seasonPoints: number | null;
};

type TeamSummaryResponse = {
  team: Team;
  periodSummaries: PeriodSummary[];
  seasonTotal: number;  // season-long roto points for that team
};
Client page: client/src/pages/Teams.tsx

The Teams page:

Top: pill buttons to select a team

Bottom: table of all periods for the selected team, with per-period and running season points, plus a season total row.

5. Client API Helpers
Located in client/src/lib/api.ts.

Pattern:

ts
Copy code
export async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function getTeams(): Promise<Team[]> {
  const res = await fetch(`${API_BASE}/api/teams`);
  return handleJson<Team[]>(res);
}
All pages should call these helpers instead of inlining fetch(...) everywhere.
If you add a new endpoint, add a typed helper here.

6. Render Deployment
6.1 Server (API)
Service name: fbst-api

Root directory: server/

Build command (Render “Build Command”):

bash
Copy code
npm install
Start command (Render “Start Command”):

bash
Copy code
npx prisma db push --schema ../prisma/schema.prisma --accept-data-loss && \
npx tsx src/seed.ts && \
npx tsx src/index.ts
Environment variables (Render API service):

env
Copy code
DATABASE_URL=postgresql://...     # from Render Postgres
PORT=10000                        # or whatever Render assigns / expects
Expected public routes:

https://fbst-api.onrender.com/api/health

https://fbst-api.onrender.com/api/teams

https://fbst-api.onrender.com/api/players

https://fbst-api.onrender.com/api/auction-values

https://fbst-api.onrender.com/api/season-standings

https://fbst-api.onrender.com/api/teams/:id/summary

Sanity check:

bash
Copy code
curl https://fbst-api.onrender.com/api/health
6.2 Client (Static site)
If/when you deploy the client (e.g. Render static site):

Root directory: client/

Build command:

bash
Copy code
npm install
npm run build
Publish directory: client/dist

Environment variable (client static site):

env
Copy code
VITE_API_BASE_URL=https://fbst-api.onrender.com
The client then calls e.g.:

GET https://fbst-api.onrender.com/api/teams

GET https://fbst-api.onrender.com/api/players

GET https://fbst-api.onrender.com/api/auction-values

GET https://fbst-api.onrender.com/api/season-standings

7. Known Limitations / TODO
Period standings page:

/period route is currently stubbed.

Need an endpoint like GET /api/period-standings?periodId=1 or GET /api/period-standings returning all periods.

Scoring should match OGBA rules (same 7 cats as season standings).

Rosters

Long-term, players should be attached to teams through a proper Roster table.

Right now, some logic still relies on PlayerSeasonRow.team coming from the CSV.

Rate stats

Season standings only consider counting stats (R, HR, RBI, SB, W, S, K).

AVG / ERA / WHIP are available from the CSV but not yet part of standings scoring.

No auth / multi-league

Single OGBA league, no user accounts.

Multi-league + commissioner/owner roles would require proper auth + league/user models.

If you add new features or change how data is wired (especially anything involving /api or VITE_API_BASE_URL), update this README so Future You doesn’t have to re-discover the same constraints.

pgsql
Copy code

---

**After this:**

1. Paste this into `README.md` and save.
2. `git status` → make sure server/client changes + README are tracked.
3. Commit: `git commit -am "Season standings + teams summary + players table UI"`.

Then the next *real* build step is to design the **Period** page + backend endpoint so you can see standings per OGBA period, not just full-season. When you’re ready to tackle that, I’ll give you the server route + `client/src/pages/Period.tsx` end-to-end.
::contentReference[oaicite:0]{index=0}