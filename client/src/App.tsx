// client/src/App.tsx
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "./components/AppShell";
import { AuthProvider } from "./auth/AuthProvider";

import Home from "./pages/Home";
import Period from "./pages/Period";
import Season from "./pages/Season";
import Team from "./pages/Team";
import Players from "./pages/Players";
import TransactionsPage from "./pages/TransactionsPage";
import { TradesPage } from "./pages/TradesPage";
import Login from "./pages/Login";

import Leagues from "./pages/Leagues";
import Commissioner from "./pages/Commissioner";
import Admin from "./pages/Admin";
import Rules from "./pages/Rules";
import Guide from "./pages/Guide";
import ArchivePage from "./pages/ArchivePage";
import Auction from "./pages/Auction";
import KeeperSelection from "./pages/KeeperSelection";
import { ThemeProvider } from "./contexts/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/period" element={<Period />} />
            <Route path="/season" element={<Season />} />

            <Route path="/teams/:teamCode" element={<Team />} />
            <Route path="/players" element={<Players />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/trades" element={<TradesPage />} />

            {/* Auth / utility */}
            <Route path="/login" element={<Login />} />

            {/* New: league + commissioner/admin */}
            <Route path="/leagues" element={<Leagues />} />
            <Route path="/leagues/:id/keepers" element={<KeeperSelection />} />
            <Route path="/auction" element={<Auction />} />
            <Route path="/commissioner/:leagueId" element={<Commissioner />} />
            <Route path="/admin" element={<Admin />} />

            <Route path="/rules" element={<Rules />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/archive" element={<ArchivePage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </AuthProvider>
    </ThemeProvider>
  );
}
