---
status: pending
priority: p3
issue_id: "086"
tags: [code-review, performance, database]
dependencies: []
---

# AiInsight missing @@index([type, leagueId, weekKey])

## Problem Statement
Three queries filter AiInsight by `(type, leagueId, weekKey)` but the unique constraint is 4-column `(type, leagueId, teamId, weekKey)`. PostgreSQL can use the first 2 columns but must scan for weekKey.

## Proposed Solutions
Add `@@index([type, leagueId, weekKey])` to AiInsight model in next migration.
- **Effort**: Small
- **Impact**: Negligible at current scale (queries run once per league per week)

## Technical Details
- **Affected files**: `prisma/schema.prisma`

## Work Log
| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-24 | Created from performance review | Low priority — tiny table |
