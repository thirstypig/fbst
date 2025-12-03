// client/src/components/Layout.tsx
import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";

const sideLinkBase =
  "block w-full text-left px-3 py-2 rounded-md text-sm font-medium";
const sideActive = "bg-slate-200 text-slate-900";
const sideInactive =
  "text-slate-700 hover:bg-slate-700 hover:text-white";

const Layout = () => {
  const [isDark, setIsDark] = useState(true);

  const shellClass = isDark
    ? "min-h-screen bg-slate-950 text-slate-50 flex"
    : "min-h-screen bg-slate-100 text-slate-900 flex";

  const mainBorder = isDark ? "border-slate-800" : "border-slate-300";

  return (
    <div className={shellClass}>
      {/* Sidebar */}
      <aside
        className={`w-60 ${
          isDark ? "bg-slate-900" : "bg-slate-200"
        } border-r ${mainBorder} p-4 space-y-6`}
      >
        <div>
          <h1 className="text-2xl font-bold">FBST</h1>
          <p className="text-xs text-slate-400">
            Fantasy Baseball Stat Tool
          </p>
        </div>

        <nav className="space-y-2">
          {/* Period – exact match only */}
          <NavLink
            to="/standings"
            end
            className={({ isActive }) =>
              `${sideLinkBase} ${
                isActive ? sideActive : sideInactive
              }`
            }
          >
            Period
          </NavLink>

          <NavLink
            to="/standings/season"
            className={({ isActive }) =>
              `${sideLinkBase} ${
                isActive ? sideActive : sideInactive
              }`
            }
          >
            Season
          </NavLink>

          <NavLink
            to="/teams"
            className={({ isActive }) =>
              `${sideLinkBase} ${
                isActive ? sideActive : sideInactive
              }`
            }
          >
            Teams
          </NavLink>

          <NavLink
            to="/auction"
            className={({ isActive }) =>
              `${sideLinkBase} ${
                isActive ? sideActive : sideInactive
              }`
            }
          >
            Auction
          </NavLink>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        <header
          className={`px-6 py-3 border-b ${mainBorder} flex items-center justify-between`}
        >
          <h2 className="text-sm font-semibold">
            OGBA 2026 – Fantasy Baseball Stat Tool
          </h2>

          <button
            onClick={() => setIsDark((v) => !v)}
            className="text-xs px-3 py-1 rounded border border-slate-500 hover:bg-slate-700 hover:text-white"
          >
            {isDark ? "Light mode" : "Dark mode"}
          </button>
        </header>

        <section className="flex-1 px-6 py-4 overflow-auto">
          <Outlet />
        </section>
      </main>
    </div>
  );
};

export default Layout;
