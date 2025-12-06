// client/src/components/AppShell.tsx
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = [
  { to: "/period", label: "Period" },
  { to: "/season", label: "Season" },
  { to: "/teams", label: "Teams" },
  { to: "/players", label: "Players" },
  { to: "/auction", label: "Auction" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-50">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-slate-800 bg-slate-950/95">
        <div className="px-6 py-5 border-b border-slate-800">
          <div className="text-sm font-semibold tracking-[0.18em] uppercase text-slate-400">
            FBST
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Fantasy Baseball Stat Tool
          </div>
        </div>

        <nav className="mt-4 flex flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-800 text-slate-50"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-slate-50",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-3 py-4">
          <ThemeToggle />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 bg-slate-950">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
