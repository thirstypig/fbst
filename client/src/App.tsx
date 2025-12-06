// client/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeContext";
import AppShell from "./components/AppShell";

import TeamsPage from "./pages/Teams";
import PlayersPage from "./pages/Players";
import AuctionValuesPage from "./pages/AuctionValues";
import PeriodPage from "./pages/Period";
import SeasonPage from "./pages/Season";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Navigate to="/teams" replace />} />
            <Route path="/period" element={<PeriodPage />} />
            <Route path="/season" element={<SeasonPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/players" element={<PlayersPage />} />
            <Route path="/auction" element={<AuctionValuesPage />} />
            <Route path="*" element={<Navigate to="/teams" replace />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
