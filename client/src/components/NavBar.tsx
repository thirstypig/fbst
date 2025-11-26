import React from 'react';
import { NavLink } from 'react-router-dom';

const NavBar = () => {
  return (
    <nav className="w-56 bg-slate-900 text-white flex flex-col p-4 space-y-4">
      <div className="text-xl font-bold">FBST</div>

      <NavLink
        to="/standings"
        className={({ isActive }) =>
          `p-2 rounded ${isActive ? 'bg-slate-700' : 'hover:bg-slate-800'}`
        }
      >
        Standings
      </NavLink>

      <NavLink
        to="/auction"
        className={({ isActive }) =>
          `p-2 rounded ${isActive ? 'bg-slate-700' : 'hover:bg-slate-800'}`
        }
      >
        Auction
      </NavLink>

      <NavLink
        to="/teams/1"
        className={({ isActive }) =>
          `p-2 rounded ${isActive ? 'bg-slate-700' : 'hover:bg-slate-800'}`
        }
      >
        Teams
      </NavLink>
    </nav>
  );
};

export default NavBar;
