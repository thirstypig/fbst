// client/src/App.tsx
import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AppShell from "./AppShell";

import Home from "./pages/Home";
import Period from "./pages/Period";
import Season from "./pages/Season";
import Teams from "./pages/Teams";
import Team from "./pages/Team";
import Players from "./pages/Players";

// NOTE: Auction intentionally removed for MVP simplicity.

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Navigate to="/" replace />} />

          <Route path="/period" element={<Period />} />
          <Route path="/season" element={<Season />} />

          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/:teamCode" element={<Team />} />

          <Route path="/players" element={<Players />} />

          {/* no /auction route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
