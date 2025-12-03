// client/src/components/NavBar.tsx
import { NavLink } from "react-router-dom";

const linkBase =
  "px-3 py-2 rounded text-sm font-medium border border-transparent";
const activeClasses = "bg-blue-600 text-white";
const inactiveClasses = "text-gray-200 hover:bg-blue-700 hover:text-white";

function NavBar() {
  return (
    <nav className="bg-blue-800 text-white">
      <div className="mx-auto max-w-6xl px-4 py-2 flex gap-3">
        <NavLink
          to="/standings"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? activeClasses : inactiveClasses}`
          }
        >
          Period
        </NavLink>

        <NavLink
          to="/standings/season"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? activeClasses : inactiveClasses}`
          }
        >
          Season
        </NavLink>

        <NavLink
          to="/teams"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? activeClasses : inactiveClasses}`
          }
        >
          Teams
        </NavLink>

        <NavLink
          to="/auction"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? activeClasses : inactiveClasses}`
          }
        >
          Auction
        </NavLink>
      </div>
    </nav>
  );
}

export default NavBar;
