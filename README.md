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