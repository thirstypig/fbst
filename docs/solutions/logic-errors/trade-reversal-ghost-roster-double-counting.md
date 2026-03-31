---
title: "Period standings double-counting players from reversed trade ghost roster entries"
date: 2026-03-31
category: logic-errors
tags:
  - standings
  - trades
  - roster
  - period-stats
  - double-counting
  - data-integrity
affected_modules:
  - standings
  - commissioner
  - trades
  - roster
severity: high
symptoms:
  - Period standings show inflated stat totals for teams involved in reversed trades
  - Players counted on both their current team and former team for the same scoring period
  - Save counts (and other stats) doubled when a pitcher was traded then trade reversed
  - Ghost TRADE_IN roster entries with releasedAt set still matched by period overlap query
related_files:
  - server/src/features/standings/services/standingsService.ts
  - server/src/features/commissioner/services/CommissionerService.ts
  - server/src/features/trades/routes.ts
  - prisma/schema.prisma
---

# Period Standings Double-Counting Traded Players

## Problem

Los Doyers showed 3 saves on the Period standings page when they should have had 1. Similarly, Skunk Dogs showed inflated Runs. The `computeWithPeriodStats` fallback path was counting traded players' stats on both their old and new teams.

### Symptoms

- Los Doyers: SV=3 (should be 1) — Pete Fairbanks' 2 SV counted on both Skunk Dogs and Los Doyers
- Skunk Dogs: R=27 (should be 24) — Austin Riley's R=1, H=4, AB=11 counted on both teams
- Ohtani (hitter): Could be double-counted between Skunk Dogs and Demolition Lumber Co.

## Root Cause

**Four compounding factors (swiss cheese failure):**

1. **Trade reversal left ghost data**: Trade #16 (Riley ↔ Fairbanks) was processed Mar 24, then reversed Mar 25. The reversal released the TRADE_IN roster entries (`releasedAt` set) but did NOT delete them.

2. **Fallback path lacks date-aware attribution**: `computeWithPeriodStats` (used when daily stats coverage < 80%) queries ALL roster entries overlapping with the period — including released ghost entries. Unlike the daily stats path, it doesn't attribute stats based on ownership dates.

3. **No post-trade integrity checks**: No validation ran after the trade reversal to verify roster data integrity.

4. **Low daily stats coverage**: Only 8.3% (1 of 12 days) triggered the fallback path instead of the daily stats path which handles trades correctly.

### The Overlap Query

```sql
-- This query catches ghost entries because releasedAt (Mar 25 07:45) > period.startDate (Mar 25 00:00)
WHERE acquiredAt < period.endDate
  AND (releasedAt IS NULL OR releasedAt > period.startDate)
```

## Solution

### Code Fix (standingsService.ts)

Before the team iteration loop in `computeWithPeriodStats`, build a map of each player's current active team:

```typescript
const activePlayerTeam = new Map<number, number>(); // playerId → teamId
for (const r of rosters) {
  if (r.releasedAt === null) {
    activePlayerTeam.set(r.playerId, r.teamId);
  }
}
```

Then inside the per-team loop, skip roster entries where the player is currently active on a different team:

```typescript
const currentTeam = activePlayerTeam.get(roster.playerId);
if (currentTeam !== undefined && currentTeam !== t.id) continue;
```

This is defensive — rather than preventing bad roster data, it makes standings computation resilient to ghost entries by always deferring to the player's current active team.

### Data Cleanup

1. Deleted 2 ghost TRADE_IN roster entries (Riley on Skunk Dogs, Fairbanks on Los Doyers)
2. Fixed Trade #17 bad `processedAt` timestamp (was before `createdAt`)

### Verification

```bash
/audit-data  # Run data integrity checks
```

Check that no player appears on multiple teams' active rosters (except Ohtani two-way).

## Prevention

### 1. Trade reversal must hard-delete TRADE_IN entries

When a trade is reversed, DELETE the `TRADE_IN` roster entries entirely — don't just set `releasedAt`. The original entries should be restored to active. Wrap in a transaction.

### 2. Post-transaction integrity checks

Create `verifyRosterIntegrity(leagueId)` that checks:
- No player on 2+ active team rosters
- No orphaned TRADE_IN entries
- Budget reconciliation
- Roster count bounds

Run after every trade processing, reversal, and waiver claim.

### 3. Fallback path parity

Any logic in the daily stats attribution path must have an equivalent in the period stats fallback path. When modifying one, the PR must confirm the other was reviewed.

### 4. Monitoring

Log when the fallback path is activated (daily coverage < 80%). Alert on duplicate player appearances in standings computation.

## Test Cases to Add

```
describe("computeWithPeriodStats trade attribution")
  - "player traded mid-period appears on exactly one team"
  - "reversed trade does not cause player to appear on two teams"
  - "total league stats for a player equal individual player stats (no duplication)"
  - "fallback path produces same totals as daily path for known test data"

describe("trade reversal roster cleanup")
  - "reversed trade deletes all TRADE_IN roster entries"
  - "reversed trade restores original entries to active"
  - "partial reversal failure rolls back entire transaction"

describe("post-transaction integrity checks")
  - "verifyRosterIntegrity catches player on two teams"
  - "verifyRosterIntegrity catches orphaned TRADE_IN entries"
  - "integrity check runs automatically after trade processing"
```

## Related

- Commit: b4a02bd (fix applied)
- Memory: `feedback_trade_reversal_ghost_data.md`
- Command: `/audit-data` for ongoing integrity checks
- Existing doc: `docs/solutions/logic-errors/ohtani-derived-id-api-resolution.md` (related two-way player handling)
