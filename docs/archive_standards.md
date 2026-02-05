# Archive Data Standards

This document outlines the requirements and validation rules for historical player data in the FBST application.

## 1. UI Display Requirements

### Separate Hitter and Pitcher Tables
Each fantasy team's roster in the **Period Stats** and **Auction Draft** tabs must be separated into two distinct tables:
- **Hitters Table**: Displays hitting-specific stats (R, HR, RBI, SB, AVG, GS).
- **Pitchers Table**: Displays pitching-specific stats (W, SV, K, ERA, WHIP, SO).

- **GS (Grand Slams)**: Must be displayed for hitters, positioned on the far right after the AVG column.
- **SO (Shut Outs)**: Must be displayed for pitchers.

### Team Codes & Display Names

The application uses **canonical team codes** (e.g., `DDG`, `DKG`, `BOH`) for data tracking. These are mapped to friendly names in `client/src/lib/ogbaTeams.ts`.

> [!IMPORTANT]
> To avoid "UNK" (Unknown) labels, ensure the source Excel header name matches one of the recognized nicknames or codes listed in Section 3.

## 2. Importer Validation Rules

The `ArchiveImportService` performs several checks during the ingestion of Excel files:

### Standardized Periods
Historical seasons are standardized to exactly **7 periods**:
- **P1 (Draft)**: Starts on MLB Opening Day and ends the day before the first date-tab.
- **P2-P7**: Successive date-labeled stats tabs.
- **P7 (Final)**: The last period always extends to the end of the season (Oct 31).

If more than 7 eligible sheets are found, only the first 7 (Draft + 6 dates) are processed.

### isPitcher Detection
To ensure correct table assignment, the importer uses multiple signals for `isPitcher` detection:
1.  **Explicit Flag**: `is_pitcher` column in CSV (True/1/P).
2.  **Pitching Stats**: If `W`, `SV`, or `IP` > 0.
3.  **Position Fallback**: If the position is one of `P`, `SP`, `RP`, `PITCHER`, or `STAFF`.

## 3. Historical Team Mappings

The `ArchiveImportService` now utilizes **aggressive normalization** (stripping all punctuation and whitespace) to match team names:

- **2004 Aliases**:
  - `BCS`: "BALCOS", "VIP", "NY Sock Exchange"
  - `BRO`: "Brothers Inc.", "Crush"
- **B.O.H.I.C.A.** -> **BOH**
- **MoneyBall** -> **MNB**
- **Foul Tip** -> **FTP**
- **Big Unit** -> **BGU**
- **The Show** -> **SHO**
- **The Black Sox** -> **BSX**
- **The Fluffers** -> **FLU**
- **Raging Sluggers** -> **RSR / RGS**
- **Diamond Kings** -> **DKD / DKG**
- **Devil Dawgs** -> **DD2 / DEV**
- **Dodger Dawgs** -> **DDD / DDG**

## 4. Recommended Workflow for Refinement

If data appears incorrect (e.g., pitchers in the hitters table or missing players):

1. **Check Source Excel**: Verify the position and stats in the original file.
2. **Re-upload**: Use the Admin Tools to re-upload the corrected file.
3. **Auto-Match**: Run the "Auto-Match Season" trigger to fetch full names and MLB IDs.
