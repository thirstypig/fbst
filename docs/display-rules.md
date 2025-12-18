<!-- client/docs/display-rules.md -->

# FBST Display Rules (Teams & Players)

Last updated: 2025-12-11

## Team naming

- **Fantasy (OGBA) teams**
  - In all TABLES: use 3-letter team code (DDG, DLC, DMK, …).
  - In headings, modals, and narrative copy: use full team name
    (Dodger Dawgs, Demolition Lumber Co., Diamond Kings, …).

- **MLB teams**
  - In all TABLES: use 3-letter MLB abbreviation (LAD, SD, SF, …).
  - In headings, modals, and narrative copy: use full MLB team name
    (Los Angeles Dodgers, San Diego Padres, San Francisco Giants, …).

Implementation:

- Helpers are centralised in `client/src/lib/playerDisplay.ts`:
  - `getOgbaTeamName(code)` – fantasy team full name
  - `getMlbTeamAbbr(player)` – 3-letter MLB code for tables
  - `getMlbTeamName(player)` – full MLB team name for modals/headings
