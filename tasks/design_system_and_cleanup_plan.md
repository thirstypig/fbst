# Plan: Design System, Cleanup & Table Standardization

## 1. Cleanup Media & Artifacts
- **Objective**: Remove unused files and directories to keep the project clean.
- **Actions**:
  - Delete `client/src/api.ts.bak` (Unused backup).
  - Delete `client/FBST` (Empty/misplaced directory).
  - Verify `client/src/assets` only contains used icons.

## 2. Task Tracking Updates
- **Objective**: Ensure accurate timestamps in `task.md`.
- **Correction**: The previous update used `02:50` (future time). Current time is ~`01:25` PST.
- **Action**: Update all recent timestamps in `task.md` to `2026-01-28 01:25` (PST) and confirm to user.

## 3. Design System Implementation
- **Goal**: Unified Headers and Subtitles.
- **Component**: Create `PageHeader.tsx` in `client/src/components/ui/`.
- **Specifications**:
  - **Container**: Flex, Center justified.
  - **Title**: `text-3xl`, `font-bold`, `text-[var(--fbst-text-heading)]`, `font-sans`.
  - **Subtitle**: `text-sm`, `text-[var(--fbst-text-muted)]`, `mt-2`.
  - **Color System**: leveraged from `index.css` Semantic Variables.

## 4. Table Standardization Rules
- **Rule**:
  - **Player Column** (First column): Left Justified (`text-left`, `pl-4`).
  - **All Other Columns**: Center Justified (`text-center`).
  - **Headers**: Match column alignment.
- **Target Files**:
  - `client/src/pages/Players.tsx`: Main Players table.
  - `client/src/pages/ArchivePage.tsx`: Historical stats & draft tables.
  - `client/src/components/StatsTables.tsx`: Generic stat tables (used in Player Detail).
  - `client/src/components/AddDropTab.tsx`: Transaction pool.
  - `client/src/components/auction/PlayerPoolTab.tsx`: Auction pool.
  - `client/src/components/RosterGrid.tsx`: Team rosters.

## 5. Execution Steps
1.  **Cleanup**: Run delete commands.
2.  **Fix Tasks**: Edit `task.md`.
3.  **Create Component**: `PageHeader.tsx`.
4.  **Refactor Pages**: Replace inline headers with `PageHeader` and apply table classes.
5.  **Verify**: Check UI and build.
