// client/src/App.tsx
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "./components/AppShell";

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
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import Landing from "./pages/Landing";
import { useAuth } from "./auth/AuthProvider";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--lg-bg-page)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Auth routes outside of AppShell */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected routes inside AppShell */}
      <Route
        path="/*"
        element={
          user ? (
            <AppShell>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/period" element={<Period />} />
                <Route path="/season" element={<Season />} />
                <Route path="/teams/:teamCode" element={<Team />} />
                <Route path="/players" element={<Players />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/trades" element={<TradesPage />} />
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
          ) : (
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )
        }
      />
    </Routes>
  );
}
