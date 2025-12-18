# FBST – Dev Notes & Change Tracking

_Last updated: 2025-12-11_

This document describes how we track changes when working on FBST together.

## 1. File structure and “source of truth”

- The **current app** lives under:
  - `server/` – API + CSV/JSON loaders
  - `client/` – React front-end (`src/` is the source of truth)
- The old Vite root React app and legacy client have been archived:
  - `_old_root_src/`, `_old_root_*.ts`, `_old_client_legacy/`
- When editing code, we only touch:
  - `server/src/**`
  - `client/src/**`
  - `docs/**` for documentation

## 2. How code changes are marked

For any full-file replacement that ChatGPT provides:

1. The file gets a `FBST_CHANGELOG` block at the top:

   ```ts
   // FBST_CHANGELOG
   // - 2025-12-11 – Added Teams view (hitters/pitchers split, MLB column).

2. If we touch the file again later, we append another dated bullet.

3. For large sections (e.g., a new table or modal), we may wrap them with:

// [FBST 2025-12-11] Start: Players table
// ...
// [FBST 2025-12-11] End: Players table


This allows a non-developer to scroll a file and see what changed and when.

## 3. Expectations when copying code

For TypeScript/React files, we prefer full-file replacements so there is no ambiguity about partial edits.

For documentation (docs/*.md), we may add new sections or new files without overwriting existing work.

When in doubt, files that have a FBST_CHANGELOG header are the ones we consider current.

## 4. Where team names and MLB teams come from

OGBA team full names are controlled in:

client/src/lib/playerDisplay.ts → OGBA_TEAM_NAME_MAP

MLB team codes will eventually come from the CSV / stats worker and appear as mlb_team in the data returned by the server. The UI already has columns prepared; once the data exists, they will populate automatically.


If you prefer, we can later merge pieces of this into `PROJECT_STRUCTURE.md`, but this gives you a stand-alone doc you can open and read like a “how are we working” manual.

