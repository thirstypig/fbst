# Task Plan: Standardize Period & Season Headers

## Objectives
1.  **Standardize Period & Season Headers**: Refactor `PageHeader` to be left-aligned and implement it on `Period` and `Season` pages.
2.  **Dropdown Integration**: Move the Period dropdown into the standard `PageHeader` layout.
3.  **Visual Alignment**: Ensure all headers share the same left-justified title/subtitle + right-aligned action family.

## Steps Completed
1.  **PageHeader Refactor**: Updated `client/src/components/ui/PageHeader.tsx` to use `flex-row justify-between items-center` (with mobile responsiveness) instead of centered column.
2.  **Period Page**:
    - Replaced custom header with `PageHeader`.
    - Moved logic (title, subtitle, dropdown) into `PageHeader` props.
    - Integrated period stats metadata into the subtitle.
    - Fixed linting issues (useMemo stability, unused imports).
3.  **Season Page**:
    - Replaced centered header with `PageHeader`.
    - Added standardized subtitle.

## Outcome
- Period and Season pages now match the rest of the application's header style (Home, Teams, etc.).
- The visual hierarchy is consistent: Left = Title/Context, Right = Actions (Dropdowns).
- Build verified.
