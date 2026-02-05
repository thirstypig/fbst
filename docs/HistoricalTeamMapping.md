# Historical MLB Stats & Team Mapping Logic

This document describes the automated logic used to map players to their correct historical MLB teams and stats within the archive.

## Core Objective

To ensure that every player record in the historical archive (Auction Draft and Period Stats) displays the correct MLB team abbreviation and statistics for the specific period it represents.

## The Recalculate Trigger

The logic is triggered via the **"Recalculate Stats & Teams"** button in the Archive Admin Panel, which calls the following endpoint:

`POST /api/archive/:year/recalculate`

For global updates across all years, use the **"Recalculate All Seasons"** button:

`POST /api/archive/recalculate-all`

## Date-Based Mapping Strategy

The mapping uses a "Point-in-Time" lookup via the MLB Stats API:

1.  **Auction Draft (Period 1)**:
    -   Uses the year's **Opening Day** as the reference date.
    -   If a player was on the Yankees on Opening Day 2024, they are mapped to `NYY` for the 2024 Auction Draft.

2.  **Period Stats (Periods 2-7)**:
    -   Uses the **Start Date** and **End Date** of the specific period for stats.
    -   Uses the **Start Date** for team context.

## Stats Recalculation Strategy

When Fetch Stats is enabled, the system performs a date-range query on the MLB Stats API:

1.  **Date Range**: Uses `startDate` and `endDate` from the `HistoricalPeriod`.
2.  **API Endpoint**: `https://statsapi.mlb.com/api/v1/people/{mlbId}/stats?stats=statsByDateRange&startDate={start}&endDate={end}&group=hitting,pitching`
3.  **Hitter Stats**: Fetches `AB`, `H`, `R`, `HR`, `RBI`, `SB`, and calculates `AVG`.
4.  **Pitcher Stats**: Fetches `W`, `SV`, `K`, `IP`, `ER`, and calculates `ERA` and `WHIP`.
5.  **Special Stats**: Fetches `GS` (Grand Slams) for hitters and `SO` (Shut Outs) for pitchers.

## Technical Implementation

The system performs the following steps for each player/period combination:

1.  **Fetch Team Abbreviations**: Loads a master list of MLB team IDs to abbreviations for the target year.
2.  **MLB API Lookup**:
    -   Teams: `https://statsapi.mlb.com/api/v1/people/{mlbId}?hydrate=currentTeam&date={referenceDate}`
    -   Stats: `https://statsapi.mlb.com/api/v1/people/{mlbId}/stats?stats=statsByDateRange...`
3.  **Data Processing**:
    -   Extracts team abbreviation.
    -   Parses hitting and pitching stat groups.
    -   Calculates derived ratios (AVG, ERA, WHIP).
4.  **Database Update**: Updates the `HistoricalPlayerStat` table with the new values.

## Edge Cases & Fail-safes

-   **Rate Limiting**: Includes a 30ms sleep between API calls to respect MLB Stats API limits.
-   **Missing MLB ID**: Only processes players who have a valid `mlbId` (obtained via "Auto-Match").
-   **Free Agents**: If the API returns no team for the target date, the field is left unchanged or set to `null` to reflect the player's status.
