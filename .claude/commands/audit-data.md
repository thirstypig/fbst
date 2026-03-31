Run a data integrity audit on league 20. Check for:

1. **Multi-team players**: Any player on multiple teams' active rosters (except Ohtani two-way)
2. **Ghost roster entries**: Released TRADE_IN entries that shouldn't exist (reversed trades)
3. **Trade anomalies**: Trades where processedAt is before createdAt
4. **Roster count**: Every team should have exactly 23 active players (14 hitters + 9 pitchers)
5. **Stats consistency**: Compare PlayerStatsPeriod totals vs TeamStatsPeriod snapshot for each team — flag mismatches > 0
6. **Budget sanity**: No team should have negative budget; auction spend + budget remaining should equal starting budget

For each issue found, report the problem and suggest a fix. Do NOT auto-fix — just report.

Run this from the server directory using node with @prisma/client (CommonJS require pattern, .cjs extension if needed).
