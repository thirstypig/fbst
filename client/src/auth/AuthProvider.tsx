// client/src/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE } from "../api";

type User = {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  isAdmin: boolean;
  memberships: Array<{
    leagueId: string;
    role: "COMMISSIONER" | "OWNER" | "VIEWER";
    league?: {
      id: string;
      name: string;
      publicSlug: string;
      isPublic: boolean;
      seasonYear?: number | null;
    };
  }>;
};

type MeResponse = {
  user: User | null;
};

type AuthCtx = {
  me: MeResponse;
  user: User | null; // convenience alias for me.user
  loading: boolean;
  refresh: () => Promise<void>;

  // kept for compatibility; now it just redirects
  loginWithGoogleCredential: (_credential: string) => Promise<void>;

  logout: () => Promise<void>;
  isAdmin: boolean;
  isCommissioner: (leagueId: string) => boolean;
  isOwner: (leagueId: string) => boolean;
};

const Ctx = createContext<AuthCtx | null>(null);

async function fetchMe(): Promise<MeResponse> {
  const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to load /auth/me");
  return { user: data?.user ?? null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeResponse>({ user: null });
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const data = await fetchMe();
    setMe(data);
  }

  // Redirect-based OAuth (server handles the whole flow + cookie)
  async function loginWithGoogleCredential(_credential: string) {
    window.location.href = `${API_BASE}/auth/google`;
  }

  async function logout() {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
    } finally {
      setMe({ user: null });
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchMe();
        if (mounted) setMe(data);
      } catch {
        if (mounted) setMe({ user: null });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const isAdmin = Boolean(me.user?.isAdmin);

  const api = useMemo<AuthCtx>(
    () => ({
      me,
      user: me.user,
      loading,
      refresh,
      loginWithGoogleCredential,
      logout,
      isAdmin,
      isCommissioner: (leagueId: string) =>
        isAdmin || (me.user?.memberships || []).some((m) => String(m.leagueId) === String(leagueId) && m.role === "COMMISSIONER"),
      isOwner: (leagueId: string) =>
        isAdmin ||
        (me.user?.memberships || []).some((m) => String(m.leagueId) === String(leagueId) && (m.role === "OWNER" || m.role === "COMMISSIONER")),
    }),
    [me, loading, isAdmin]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
