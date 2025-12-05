// client/src/components/NavBar.tsx
import { NavLink } from "react-router-dom";

const baseLinkClasses =
  "block px-4 py-2 rounded-md text-sm font-medium transition-colors";
const activeClasses = "bg-slate-800 text-white";
const inactiveClasses = "text-slate-300 hover:bg-slate-800 hover:text-white";

function LinkItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${baseLinkClasses} ${isActive ? activeClasses : inactiveClasses}`
      }
    >
      {label}
    </NavLink>
  );
}

export default function NavBar() {
  return (
    <aside className="w-64 bg-slate-950 text-slate-100 flex flex-col border-r border-slate-800">
      <div className="px-4 py-4 border-b border-slate-800">
        <h1 className="text-lg font-semibold tracking-tight">FBST · OGBA</h1>
        <p className="text-xs text-slate-400">Fantasy Baseball Stat Tool</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto text-sm">
        {/* Standings section */}
        <div>
          <div className="px-2 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Standings
          </div>
          <div className="space-y-1">
            <LinkItem to="/standings" label="Current Period" />
            <LinkItem to="/season" label="Season Totals" />
          </div>
        </div>

        {/* Teams / Players */}
        <div>
          <div className="px-2 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            League
          </div>
          <div className="space-y-1">
            <LinkItem to="/teams" label="Teams" />
            <LinkItem to="/players" label="Players Pool" />
          </div>
        </div>

        {/* Auction */}
        <div>
          <div className="px-2 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Auction
          </div>
          <div className="space-y-1">
            <LinkItem to="/auction" label="Auction Values" />
            {/* Later you can add a live "Auction Room" route */}
          </div>
        </div>

        {/* Utilities / internal */}
        <div>
          <div className="px-2 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Tools
          </div>
          <div className="space-y-1">
            <LinkItem to="/periods" label="Periods (debug)" />
          </div>
        </div>
      </nav>
    </aside>
  );
}
