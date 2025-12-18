// client/src/components/AppShell.tsx
//
// FBST_CHANGELOG
// - 2025-12-14
//   - Do NOT render <BrowserRouter> here.
//   - Routes must match files in client/src/pages.

import React from "react";
import { NavLink, Routes, Route, Navigate } from "react-router-dom";

import Home from "../pages/Home";
import Period from "../pages/Period";
import Season from "../pages/Season";
import Teams from "../pages/Teams";
import Team from "../pages/Team";
import Players from "../pages/Players";
import Auction from "../pages/Auction";

function SideLink(props: { to: string; label: string }) {
  return (
    <NavLink
      to={props.to}
      className={({ isActive }) =>
        [
          "block rounded-xl px-4 py-3 text-sm transition",
          isActive
            ? "bg-slate-700/70 text-slate-50"
            : "text-slate-200 hover:bg-slate-800/60",
        ].join(" ")
      }
      end
    >
      {props.label}
    </NavLink>
  );
}

export default function AppShell() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <aside className="w-64 border-r border-slate-800/60 bg-slate-950/60 px-4 py-6">
          <div className="mb-6">
            <div className="text-lg font-semibold tracking-wide">FBST</div>
            <div className="text-xs text-slate-400">Fantasy Baseball Stat Tool</div>
          </div>

          <nav className="space-y-2">
            <SideLink to="/period" label="Period" />
            <SideLink to="/season" label="Season" />
            <SideLink to="/teams" label="Teams" />
            <SideLink to="/players" label="Players" />
            <SideLink to="/auction" label="Auction" />
            <SideLink to="/home" label="Home" />
          </nav>
        </aside>

        <main className="flex-1 px-6 py-6">
          <Routes>
            <Route path="/" element={<Navigate to="/players" replace />} />

            <Route path="/home" element={<Home />} />
            <Route path="/period" element={<Period />} />
            <Route path="/season" element={<Season />} />

            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:teamCode" element={<Team />} />

            <Route path="/players" element={<Players />} />
            <Route path="/auction" element={<Auction />} />

            <Route path="*" element={<Navigate to="/players" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
