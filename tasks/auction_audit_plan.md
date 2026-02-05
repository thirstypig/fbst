# Task Plan: specific-auction-audit-implementation

## Objective
TRANSFORM the Auction feature from a "single-player local UI prototype" into a "multi-user synchronous system" by connecting the frontend to a server-side state.

## Audit Findings
1.  **Backend Separation**: `server/src/routes/auction.ts` exists but is **NOT mounted** in `server/src/index.ts`. It is effectively dead code.
2.  **State Isolation**: `client/src/components/auction/AuctionStage.tsx` uses local `useState` for `currentBid`, `timeLeft`, and `highBidder`. This prevents any multi-user interaction.
3.  **Missing Logic**: There are no endpoints for `nominate` or `bid`. The current `auction.ts` only has `start` and `reset`.

## Implementation Plan

### Phase 1: Backend Foundation (Server)
1.  **Mount Router**: Add `auctionRouter` to `server/src/index.ts` at `/api/auction`.
2.  **Enhance Auction State**:
    -   Update `AuctionState` to include `endTime` (ISO string) for the active nomination.
    -   Update `AuctionTeam` to track `budget` and `rosterCount` authoritatively.
3.  **Implement Endpoints**:
    -   `POST /api/auction/init`: Load teams and budgets from the database (Active League).
    -   `POST /api/auction/nominate`: Accepts `playerId`, `startBid`. Sets `currentNomination` and `endTime`.
    -   `POST /api/auction/bid`: Accepts `amount`, `bidderId`. Updates `currentBid` and extends `endTime` (soft reset).
    -   `POST /api/auction/resolve`: (Or auto-resolve on state read) Finalizes the winner when time expires.
4.  **Data Persistence**: For this distinct task, we will keep the state **in-memory** (in `auction.ts` variable) as requested by the "minimal changes" heuristic, but ensure it is robust enough for a session.

### Phase 2: Frontend Integration (Client)
1.  **Polling Hook**: Create a `useAuctionState` hook in `client/src/hooks/useAuctionState.ts` that polls `/api/auction/state` every 1000ms.
2.  **AuctionStage Refactor**:
    -   Convert `AuctionStage.tsx` to a "controlled component" that renders `nominee`, `bid`, and `timer` exclusively from props (derived from server state).
    -   Wire "Bid" buttons to `POST /api/auction/bid`.
3.  **Auction Page**:
    -   Integrate `useAuctionState`.
    -   Wire `handleNominate` to `POST /api/auction/nominate`.

### Phase 3: Verification
1.  **Simulated Multiplayer**:
    -   Open Browser Tab A (Commissioner/User 1).
    -   Open Browser Tab B (User 2).
2.  **Flow**:
    -   Tab A: Start Auction. Nominate Player X.
    -   Tab B: See Player X appear. Bid $1.
    -   Tab A: See Bid increase to $1. Bid $2.
    -   Tab B: See Bid increase to $2.
    -   Wait for timer.
    -   Verify Player X is assigned to Winner.

## Risks & Assumptions
-   **Timers**: Network latency might make the timer feel "jumpy". We will sync to `endTime - now()` rather than decrementing a local counter blindly.
-   **Security**: Minimal validation on "is this user allowed to bid" for this iteration (assuming high-trust league or commissioner driven).
-   **Concurrency**: Simple in-memory locking (synchronous JS execution) is sufficient for low-frequency bidding.
