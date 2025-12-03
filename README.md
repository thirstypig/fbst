# FBST – Fantasy Baseball Stat Tool

FBST is a web app for running fantasy baseball auctions and drafts, starting with the **OGBA** league and designed to eventually support **multiple leagues** with custom rules, scoring, and draft types.

- Current status: Internal tool for OGBA with a working auction room.
- Short-term direction: Clean up UI, add dark mode, and refactor the app to be **league-aware**.
- Medium-term direction: Multi-league support (multiple commissioners, league settings, and site admin analytics).

---

## 📌 Purpose

FBST replaces outdated fantasy systems with a fast, customizable, data-driven platform.  
The system supports:

- Complex league rules  
- Multi-week scoring periods  
- Auction drafts  
- Trend analytics  
- Team pages & advanced stat tracking  
- Real MLB stat ingestion  

This README defines the **MVP**, **architecture**, and **development direction** so the project stays aligned even when priorities or features pivot.

---

# 🎯 MVP Goals (Milestone v1.0)

The MVP must enable OGBA to run a full season with:

### 1. League Foundations
- 8 OGBA teams  
- Season periods (~30 days each)  
- Period + cumulative standings  
- Team detail pages  

### 2. OGBA Scoring System
- Categories:
  - R, HR, RBI, SB, AVG  
  - W, S, ERA, WHIP, K  
- Minimum 50 IP per period  
- Ranking 1–8 → points 8 → 1  
- Ties award 0.5 points  
- Period resets  
- Season cumulative standings decide champion  

### 2.1 Core entities

- **User**
  - Represents a person using the app.
  - May belong to multiple leagues.
  - Has optional site-level role flags (e.g. `isSuperAdmin`).

- **League**
  - Represents a single fantasy league (e.g. “OGBA 2026”).
  - Key fields:
    - `id`
    - `name`
    - `season` (year)
    - `draftSettings`:
      - `mode`: `'auction' | 'draft'`
      - `order`: `'snake' | 'linear' | null` (only used when `mode = 'draft'`)
  - Owns teams, auctions, league settings, etc.

- **UserLeagueRole**
  - Join between `User` and `League`.
  - Fields:
    - `userId`
    - `leagueId`
    - `role`: `owner | admin | member`
  - Determines who can edit settings vs just manage a team.

- **LeagueSettings**
  - Per-league configuration for rules and scoring.
  - Examples:
    - Scoring type: `roto | points`
    - Categories: (e.g. R, HR, RBI, SB, AVG)
    - Roster slots (C, 1B, 2B, etc.)
    - Budget (e.g. $260)
    - Draft / auction timing and other league options.

- **Team**
  - A fantasy team within a league.
  - Fields:
    - `leagueId`, `ownerUserId`, `name`, `abbrev`, etc.

- **Auction**
  - Represents a specific auction event for a league/season.
  - Tied to `leagueId`.
  - Stores budget, state (upcoming / live / complete), and snapshots of rules.

- **PlayerValue / Projections**
  - Store projections, calculated values, and/or price suggestions **per league**.
  - Tied to `leagueId` so different leagues can use different settings/weights.


### 3. Standings UI
- Period standings  
- Cumulative standings  
- Category-by-category standings  
- +/- trends  

### 4. Team Page
Shows:
- Active roster  
- YTD stats  
- Period stats  
- Games-by-position  
- Contributions from dropped players  

### 5. Auction Draft (Phase 1)
- UI mock + basic flow  
- Timer system  
- Bidding structure  
- Budget tracking (OGBA: $400 per team)  

### 6. Admin Tools
- Create/manage periods  
- Reset periods  
- Seed teams  
- Manual stat overrides (MVP-lite)

---

# 🧱 System Architecture

fbst/
│
├── client/ # React + Vite + TS (UI)
│ ├── pages/ # Standings, Teams, Auction
│ ├── components/ # Layout, NavBar, TrendArrow
│ ├── lib/ # API helpers
│ └── index.css # TailwindCSS
│
├── server/ # Express + TypeScript (API)
│ ├── routes/ # REST endpoints
│ ├── seed.ts # DB seeding
│ └── index.ts # API entrypoint
│
├── prisma/
│ └── schema.prisma # Database schema
│
└── README.md


---

## Tech stack

> ⚠️ Update this section to reflect your actual stack.

- Frontend: (React / Next / Vite / etc.)
- Backend: (Node / Express / tRPC / etc.)
- Database: (Postgres / SQLite / etc.)
- Language: TypeScript

---

## Getting started

> Adjust commands as needed for your setup.

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run production build
npm start

```bash
git clone https://github.com/thirstypig/fbst.git
cd fbst
