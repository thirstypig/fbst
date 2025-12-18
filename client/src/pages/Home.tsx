// client/src/pages/Home.tsx
//
// FBST_CHANGELOG
// - 2025-12-14
//   - Remove socket.io-client (was calling localhost:5000 and causing CORS/403 spam).

import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="px-10 py-8 text-slate-100">
      <h1 className="text-3xl font-semibold">Home</h1>
      <p className="mt-2 text-sm text-slate-400">
        Use the sidebar to navigate. (Removed legacy socket.io connection.)
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="rounded-lg bg-slate-800/60 px-4 py-2 text-sm hover:bg-slate-800" to="/players">
          Players
        </Link>
        <Link className="rounded-lg bg-slate-800/60 px-4 py-2 text-sm hover:bg-slate-800" to="/teams">
          Teams
        </Link>
        <Link className="rounded-lg bg-slate-800/60 px-4 py-2 text-sm hover:bg-slate-800" to="/auction">
          Auction
        </Link>
      </div>
    </div>
  );
}
