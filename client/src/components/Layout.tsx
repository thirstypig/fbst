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
  const [isLight, setIsLight] = useState(() => {
    return !document.documentElement.classList.contains('dark');
  });

  const toggleTheme = () => {
    setIsLight((prev) => {
      const newVal = !prev;
      if (newVal) {
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
      }
      return newVal;
    });
  };

  return (
    <div className={`flex min-h-screen text-[var(--fbst-text-primary)] transition-colors duration-300`}>
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col liquid-glass border-r border-white/10 m-4 rounded-3xl overflow-hidden">
        <div className="px-6 py-8">
          <div className="text-2xl font-bold tracking-tighter text-[var(--fbst-text-heading)]">FBST</div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--fbst-text-muted)] font-bold mt-1">
            Fantasy Baseball Stat Tool
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "flex items-center px-4 py-3 text-sm font-semibold transition-all duration-200 rounded-2xl",
                  isActive
                    ? "bg-[var(--fbst-accent)] text-white shadow-lg shadow-red-500/20"
                    : "text-[var(--fbst-text-secondary)] hover:bg-white/10 hover:text-[var(--fbst-text-primary)]",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
      </nav>

      <div className="p-6 border-t border-white/10 bg-black/5">
        <div className="text-[10px] font-bold text-[var(--fbst-text-muted)] uppercase tracking-tighter">
          Version Hash
        </div>
        <div className="text-[11px] font-mono text-[var(--fbst-text-secondary)] mt-0.5">
          {__COMMIT_HASH__}
        </div>
      </div>
      </aside>

      {/* Main content wrapper with margin for fixed sidebar */}
      <div className="flex flex-1 flex-col ml-72">
        {/* Top bar */}
        <header
          className="flex h-20 items-center justify-between px-10 py-4"
        >
          <div className="text-xs font-bold uppercase tracking-widest text-[var(--fbst-text-muted)]">
            OGBA 2026 Season Dashboard
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all liquid-glass rounded-2xl hover:scale-105 active:scale-95"
          >
            {isLight ? "🌙 Dark Mode" : "☀️ Light Mode"}
          </button>
        </header>

        {/* Routed page body */}
        <section className="flex-1 px-10 pb-12">
          <Outlet />
        </section>
      </div>
    </div>
  );
}

export default Layout;
