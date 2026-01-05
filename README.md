# FBST · OGBA Fantasy Baseball Stat Tool

Simple league tool for OGBA: teams, period/season standings, players (2025 stats), auction values, and (new) transaction imports.

Repo structure:

- `server/` – Node/Express + Prisma + PostgreSQL
- `client/` – React + Vite front-end
- `prisma/` – Prisma schema + migrations
- `docs/` – documentation
- External sibling repo/folder:
  - `../fbst-stats-worker/` – Python scripts that produce CSV/JSON inputs

---

## 1) URLs and `/api` convention (important)

We always:

- Expose server routes behind `/api`
- Point the client at the **base origin**, and append `/api/...` in code

### Server routes (current core endpoints)

- `GET /api/health`
- `GET /api/teams`
- `GET /api/players`
- `GET /api/auction-values`
- `GET /api/season-standings`
- `GET /api/teams/:id/summary`

### Client config

`client/src/lib/api.ts`:

```ts
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
Rules:

Never put /api inside VITE_API_BASE_URL

Always append /api/... in code

Examples:

Local: http://localhost:4000/api/...

Prod: https://<your-api-host>/api/...

2) Local development
2.1 Server
Prereqs:

Node 22.x

A reachable Postgres database (Neon / Render / local Postgres)

From repo root:

bash
Copy code
cd server
npm install
npm start
Prisma / DB setup (recommended workflow)
From repo root:

bash
Copy code
npx prisma format
npx prisma migrate dev --name init
npx prisma generate
If Prisma fails with P1000 Authentication failed, treat it as credentials/URL mismatch. See “Troubleshooting” below.

2.2 Client
From repo root:

bash
Copy code
cd client
npm install
Local env (client/.env or client/.env.local):

env
Copy code
VITE_API_BASE_URL=http://localhost:4000
Run:

bash
Copy code
npm run dev
# open http://localhost:5173/
3) Transactions import pipeline (OnRoto)
3.1 Generate JSON/CSV using fbst-stats-worker
In ../fbst-stats-worker:

bash
Copy code
cd ~/Documents/Projects/fbst-stats-worker
source .venv/bin/activate

python parse_onroto_transactions_html.py \
  --season 2025 \
  --infile data/onroto_transactions_2025.html \
  --outcsv ogba_transactions_2025.csv \
  --outjson ogba_transactions_2025.json
Expected output example:

OK: parsed 466 transactions

ogba_transactions_2025.csv

ogba_transactions_2025.json

3.2 Import JSON into DB (TransactionEvent)
From the FBST repo, run the importer:

bash
Copy code
cd ~/Documents/Projects/fbst/server

LEAGUE_NAME="OGBA" SEASON=2025 INFILE="../../fbst-stats-worker/ogba_transactions_2025.json" \
  npx tsx src/scripts/import_onroto_transactions.ts
Notes:

LEAGUE_NAME defaults to "OGBA" but also tries "OGBA 2025" as fallback.

SEASON defaults to 2025.

INFILE has common path fallbacks if not provided.

4) Troubleshooting
4.1 Prisma: P1000 Authentication failed
Most common root causes:

You copied an old Neon URL (password rotated).

You copied a connection string from a different Neon branch/project.

The username/password is wrong.

Fix:

Re-copy the connection string from Neon (for the exact DB you intend).

Replace DATABASE_URL in .env.

Re-run:

bash
Copy code
cd ~/Documents/Projects/fbst
npx prisma migrate dev --name add_transactions_aliases
4.2 zsh: command not found: python
Use:

python3 (system), OR

activate your venv first:

bash
Copy code
cd ~/Documents/Projects/fbst-stats-worker
source .venv/bin/activate
python --version
5) Render deployment (optional)
5.1 Server (API)
Typical configuration:

Root directory: server/

Start command: npm start

Env vars: DATABASE_URL, PORT

5.2 Client (static)
Root directory: client/

Build: npm run build

Publish directory: client/dist

Env var:

env
Copy code
VITE_API_BASE_URL=https://<your-api-host>
6) Known limitations / TODO
Period standings page (/period) is still future work.

Transactions are imported but not yet exposed via an API route/UI.

Player canonical ID strategy is mlbId (hidden from UI), with alias mapping via PlayerAlias.

yaml
Copy code

---

# 5) FULL FILE: `docs/data-schema.md`

```md
# FBST Data Schemas

Source of truth for JSON produced by the stats worker and served by the FBST API.
All fields are required unless noted otherwise.

---

## 1) `GET /api/season-standings`

```ts
type SeasonStandingsResponse = {
  periodIds: number[]; // e.g. [1,2,3,4,5,6]
  rows: SeasonStandingsRow[];
};

type SeasonStandingsRow = {
  teamId: number;
  teamName: string;
  owner: string;

  // season totals
  R: number;
  HR: number;
  RBI: number;
  SB: number;
  AVG: number;
  W: number;
  S: number;
  K: number;
  ERA: number;
  WHIP: number;

  // roto points by category (1–N teams)
  categoryPoints: {
    R: number;
    HR: number;
    RBI: number;
    SB: number;
    AVG: number;
    W: number;
    S: number;
    K: number;
    ERA: number;
    WHIP: number;
  };

  totalPoints: number;
};
2) GET /api/period-standings?periodId=<id> (planned)
ts
Copy code
type PeriodStandingsResponse = {
  periodId: number;
  rows: PeriodStandingsRow[];
};

type PeriodStandingsRow = {
  teamId: number;
  teamName: string;
  owner: string;

  // period totals
  R: number;
  HR: number;
  RBI: number;
  SB: number;
  AVG: number;
  W: number;
  S: number;
  K: number;
  ERA: number;
  WHIP: number;

  categoryPoints: {
    R: number;
    HR: number;
    RBI: number;
    SB: number;
    AVG: number;
    W: number;
    S: number;
    K: number;
    ERA: number;
    WHIP: number;
  };

  totalPoints: number;
};
3) GET /api/players (current shape depends on server implementation)
The long-term target:

ts
Copy code
type PlayersResponse = {
  hitters: HitterRow[];
  pitchers: PitcherRow[];
};

type BasePlayerRow = {
  playerId: number;
  mlbId: string; // canonical ID (not required to show in UI)
  name: string;
  mlbTeam: string; // e.g. "LAD"
  team: string; // OGBA team name or "-" if FA
  status: "Active" | "Reserve" | "Free agent" | string;
  gamesByPos: { [pos: string]: number }; // { "C": 5, "1B": 12, ... }
};

type HitterRow = BasePlayerRow & {
  isPitcher: false;
  stats: {
    G: number;
    AB: number;
    R: number;
    H: number;
    HR: number;
    RBI: number;
    SB: number;
    AVG: number;
    GS: number;
  };
};

type PitcherRow = BasePlayerRow & {
  isPitcher: true;
  stats: {
    G: number;
    IP: number;
    ER: number;
    H: number;
    BB: number;
    SO: number;
    W: number;
    S: number;
    ERA: number;
    WHIP: number;
  };
};
4) fbst-stats-worker output: ogba_transactions_YYYY.json
Generated by: parse_onroto_transactions_html.py

ts
Copy code
type OgbaTransactionRow = {
  season: number;

  eff_date: string;        // "YYYY-MM-DD" (best-effort)
  eff_date_raw: string;    // "MM.DD"

  league: string;          // often blank in OGBA export
  team: string;            // OGBA team name, e.g. "Diamond Kings"
  player: string;          // OnRoto alias, e.g. "NArenado"
  mlb_tm: string;          // MLB team abbr, e.g. "StL"

  transaction: string;     // e.g. "Release", "Add to Actives", "Change Position to MI"

  submitted_at: string;    // "YYYY-MM-DDTHH:MM" (best-effort)
  submitted_raw: string;   // "MM.DD @ HH:MM"

  row_hash: string;        // idempotency key
};
5) DB mapping: TransactionEvent (Prisma)
Importer: server/src/scripts/import_onroto_transactions.ts

Key points:

TransactionEvent.rowHash uses row_hash from JSON for idempotent upserts.

TransactionEvent.ogbaTeamName stores raw team string even if teamId mapping fails.

TransactionEvent.playerAliasRaw stores raw player alias until it is linked via PlayerAlias.

yaml
Copy code

---

# 6) FULL FILE: `docs/DEV_NOTES.md`

```md
# FBST – Dev Notes & Change Tracking

Last updated: 2026-01-03

This document describes how we track changes and run key workflows.

---

## 1) File structure and “source of truth”

- App:
  - `server/` – API server (Express + TS)
  - `client/` – React/Vite front-end
  - `prisma/` – Prisma schema + migrations
  - `docs/` – documentation
- External (sibling folder):
  - `../fbst-stats-worker/` – Python scripts producing CSV/JSON inputs

Legacy folders starting with `_old_` are archive-only and must not be edited.

---

## 2) How code changes are marked

For any full-file replacement we do together:

1) Add or append to a `FBST_CHANGELOG` block at the top of the file:

```ts
// FBST_CHANGELOG
// - 2026-01-03 – Added transaction importer defaults for OGBA + infile resolver.
For large sections, wrap with:

ts
Copy code
// [FBST YYYY-MM-DD] Start: <section>
// ...
// [FBST YYYY-MM-DD] End: <section>
3) Python conventions (stats worker)
macOS often does not provide python by default outside a venv.

Use:

bash
Copy code
cd ~/Documents/Projects/fbst-stats-worker
source .venv/bin/activate
python --version
4) Prisma conventions
Run Prisma commands from repo root unless you intentionally scope otherwise:

bash
Copy code
cd ~/Documents/Projects/fbst
npx prisma format
npx prisma migrate dev --name <migration_name>
npx prisma generate
If you get P1000 Authentication failed, treat it as a database credentials/URL problem (Neon/Render/local DB), not a Prisma schema problem.

5) Transactions import workflow
Generate JSON:

bash
Copy code
cd ~/Documents/Projects/fbst-stats-worker
source .venv/bin/activate

python parse_onroto_transactions_html.py --season 2025 --infile data/onroto_transactions_2025.html \
  --outcsv ogba_transactions_2025.csv --outjson ogba_transactions_2025.json
Import into DB:

bash
Copy code
cd ~/Documents/Projects/fbst/server
LEAGUE_NAME="OGBA" SEASON=2025 INFILE="../../fbst-stats-worker/ogba_transactions_2025.json" \
  npx tsx src/scripts/import_onroto_transactions.ts
yaml
Copy code

---

# 7) FULL FILE: `docs/display-rules.md`

```md
# FBST Display Rules (Teams & Players)

Last updated: 2026-01-03

## Team naming

- **Fantasy (OGBA) teams**
  - In tables: 3-letter team code (DDG, DLC, DMK, …) when available
  - In headings/modals: full team name (Dodger Dawgs, Demolition Lumber Co., …)

- **MLB teams**
  - In tables: MLB abbreviation (LAD, SD, SF, …)
  - In headings/modals: full MLB team name when needed

Implementation:

- Central helpers:
  - `client/src/lib/playerDisplay.ts`
    - `getOgbaTeamName(code)`
    - `getMlbTeamAbbr(player)`
    - `getMlbTeamName(player)`

## Transactions (internal for now)

- Transaction import uses `TransactionEvent` in the DB.
- Do not show `Player.mlbId` in the UI; it’s an internal join key.
- UI display should use player name + MLB team abbreviation + OGBA team name/code.
