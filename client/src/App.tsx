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

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/period" element={<Period />} />
        <Route path="/season" element={<Season />} />

        <Route path="/teams/:teamCode" element={<Team />} />

        <Route path="/players" element={<Players />} />

        <Route path="/login" element={<Login />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
