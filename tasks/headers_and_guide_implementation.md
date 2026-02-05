# Content Update Summary

## UI Standardization
The Header UI has been unified across the application using the `PageHeader` component.

### Files Updated
- `client/src/components/ui/PageHeader.tsx`: Updated to accept `ReactNode` and `className` for flexibility.
- `client/src/pages/Home.tsx`
- `client/src/pages/Teams.tsx`
- `client/src/pages/Standings.tsx`
- `client/src/pages/CategoryStandings.tsx`
- `client/src/pages/Commissioner.tsx`
- `client/src/pages/TradesPage.tsx`
- `client/src/pages/TransactionsPage.tsx`
- `client/src/components/auction/AuctionLayout.tsx`

## Feature Implementation: Guide Page
A new Guide page has been implemented to assist users.

### New Components
- `client/src/pages/Guide.tsx`: Contains league rules, scoring breakdown, and platform feature overview.

### Routing Updates
- `client/src/App.tsx`: Added `/guide` route.
- `client/src/components/AppShell.tsx`: Updated sidebar navigation to link to "Guide".

## Fixes
- Resolved merge conflicts in `TransactionsPage.tsx`.
- Removed duplicate imports in `Commissioner.tsx`.
