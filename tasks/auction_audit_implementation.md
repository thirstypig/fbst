# specific-auction-audit-implementation Implementation Plan

## User Review Required

> [!IMPORTANT]
> This implementation introduces a LIVE auction system. The server now holds authoritative state in memory. 
> To test, open multiple browser windows. One acts as "Commissioner" (or just first team) to Nominate. The others can Bid.
> Note: Server state is **in-memory** and will reset on server restart.

- **Files Processed**:
    - `server/src/routes/auction.ts`: Full implementation of auction logic.
    - `server/src/index.ts`: Mounted `/api/auction`.
    - `client/src/hooks/useAuctionState.ts`: New hook for polling/actions.
    - `client/src/components/auction/AuctionStage.tsx`: Refactored for dumb-component rendering of server state.
    - `client/src/pages/Auction.tsx`: Integration of hook and handlers.

## Proposed Changes

### Active Auction Engine
- The auction runs on a polling mechanism (1 second interval).
- State includes `timer`, `currentBid`, `highBidder`.
- Endpoints `nominate` and `bid` enforce rules (budget, turn, order).

### Frontend "Multiplayer"
- All connected clients see the same `timeLeft` and `currentBid`.
- Visual feedback for "It's your turn" or "You are high bidder".

## Verification Plan

### Automated Tests
- `npm run build` (Client) -> **Passed** for Auction components (unrelated errors remain in other files).
- `curl http://localhost:4000/api/auction/state` -> **Verified** JSON response.

### Manual Verification Steps
1. **Start Server**: Ensure server is running (`npm start` in server).
2. **Open Client**: Navigate to `/auction`.
3. **Init**: The auction should auto-initialize if league data is found.
4. **Nominate**: Click a player in "Player Pool". Verify "Waiting for Nomination" screen changes to "Bidding" screen.
5. **Bid**: Click "Bid". Verify amount increases.
6. **Wait**: let timer run down. (Note: Finish logic writes to DB, check console for success).
