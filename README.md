# FBST — Fantasy Baseball Stat Tool

FBST is a web app for the OGBA fantasy baseball league.
It tracks period-based roto standings, trends, team stats, and runs a live auction draft.

## Stack

- Frontend: React + Vite + TypeScript + Tailwind
- Backend: Node + Express + Socket.IO
- Database: Postgres (Neon) via Prisma

## Apps

- `client/` – FBST Dashboard (Standings, Team pages, Auction)
- `server/` – API + realtime auction engine

## Quickstart

### 1. Install dependencies

```bash
cd fbst

cd client
npm install

cd ../server
npm install
