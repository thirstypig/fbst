# FBST Display Rules (Teams & Players)

Last updated: 2026-01-03

## Team naming

- **Fantasy (OGBA) teams**
  - In tables: 3-letter team code (DDG, DLC, DMK, …) when available
  - In headings/modals: full team name (Dodger Dawgs, Demolition Lumber Co., …)

- **MLB teams**
  - In tables: MLB abbreviation (LAD, SD, SF, …)
  - In headings/modals: full MLB team name when needed

Implementation:

- Central helpers:
  - `client/src/lib/playerDisplay.ts`
    - `getOgbaTeamName(code)`
    - `getMlbTeamAbbr(player)`
    - `getMlbTeamName(player)`

## Transactions (internal for now)

- Transaction import uses `TransactionEvent` in the DB.
- Do not show `Player.mlbId` in the UI; it’s an internal join key.
- UI display should use player name + MLB team abbreviation + OGBA team name/code.
