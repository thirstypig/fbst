// client/src/App.tsx
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "./components/AppShell";

import Home from "./pages/Home";
import Period from "./pages/Period";
import Season from "./pages/Season";
import Team from "./pages/Team";
import Players from "./pages/Players";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/period" element={<Period />} />
        <Route path="/season" element={<Season />} />

        {/* keep roster detail page */}
        <Route path="/teams/:teamCode" element={<Team />} />

        <Route path="/players" element={<Players />} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
