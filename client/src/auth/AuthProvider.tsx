// client/src/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE } from "../api";

type User = {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  isAdmin: boolean;
};

type MeResponse = {
  user: User | null;
  // We will wire real memberships later; keep the shape stable now.
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

type AuthCtx = {
  me: MeResponse;
  loading: boolean;
  refresh: () => Promise<void>;
  loginWithGoogleCredential: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isCommissioner: (leagueId: string) => boolean;
  isOwner: (leagueId: string) => boolean;
};

const Ctx = createContext<AuthCtx | null>(null);

async function fetchMe(): Promise<MeResponse> {
  const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to load /auth/me");

  // server returns { user }, not memberships (yet)
  return { user: data?.user ?? null, memberships: [] };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeResponse>({ user: null, memberships: [] });
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const data = await fetchMe();
    setMe(data);
  }

  async function loginWithGoogleCredential(credential: string) {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ credential }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Sign-in failed");

    // server returns { ok, user }
    setMe({ user: data?.user ?? null, memberships: [] });
  }

  async function logout() {
    const res = await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
    // even if it fails, nuke local state
    setMe({ user: null, memberships: [] });
    if (!res.ok) return;
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchMe();
        if (mounted) setMe(data);
      } catch {
        if (mounted) setMe({ user: null, memberships: [] });
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
      loading,
      refresh,
      loginWithGoogleCredential,
      logout,
      isAdmin,
      isCommissioner: (leagueId: string) =>
        isAdmin || me.memberships.some((m) => m.leagueId === leagueId && m.role === "COMMISSIONER"),
      isOwner: (leagueId: string) =>
        isAdmin ||
        me.memberships.some((m) => m.leagueId === leagueId && (m.role === "OWNER" || m.role === "COMMISSIONER")),
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
