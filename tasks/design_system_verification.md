# Verification: Design System & Cleanup

## Scope
1.  **Cleanup**: Remove `client/src/api.ts.bak`.
2.  **Task Timestamps**: Update `task.md` to use correct PST timestamps.
3.  **Design System**:
    - Create `PageHeader` component (Uniform titles/subtitles).
    - Apply `PageHeader` to `Players` and `Archive` pages.
4.  **Table Standardization**:
    - **Rule**: Player Column (Left), All Other Columns (Center).
    - Applied too: `Players.tsx`, `ArchivePage.tsx`, `StatsTables.tsx`, `PlayerPoolTab.tsx`, `AddDropTab.tsx`.

## Verification Results

### 1. Build Check
Command: `npm run build`
Result: **Success**
```bash
> fbst-client@0.0.0 build
> tsc && vite build
..
✓ built in 1.71s
```

### 2. File Cleanup
- `client/src/api.ts.bak`: Deleted.
- `client/FBST`: Removed (if present).

### 3. UI Check (Manual)
- **Archive Page**: Should show centered "Historical Archive" header. Tables should have centered stats (R, HR, RBI, etc.).
- **Players Page**: Should show centered "Players" header. Table columns (except Player) should be centered.
- **Transactions Page**: Available players table stats centered.
- **Auction Pool**: Value and Stats centered.

### 4. Code Quality
- Replaced inline header styles with `<PageHeader />`.
- Removed duplicate imports in `ArchivePage.tsx`.

## Next Steps
- Proceed to Guide Page implementation.
