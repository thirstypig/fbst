# 📘 FBST – Fantasy Baseball Stat Tool

A modern, extensible fantasy baseball platform built initially for **OGBA**, with a long-term vision to support any custom league format.

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

# ⚙️ Tech Stack

| Area | Technology |
|------|------------|
| Frontend | React, TypeScript, Vite, TailwindCSS, React Router |
| Backend | Node.js, Express, TypeScript |
| Database | Neon PostgreSQL |
| ORM | Prisma |
| Realtime | Socket.IO (for auction) |
| Dev Tools | Cursor, GitHub, Vite, tsx |

---

# 🚀 Getting Started (Local Development)

## 1. Clone & Install

```bash
git clone https://github.com/thirstypig/fbst.git
cd fbst
