// client/src/components/AppShell.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { API_BASE, getLeagues, getMe, type LeagueListItem, type AuthUser } from "../api";
import GoogleSignInButton from "./GoogleSignInButton";
import { useTheme } from "../contexts/ThemeContext";

function isActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(to + "/");
}

async function postLogout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  }).catch(() => {});
}

type NavItem = { to: string; label: string; show?: boolean };
type NavSection = { title: string; items: NavItem[] };

export default function AppShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [me, setMe] = useState<AuthUser | null>(null);
  const [leagues, setLeagues] = useState<LeagueListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(true);

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
    const commissioner = (leagues ?? []).find((l: LeagueListItem) => l?.access?.type === "MEMBER" && l?.access?.role === "COMMISSIONER");
    if (commissioner) return commissioner.id;
    if (isAdmin && (leagues?.length ?? 0) > 0) return leagues[0].id;
    return null;
  }, [leagues, me]);

  const getNavIcon = (label: string) => {
    const icons: Record<string, JSX.Element> = {
      'Home': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
      'Guide': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
      'Period': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
      'Season': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
      'Players': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
      'Trades': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />,
      'Transactions': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
      'Leagues': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />,
      'Rules': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
      'Archive': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />,
      'Commissioner': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
      'Admin': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
      'Auction': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1槌4 4l2-2 4 4-2 2-4-4zM6 8l2-2 4 4-2 2-4-4z M4 16l2-2 8 8-2 2-8-8z" /> // Approximate Gavel
    };
    // Better Gavel path
    icons['Auction'] = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11l-4-4m0 0l-2 2m2-2l-2-2m2 2l2 2m-2-2l-4 4-2-2 4-4 4 4-2 2-4-4-2 2 4 4 2 2 4-4 2 2-4 4-2-2 4-4z M6 8l-2 2 4 4 2-2-4-4z" />; 
    // Wait, let's use a simpler known gavel path or money
    icons['Auction'] = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />; // Money Icon fallback

    return icons[label] || <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />;
  };

  // Grouped navigation sections
  const NAV_SECTIONS: NavSection[] = [
    {
      title: "Main",
      items: [
        { to: "/", label: "Home", show: true },
        { to: "/guide", label: "Guide", show: true },
      ],
    },
    {
      title: "Standings",
      items: [
        { to: "/period", label: "Period", show: true },
        { to: "/season", label: "Season", show: true },
      ],
    },
    {
      title: "Players & Activity",
      items: [
        { to: "/players", label: "Players", show: true },
        { to: "/trades", label: "Trades", show: true },
        { to: "/transactions", label: "Transactions", show: true },
        { to: "/auction", label: "Auction", show: true },
      ],
    },
    {
      title: "League",
      items: [
        { to: "/leagues", label: "Leagues", show: true },
        { to: "/rules", label: "Rules", show: true },
        { to: "/archive", label: "Archive", show: true },
      ],
    },
    {
      title: "Admin",
      items: [
        {
          to: commissionerLeagueId ? `/commissioner/${commissionerLeagueId}` : "/leagues",
          label: "Commissioner",
          show: Boolean(commissionerLeagueId),
        },
        { to: "/admin", label: "Admin", show: Boolean(me?.isAdmin) },
      ],
    },
  ];

  async function onLogout() {
    await postLogout();
    setMe(null);
    setLeagues([]);
    nav("/", { replace: true });
  }

  const renderNavLink = (item: NavItem) => {
    const active = isActive(loc.pathname, item.to);
    return (
      <Link
        key={item.label}
        to={item.to}
        onClick={() => {
          if (window.innerWidth < 1024) {
            setSidebarOpen(false);
          }
        }}
        className={[
          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
          active 
            ? theme === 'dark' ? "bg-white/10 text-white" : "bg-blue-100 text-blue-900"
            : theme === 'dark' ? "text-white/70 hover:bg-white/5 hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
          !sidebarOpen && "justify-center"
        ].join(" ")}
        title={!sidebarOpen ? item.label : undefined}
      >
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {getNavIcon(item.label)}
        </svg>
        {sidebarOpen && <span>{item.label}</span>}
      </Link>
    );
  };

  // Sidebar Resizing Logic
  const [sidebarWidth, setSidebarWidth] = useState(200); // reduced from w-64 (256px) to ~200px
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(160, Math.min(400, e.clientX)); // Min 160px, Max 400px
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-slate-50' : 'bg-gray-50 text-gray-900'}`}>
      <div className="flex">
        {/* Mobile Overlay */}
        {sidebarOpen && sidebarVisible && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside 
            className={`
              fixed lg:sticky top-0 h-screen z-50
              shrink-0 border-r transition-all duration-75 relative group
              ${theme === 'dark' ? 'bg-slate-950 border-white/10' : 'bg-white border-gray-200'}
              ${!sidebarVisible ? 'w-0 overflow-hidden border-none' : ''}
              ${!sidebarOpen && sidebarVisible ? 'lg:w-16 -translate-x-full lg:translate-x-0' : ''}
            `}
            style={sidebarOpen && sidebarVisible ? { width: sidebarWidth } : {}}
        >
            {/* Drag Handle */}
            {sidebarOpen && sidebarVisible && (
                <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 z-50 transition-colors"
                    onMouseDown={() => setIsResizing(true)}
                />
            )}
          <div className="px-5 py-6 h-full flex flex-col min-w-[64px]">
            {/* Header with toggle and theme */}
            <div className="mb-6 flex items-center justify-between">
              {sidebarOpen && (
                <div>
                  <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>FBST</div>
                  <div className={`text-xs ${theme === 'dark' ? 'text-white/50' : 'text-gray-500'}`}>Fantasy Baseball Stats</div>
                </div>
              )}
              <div className={`flex items-center gap-1 ${!sidebarOpen && 'flex-col mx-auto'}`}>
                {/* Theme toggle - moved to header */}
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark' 
                      ? 'hover:bg-white/10 text-white/70 hover:text-white' 
                      : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                  }`}
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                {/* Hamburger toggle */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark' 
                      ? 'hover:bg-white/10 text-white' 
                      : 'hover:bg-gray-100 text-gray-900'
                  }`}
                  title={sidebarOpen ? 'Collapse menu' : 'Expand menu'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                {/* Full Hide Button */}
                <button
                   onClick={() => setSidebarVisible(false)}
                   className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark' ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-400'
                   }`}
                   title="Hide Sidebar"
                >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                   </svg>
                </button>
              </div>
            </div>

            {/* Navigation Sections */}
            <nav className="flex-1 overflow-y-auto space-y-4">
              {NAV_SECTIONS.map((section) => {
                const visibleItems = section.items.filter((item) => item.show);
                if (visibleItems.length === 0) return null;
                
                return (
                  <div key={section.title}>
                    {sidebarOpen && (
                      <div className={`mb-2 text-xs font-medium uppercase tracking-wider ${
                        theme === 'dark' ? 'text-white/40' : 'text-gray-400'
                      }`}>
                        {section.title}
                      </div>
                    )}
                    <div className="space-y-1">
                      {visibleItems.map(renderNavLink)}
                    </div>
                  </div>
                );
              })}
            </nav>

            {/* User Profile Footer */}
            <div className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
              {loading ? (
                <div className={`text-xs text-center ${theme === 'dark' ? 'text-white/50' : 'text-gray-500'}`}>
                  Loading…
                </div>
              ) : me ? (
                <div className={`flex items-center gap-2 ${!sidebarOpen && 'flex-col'}`}>
                  {/* User avatar */}
                  {me.avatarUrl ? (
                    <img src={me.avatarUrl} alt={me.name ?? me.email} className="h-8 w-8 rounded-full flex-shrink-0" />
                  ) : (
                    <div className={`h-8 w-8 rounded-full flex-shrink-0 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`} />
                  )}
                  
                  {sidebarOpen && (
                    <>
                      {/* User name */}
                      <div className="leading-tight min-w-0 flex-1">
                        <div className={`text-[10px] mb-0.5 font-medium ${theme === 'dark' ? 'text-white/40' : 'text-gray-400'}`}>
                          {new Date().toISOString().split('T')[0]}
                        </div>
                        <div className={`text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {me.name ?? me.email}
                        </div>
                        {me.isAdmin && (
                          <div className={`text-xs ${theme === 'dark' ? 'text-white/50' : 'text-gray-500'}`}>Admin</div>
                        )}
                      </div>
                      
                      {/* Small logout button */}
                      <button
                        onClick={onLogout}
                        className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                          theme === 'dark' 
                            ? 'hover:bg-white/10 text-white/50 hover:text-white' 
                            : 'hover:bg-gray-100 text-gray-400 hover:text-gray-900'
                        }`}
                        title="Logout"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </button>
                    </>
                  )}
                  
                  {/* Collapsed state: just logout icon */}
                  {!sidebarOpen && (
                    <button
                      onClick={onLogout}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === 'dark' 
                          ? 'hover:bg-white/10 text-white/70 hover:text-white' 
                          : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                      }`}
                      title="Logout"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                  )}
                </div>
              ) : (
                <div className={`${!sidebarOpen && 'flex justify-center'}`}>
                  {sidebarOpen ? (
                    <GoogleSignInButton />
                  ) : (
                    <button
                      onClick={() => nav('/login')}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === 'dark' 
                          ? 'hover:bg-white/10 text-white/70 hover:text-white' 
                          : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                      }`}
                      title="Sign in"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Top header - simplified, mobile only */}
          <header className={`sticky top-0 z-30 flex items-center justify-between gap-3 border-b px-4 lg:px-6 py-4 lg:hidden ${
            theme === 'dark' ? 'border-white/10 bg-slate-950' : 'border-gray-200 bg-white'
          }`}>
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className={`p-2 rounded-lg ${
                theme === 'dark' ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-900'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex-1" /> {/* Spacer */}
            
            {/* Theme toggle for mobile */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' 
                  ? 'hover:bg-white/10 text-white' 
                  : 'hover:bg-gray-100 text-gray-900'
              }`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </header>

          {/* Page content */}
          <main className="flex-1 p-4 sm:p-6 relative">
            {/* Restore Sidebar Button (Floating) */}
            {!sidebarVisible && (
              <button
                onClick={() => setSidebarVisible(true)}
                className={`fixed top-4 left-4 z-50 p-2 rounded-lg shadow-lg border transition-all ${
                  theme === 'dark' 
                    ? 'bg-slate-900 border-white/10 text-white hover:bg-slate-800' 
                    : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50'
                }`}
                title="Show Sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            )}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
