---
trigger: always_on
---

# FBST Workspace Rules (React/Vite/TS + API + DB)

## Operating protocol (mandatory)
1) For any change touching >1 file or user-visible behavior:
   - Produce 3 artifacts BEFORE implementing:
     A) Task Plan (scope, assumptions, files to touch)
     B) Implementation Plan / Diff Summary
     C) Verification plan (exact commands + expected outputs)
2) Never run terminal commands without showing the exact command first.
3) Keep diffs small. Prefer 1–3 focused commits per task.

## Tech stack assumptions
- Frontend: React + Vite + TypeScript
- Data access: use the canonical API module (do not create competing API wrappers)
- UI: tables, modals, and routing must remain consistent across pages

## Coding standards
- TypeScript strictness: do not use `any` unless you must; if used, isolate and comment why.
- Formatting: follow Prettier + ESLint; do not fight the formatter.
- No new dependencies unless explicitly justified in the Task Plan.

## Data / stats correctness (high-risk area)
- Any change to scoring, stat normalization, or “isPitcher/hitter” classification must include:
  - a small unit test OR a deterministic verification script
  - a short “Behavior change note” in the Verification artifact

## UI/UX conventions
- Tables: consistent column alignment, consistent numeric formatting, consistent header naming
- Modals: never break keyboard escape/close behavior; maintain click-to-open pattern
- Routing: no silent redirects; if redirect is necessary, document it in the diff summary

## Verification (required)
Include in Verification artifact:
- `npm test` (or Vitest command) results
- `npm run build` results (at least once per multi-file change)
- Screenshot or short description for any UI change

## File-touch constraints (default)
- Prefer editing existing components over creating new variants.
- Avoid renaming public routes without updating links and README notes.
