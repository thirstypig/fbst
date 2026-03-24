---
status: pending
priority: p3
issue_id: "088"
tags: [code-review, typescript, type-safety]
dependencies: []
---

# Digest state untyped (any) — define LeagueDigest interface

## Problem Statement
The `digest` state in Home.tsx is fetched as `fetchJsonApi<any>` and the entire digest section cascades with `any` types (setter callbacks, `.map()` params).

## Proposed Solutions
Define a `LeagueDigest` interface matching the AI response shape. Type the state as `LeagueDigest | null`.
- **Effort**: Medium (define interface, update all references)

## Technical Details
- **Affected files**: `client/src/pages/Home.tsx`

## Work Log
| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-24 | Created from TypeScript review | Shape is well-known from AI prompt schema |
