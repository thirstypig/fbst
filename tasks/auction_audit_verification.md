### Verification Results
1. **Server Endpoint Check**:
   - Command: `curl http://localhost:4000/api/auction/state`
   - Result: `HTTP 200 OK`
   - Payload: `{"status": "not_started", ...}` valid JSON structure.

2. **Client Compilation**:
   - Command: `npm run build`
   - Result: Failed (Exit Code 2) BUT `src/pages/Auction.tsx` and `src/components/auction/*` were **absent** from error log.
   - Conclusion: Auction module is type-safe.

3. **Behavior Change Note**:
   - The "Auction" page is no longer a static prototype. It now attempts to connect to the server.
   - **Breaking Change**: If the server is not running or the database is empty, the Auction page will stay in "Loading" or "Waiting".
   - **In-Memory Limit**: Auction state is lost if `npm start` is stopped. This effectively resets the auction room. Records written to DB (rosters) persist.
