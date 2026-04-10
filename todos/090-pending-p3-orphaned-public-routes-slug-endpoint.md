---
status: pending
priority: p3
issue_id: "090"
tags: [code-review, dead-code, architecture]
dependencies: []
---

# Orphaned Public Routes (Slug Lookup + List Endpoint)

## Problem Statement

After removing the `LeagueDetail` page and `/discover/:slug` route, the server-side endpoint `GET /api/public/leagues/:slug` in `server/src/routes/public.ts` (lines 12-34) is entirely orphaned — no client code navigates to a page that would call it. Additionally, `GET /api/public/leagues` (lines 40-53) still selects and returns `publicSlug` which no client consumes, and this listing endpoint partially duplicates `GET /api/leagues/public` in `server/src/features/leagues/routes.ts`.

This is low severity — both endpoints are read-only and harmless — but they add unnecessary attack surface and dead code.

## Findings

### Agent: architecture-strategist
- `GET /api/public/leagues/:slug` is dead code with no consumer
- If detail page is planned for near-term rebuild, add a comment; if indefinitely deferred, remove it

### Agent: agent-native-reviewer
- Two overlapping public league list endpoints: `/api/leagues/public` (full data) and `/api/public/leagues` (minimal data)
- Consider consolidating

### Agent: code-simplicity-reviewer
- Orphaned slug-lookup endpoint: 25 lines of dead code
- `publicSlug: true` in public.ts listing (line 48) has no consumer

## Proposed Solutions

### Solution 1: Remove orphaned slug endpoint, clean up listing
- Delete `GET /api/public/leagues/:slug` handler (lines 12-34)
- Remove `publicSlug: true` from `GET /api/public/leagues` select (line 48)
- Keep the listing endpoint as a minimal alternative to the richer `/api/leagues/public`
- **Pros**: Clean removal of dead code, smaller attack surface
- **Cons**: Must re-create if detail page is rebuilt later
- **Effort**: Small (5 minutes)
- **Risk**: Low

### Solution 2: Remove entire public.ts file
- If `GET /api/public/leagues` listing duplicates `/api/leagues/public`, remove the file entirely
- Unmount `publicRouter` from `server/src/index.ts`
- **Pros**: Eliminates duplicate endpoints and all dead code
- **Cons**: More aggressive; need to verify nothing else uses `publicRouter`
- **Effort**: Small (10 minutes)
- **Risk**: Low (verify no consumers first)

### Solution 3: Keep with documentation
- Add comments to both endpoints indicating they are retained for future league detail page
- **Pros**: Zero code change, preserves work for later
- **Cons**: Dead code remains in production, confusing for future readers
- **Effort**: Trivial
- **Risk**: None

## Recommended Action



## Technical Details

### Affected Files
- `server/src/routes/public.ts` — lines 12-34 (slug endpoint), line 48 (`publicSlug` in list)
- `server/src/index.ts` — where `publicRouter` is mounted

### Components
- Public league API surface

## Acceptance Criteria

- [ ] No server endpoints exist that have zero client consumers (or they are documented as intentionally retained)
- [ ] `publicSlug` is not returned in API responses that no client type expects it

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-04-09 | Created from code review | Architecture + simplicity agents both flagged |

## Resources

- File: `server/src/routes/public.ts`
- Related: `server/src/features/leagues/routes.ts` (the actively-used public leagues endpoint)
