# FBST Project Structure & Dev Conventions

_Last updated: 2025-12-11_

This document defines the canonical folder layout for FBST and how to work with it during development.

---

## 1. High-level layout

Repository root: `/Users/jameschang/Documents/Projects/fbst`

- `client/`
  - **Canonical React/Vite front-end app.**
  - Uses React 18, React Router, Tailwind, Radix UI, etc.
  - Source code lives in `client/src`.
- `server/`
  - **Canonical Express + TypeScript API server.**
  - Runs with `npm start` inside the `server` folder (uses `tsx` to run `src/index.ts`).
- `prisma/`
  - Prisma schema and migrations for the database.
  - Root `package.json` owns the Prisma CLI (`prisma:migrate`, `prisma:generate`).
- `docs/`
  - Documentation, including this `PROJECT_STRUCTURE.md`.
- `lib/`
  - Shared scripts or utilities (if used).
- `node_modules/` (root)
  - Dependencies for tooling (Prisma, etc.). Front-end and server each have their own `node_modules` as well.

Legacy / archived items (kept only as backups):

- `_old_root_src/`
- `_old_root_index.html`
- `_old_root_vite.config.ts`
- `_old_root_tailwind.config.js`
- `_old_root_postcss.config.js`
- `_old_root_tsconfig.json`
- `client/_old_client_legacy/`

These **must not** be edited or referenced in new code. They are safe to delete once we are confident everything is stable.

---

## 2. Front-end (client) structure

Canonical front-end app root:

- `client/`
  - `src/`
    - `components/`
    - `pages/`
    - `config/`
    - `data/`
    - `lib/`
    - `api.ts` (front-end API client)
    - `App.tsx`
    - `main.tsx`
  - `vite.config.ts`
  - `tailwind.config.js`
  - `postcss.config.js`
  - `tsconfig.json`
  - `package.json` (name: `fbst-client`)

**Dev commands:**

From repo root:

- `npm run dev` → `cd client && npm run dev`  
- `npm run build` → build client app  
- `npm run preview` → Vite preview  
- `npm run lint` → lint client code

You can still run these directly inside `client/` (e.g. `cd client && npm run dev`), but the root scripts are the canonical entrypoints.

---

## 3. Back-end (server) structure

API server root:

- `server/`
  - `src/`
    - `index.ts` (main Express app, API routes)
    - `data/` (CSV/JSON files like `ogba_player_season_totals_2025.csv`, `ogba_auction_values_2025.csv`, etc.)
  - `package.json` (name typically `fbst-server`)
  - `tsconfig.json`
  - `node_modules/` (server dependencies)

**Dev command:**

From repo root:

- `npm run server` → `cd server && npm start`

Or, from inside server:

- `cd server && npm start`

---

## 4. Database / Prisma

Prisma is managed from the root:

- `prisma/schema.prisma`
- Migrations under `prisma/migrations/`

**Commands (from repo root):**

- `npm run prisma:migrate`
- `npm run prisma:generate`

---

## 5. Collaboration & change rules (with ChatGPT)

To keep things deterministic and avoid confusion:

1. **Front-end work always targets `client/src`, not any `_old_root_src` folder.**
2. **Back-end work always targets `server/src`.**
3. For any change that ChatGPT recommends to a file, the assistant will:
   - Provide the **full file contents** for copy/paste replacement.
   - Clearly specify the **exact path**, e.g.  
     - `client/src/api.ts`  
     - `client/src/components/PlayerDetailModal.tsx`  
     - `server/src/index.ts`
4. No “snippet-only” changes unless explicitly requested by Jimmy; default is **full file replacement** to reduce merge issues.
5. When we change project structure (move/rename folders, change scripts), this document must be updated at the same time so future work is aligned.
6. Legacy folders starting with `_old_` are **read-only archive**. New code must never import from or reference them.

---

## 6. How to run the full stack in development

From the repo root:

```bash
# Terminal 1 – API server
npm run server   # internally runs: cd server && npm start

# Terminal 2 – Front-end
npm run dev      # internally runs: cd client && npm run dev

Then open:

Front-end: http://localhost:5173

API server: http://localhost:4000
 (for JSON endpoints)


We’ll treat this as the source of truth going forward.

---

## 2. (Optional but recommended) Update root `package.json` to delegate cleanly

If you haven’t already changed the root scripts, I recommend making them explicit wrappers.

**Path:** `package.json` at repo root (`/Users/jameschang/Documents/Projects/fbst/package.json`)

Replace the entire file with:

```json
{
  "name": "fbst",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "// NOTE_1": "Front-end (React/Vite) lives in ./client",
    "// NOTE_2": "API server (Express/TS) lives in ./server",
    "// NOTE_3": "These scripts are just delegators so you always run them from repo root",
    "dev": "cd client && npm run dev",
    "build": "cd client && npm run build",
    "preview": "cd client && npm run preview",
    "lint": "cd client && npm run lint",
    "server": "cd server && npm start",
    "prisma:migrate": "prisma migrate dev",
    "prisma:generate": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^6.19.0",
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react-swc": "^4.0.0",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.0.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "postcss": "^8.4.49",
    "prisma": "^6.19.0",
    "tailwindcss": "^3.4.10",
    "typescript": "^5.6.3",
    "vite": "^5.4.0"
  }
}


