// client/src/components/AppShell.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/period", label: "Period" },
  { to: "/season", label: "Season" },
  { to: "/teams", label: "Teams" },
  { to: "/players", label: "Players" },
] as const;

function isActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(to + "/");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-white/10 px-5 py-6">
          <div className="mb-6">
            <div className="text-lg font-semibold">FBST</div>
            <div className="text-xs text-white/50">Fantasy Baseball Stat Tool</div>
          </div>

          <nav className="space-y-1">
            {NAV.map((item) => {
              const active = isActive(loc.pathname, item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={[
                    "block rounded-xl px-3 py-2 text-sm transition-colors",
                    active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
