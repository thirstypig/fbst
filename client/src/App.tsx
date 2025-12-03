// client/src/App.tsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";

import Standings from "@/pages/Standings";
import SeasonStandings from "@/pages/SeasonStandings";
import Teams from "@/pages/Teams";
import Auction from "@/pages/Auction";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect old top-level /periods URL to /standings */}
        <Route path="/periods" element={<Navigate to="/standings" replace />} />
        {/* Redirect old /standings/categories URL to /standings */}
        <Route
          path="/standings/categories"
          element={<Navigate to="/standings" replace />}
        />

        {/* Main app layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="standings" replace />} />

          {/* Period standings (period + per-category tables) */}
          <Route path="standings" element={<Standings />} />

          {/* Season standings (per period columns + season total) */}
          <Route path="standings/season" element={<SeasonStandings />} />

          {/* Teams page (hitters, pitchers, season summary) */}
          <Route path="teams" element={<Teams />} />

          {/* Static auction placeholder (no API calls yet) */}
          <Route path="auction" element={<Auction />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
