// client/src/App.tsx
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "./components/AppShell";

import Home from "./pages/Home";
import Period from "./pages/Period";
import Season from "./pages/Season";
import Team from "./pages/Team";
import Players from "./pages/Players";
import Login from "./pages/Login";

import Leagues from "./pages/Leagues";
import Commissioner from "./pages/Commissioner";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/period" element={<Period />} />
        <Route path="/season" element={<Season />} />

        <Route path="/teams/:teamCode" element={<Team />} />
        <Route path="/players" element={<Players />} />

        {/* Auth / utility */}
        <Route path="/login" element={<Login />} />

        {/* New: league + commissioner/admin */}
        <Route path="/leagues" element={<Leagues />} />
        <Route path="/commissioner/:leagueId" element={<Commissioner />} />
        <Route path="/admin" element={<Admin />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
