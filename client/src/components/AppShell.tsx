// client/src/components/AppShell.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { API_BASE, getLeagues, getMe, type LeagueListItem } from "../api";
import GoogleSignInButton from "./GoogleSignInButton";

function isActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(to + "/");
}

async function postLogout(): Promise<void> {
  // Must be POST; cookie is HttpOnly so server must clear it.
  await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  }).catch(() => {
    // even if this fails, we still force client redirect
  });
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();

  const [me, setMe] = useState<any>(null);
  const [leagues, setLeagues] = useState<LeagueListItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function refreshAuth() {
    setLoading(true);
    try {
      const meResp = await getMe().catch(() => ({ user: null }));
      setMe(meResp.user ?? null);

      if (meResp.user) {
        const leaguesResp = await getLeagues().catch(() => ({ leagues: [] }));
        setLeagues(leaguesResp.leagues ?? []);
      } else {
        setLeagues([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commissionerLeagueId = useMemo(() => {
    const isAdmin = Boolean(me?.isAdmin);

    // Prefer an explicit commissioner membership
    const commissioner = (leagues ?? []).find((l: any) => l?.access?.type === "MEMBER" && l?.access?.role === "COMMISSIONER");
    if (commissioner) return commissioner.id;

    // If admin, allow shortcut to the first league (optional convenience)
    if (isAdmin && (leagues?.length ?? 0) > 0) return leagues[0].id;

    return null;
  }, [leagues, me]);

  const NAV: Array<{ to: string; label: string; show?: boolean }> = [
    { to: "/", label: "Home", show: true },
    { to: "/period", label: "Period", show: true },
    { to: "/season", label: "Season", show: true },
    { to: "/players", label: "Players", show: true },
    { to: "/leagues", label: "Leagues", show: true },
    {
      to: commissionerLeagueId ? `/commissioner/${commissionerLeagueId}` : "/leagues",
      label: "Commissioner",
      show: Boolean(commissionerLeagueId),
    },
    { to: "/admin", label: "Admin", show: Boolean(me?.isAdmin) },
  ];

  async function onLogout() {
    await postLogout();
    // Reset local UI state immediately
    setMe(null);
    setLeagues([]);
    // Go back to client home (never server origin)
    nav("/", { replace: true });
    // Optional: hard refresh to clear any cached data tied to auth
    // window.location.assign("/");
  }

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
            {NAV.filter((x) => x.show).map((item) => {
              const active = isActive(loc.pathname, item.to);
              return (
                <Link
                  key={item.label}
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
        <div className="flex-1">
          {/* Top header */}
          <header className="flex items-center justify-end gap-3 border-b border-white/10 px-6 py-4">
            {loading ? (
              <div className="text-xs text-white/50">Loading…</div>
            ) : me ? (
              <>
                <div className="flex items-center gap-3">
                  {me.avatarUrl ? (
                    <img src={me.avatarUrl} alt={me.name ?? me.email} className="h-8 w-8 rounded-full" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-white/10" />
                  )}

                  <div className="leading-tight">
                    <div className="text-sm text-white">{me.name ?? me.email}</div>
                    <div className="text-xs text-white/50">{me.isAdmin ? "Admin" : ""}</div>
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
                >
                  Log out
                </button>
              </>
            ) : (
              <GoogleSignInButton label="Sign in" />
            )}
          </header>

          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
