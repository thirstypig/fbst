// client/src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";

// Pages
import TeamsPage from "./pages/Teams";
import TeamPage from "./pages/Team";
import StandingsPage from "./pages/Standings";
import SeasonStandingsPage from "./pages/SeasonStandings";
import PlayersPage from "./pages/Players";
import PeriodsPage from "./pages/Periods";
import AuctionValuesPage from "./pages/AuctionValues";

function App() {
  return (
    <Routes>
      {/* Shared app chrome (sidebar, header, Outlet) */}
      <Route element={<Layout />}>
        {/* Default route: send "/" to current period standings */}
        <Route index element={<Navigate to="/standings" replace />} />

        {/* Standings */}
        <Route path="/standings" element={<StandingsPage />} />
        {/* Preferred clean URL for season standings */}
        <Route path="/season" element={<SeasonStandingsPage />} />
        {/* Backwards-compat: still accept /standings/season */}
        <Route
          path="/standings/season"
          element={<Navigate to="/season" replace />}
        />

        {/* Teams */}
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/teams/:teamId" element={<TeamPage />} />

        {/* Players (pool / free agents view) */}
        <Route path="/players" element={<PlayersPage />} />

        {/* Periods (internal/debug tooling for now) */}
        <Route path="/periods" element={<PeriodsPage />} />

        {/* Auction – both URLs hit the same page for now */}
        <Route path="/auction" element={<AuctionValuesPage />} />
        <Route path="/auction-values" element={<AuctionValuesPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/standings" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
