import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";

const navItems = [
  { to: "/standings", label: "Period" },
  { to: "/season", label: "Season" },
  { to: "/teams", label: "Teams" },
  { to: "/players", label: "Players" },
  { to: "/auction", label: "Auction" },
];

function Layout() {
  const [isLight, setIsLight] = useState(false);

  const toggleTheme = () => {
    setIsLight((prev) => !prev);
  };

  const shellBg = isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100";
  const sidebarBg = isLight
    ? "bg-slate-100 border-slate-200"
    : "bg-slate-950/95 border-slate-800";
  const mainBg = isLight ? "bg-slate-50" : "bg-slate-950";
  const headerBorder = isLight ? "border-slate-200" : "border-slate-800";

  return (
    <div className={`flex min-h-screen ${shellBg}`}>
      {/* Sidebar */}
      <aside className={`flex w-56 flex-col border-r ${sidebarBg}`}>
        <div className="border-b border-slate-800/60 px-5 py-4">
          <div className="text-lg font-semibold tracking-wide">FBST</div>
          <div className="text-xs text-slate-500">
            Fantasy Baseball Stat Tool
          </div>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "rounded-md px-3 py-2 text-sm font-medium text-left",
                  isActive
                    ? isLight
                      ? "bg-slate-900 text-slate-50"
                      : "bg-slate-200 text-slate-900"
                    : isLight
                    ? "text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                    : "text-slate-300 hover:bg-slate-800 hover:text-slate-50",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
      </nav>

      <div className="px-5 py-4 text-[10px] text-slate-600 border-t border-slate-800/30">
        v. {__COMMIT_HASH__}
      </div>
      </aside>

      {/* Main content */}
      <main className={`flex flex-1 flex-col ${mainBg}`}>
        {/* Top bar */}
        <header
          className={`flex items-center justify-between border-b ${headerBorder} px-8 py-4`}
        >
          <div className="text-sm font-medium text-slate-500">
            OGBA 2026 – Fantasy Baseball Stat Tool
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={isLight}
            className="rounded-md border border-slate-400 bg-slate-100 px-3 py-1 text-xs text-slate-800 hover:bg-slate-200"
          >
            {isLight ? "Dark mode" : "Light mode"}
          </button>
        </header>

        {/* Routed page body */}
        <section className="flex-1 px-8 py-6">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default Layout;
