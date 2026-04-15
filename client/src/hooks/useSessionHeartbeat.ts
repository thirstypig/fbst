import { useEffect, useRef, useCallback } from "react";
import { API_BASE, ApiError, fetchJsonApi } from "../api/base";
import { supabase } from "../lib/supabase";
import { reportError } from "../lib/errorBus";

/**
 * Session heartbeat runs during auth transitions (login, token refresh,
 * logout) where a 401 is expected and transient. Surfacing those as
 * user-facing toasts is noise — 5xx or network failures are the only
 * things worth a toast. The retry loop handles recovery silently.
 */
function isTransientAuthErr(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.status === 403);
}

const CHANNEL_NAME = "fbst-session";
const STORAGE_KEY = "fbst:sessionToken";
const HEARTBEAT_MS = 30_000;
const LEADER_PING_TIMEOUT_MS = 100;
const START_RETRY_DELAYS_MS = [1_000, 2_000, 4_000];

type BCMessage =
  | { type: "ping"; tabId: string }
  | { type: "pong"; tabId: string }
  | { type: "claim"; tabId: string }
  | { type: "token"; value: string }
  | { type: "end" };

interface UseSessionHeartbeatResult {
  endSession: () => Promise<void>;
}

/**
 * Mounts once inside AuthProvider for authenticated users. Responsibilities:
 *   1. On first mount or when no token present, POST /api/sessions/start and
 *      stash { token } in sessionStorage. Broadcast { type: "start", token }
 *      on the BroadcastChannel so other tabs reuse instead of creating a
 *      second session.
 *   2. While the tab is visible, POST /api/sessions/heartbeat every 30s.
 *      Only the "leader" tab sends heartbeats — others defer (BroadcastChannel
 *      leader election: first tab to see an empty channel claims leader).
 *   3. On `visibilitychange → hidden` for the last-visible tab, POST /end
 *      using fetch({ keepalive: true }) to preserve auth header (sendBeacon
 *      cannot carry Authorization).
 *   4. Explicit call from logout path: POST /end + clear sessionStorage +
 *      broadcast { type: "end" }.
 */
export function useSessionHeartbeat(enabled: boolean): UseSessionHeartbeatResult {
  const tokenRef = useRef<string | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const isLeaderRef = useRef<boolean>(false);
  const intervalRef = useRef<number | null>(null);
  const tabIdRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  );

  // Send an end request via fetch with keepalive so auth header is preserved.
  // Used on explicit logout AND the visibility-hidden path.
  const sendEnd = useCallback(async (reason: "logout" | "idle"): Promise<void> => {
    const token = tokenRef.current;
    if (!token) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
      await fetch(`${API_BASE}/sessions/end`, {
        method: "POST",
        headers,
        body: JSON.stringify({ token, reason }),
        credentials: "omit",
        keepalive: true,
      });
    } catch (err) {
      if (!isTransientAuthErr(err)) reportError(err, { source: "session-heartbeat" });
    }
  }, []);

  // Explicit end — used by AuthProvider.logout. Clears storage + broadcasts.
  const endSession = useCallback(async (): Promise<void> => {
    try {
      await sendEnd("logout");
    } finally {
      tokenRef.current = null;
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      try {
        channelRef.current?.postMessage({ type: "end" } satisfies BCMessage);
      } catch {
        // ignore
      }
    }
  }, [sendEnd]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let startRetryTimer: number | null = null;

    // ─── Leader election via BroadcastChannel ──────────────────────────
    // First tab pings; if no pong arrives within 100ms, claim leadership.
    // Other tabs remain followers (heartbeat runs only in the leader).
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel(CHANNEL_NAME);
      }
    } catch {
      channel = null;
    }
    channelRef.current = channel;

    const myTabId = tabIdRef.current;

    const onMessage = (ev: MessageEvent<BCMessage>) => {
      const msg = ev.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "ping") {
        // Respond so the newcomer knows a leader exists
        channel?.postMessage({ type: "pong", tabId: myTabId } satisfies BCMessage);
      } else if (msg.type === "pong") {
        // Another tab is alive — stay follower
        if (!isLeaderRef.current) {
          // already follower; ensure no interval
          stopInterval();
        }
      } else if (msg.type === "claim") {
        if (msg.tabId !== myTabId) {
          isLeaderRef.current = false;
          stopInterval();
        }
      } else if (msg.type === "token") {
        // Adopt token from existing session in another tab
        if (!tokenRef.current && typeof msg.value === "string") {
          tokenRef.current = msg.value;
          try {
            sessionStorage.setItem(STORAGE_KEY, msg.value);
          } catch {
            // ignore
          }
        }
      } else if (msg.type === "end") {
        tokenRef.current = null;
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
        stopInterval();
      }
    };

    channel?.addEventListener("message", onMessage);

    // Claim or follow
    let claimTimer: number | null = null;
    let sawPong = false;
    const pongHandler = (ev: MessageEvent<BCMessage>) => {
      if (ev.data?.type === "pong") sawPong = true;
    };
    channel?.addEventListener("message", pongHandler);
    try {
      channel?.postMessage({ type: "ping", tabId: myTabId } satisfies BCMessage);
    } catch {
      // ignore
    }

    claimTimer = window.setTimeout(() => {
      channel?.removeEventListener("message", pongHandler);
      if (sawPong) {
        isLeaderRef.current = false;
      } else {
        isLeaderRef.current = true;
        try {
          channel?.postMessage({ type: "claim", tabId: myTabId } satisfies BCMessage);
        } catch {
          // ignore
        }
      }
      if (!cancelled) bootstrap();
    }, LEADER_PING_TIMEOUT_MS);

    // ─── Heartbeat interval management ─────────────────────────────────
    function startInterval() {
      if (intervalRef.current != null) return;
      if (!isLeaderRef.current) return;
      intervalRef.current = window.setInterval(() => {
        if (document.visibilityState !== "visible") return;
        if (!isLeaderRef.current) return;
        void sendHeartbeat();
      }, HEARTBEAT_MS);
    }

    function stopInterval() {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    async function sendHeartbeat(): Promise<void> {
      const token = tokenRef.current;
      if (!token) return;
      try {
        await fetchJsonApi(`${API_BASE}/sessions/heartbeat`, {
          method: "POST",
          body: JSON.stringify({ token }),
        });
      } catch (err) {
        // Silent for 401/403 — auth is in flight. Report other classes for telemetry.
        if (!isTransientAuthErr(err)) reportError(err, { source: "session-heartbeat" });
      }
    }

    async function attemptStart(attempt: number): Promise<void> {
      if (cancelled) return;
      try {
        const res = await fetchJsonApi<{ token: string }>(
          `${API_BASE}/sessions/start`,
          {
            method: "POST",
            body: JSON.stringify({}),
          },
        );
        if (cancelled) return;
        if (res?.token) {
          tokenRef.current = res.token;
          try {
            sessionStorage.setItem(STORAGE_KEY, res.token);
          } catch {
            // ignore
          }
          try {
            channel?.postMessage({ type: "token", value: res.token } satisfies BCMessage);
          } catch {
            // ignore
          }
        }
      } catch (err) {
        if (!isTransientAuthErr(err)) reportError(err, { source: "session-heartbeat" });
        if (attempt < START_RETRY_DELAYS_MS.length) {
          startRetryTimer = window.setTimeout(
            () => attemptStart(attempt + 1),
            START_RETRY_DELAYS_MS[attempt],
          );
        }
      }
    }

    function bootstrap() {
      // Pick up any existing token from another tab OR sessionStorage
      let existing: string | null = null;
      try {
        existing = sessionStorage.getItem(STORAGE_KEY);
      } catch {
        existing = null;
      }
      if (existing) {
        tokenRef.current = existing;
        // Let other tabs know (in case they raced)
        try {
          channel?.postMessage({ type: "token", value: existing } satisfies BCMessage);
        } catch {
          // ignore
        }
      }

      // Only the leader posts /start (and only if no token exists yet)
      if (isLeaderRef.current && !tokenRef.current) {
        void attemptStart(0);
      }

      startInterval();
    }

    // ─── Visibility handling ───────────────────────────────────────────
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        // If leader and this was the visible tab, best-effort end.
        // The server sweeper closes within ~30 min anyway, so this is a
        // best-effort signal. Use fetch({ keepalive: true }) because
        // sendBeacon cannot send Authorization.
        if (isLeaderRef.current) {
          void sendEnd("idle");
        }
      } else if (document.visibilityState === "visible") {
        // Resume heartbeat if leader
        if (isLeaderRef.current) {
          startInterval();
          // Fire one immediately so server lastSeenAt is fresh
          void sendHeartbeat();
        }
      }
    }

    function onPageHide() {
      // pagehide is the only reliable "tab closing" signal across browsers.
      if (isLeaderRef.current) {
        void sendEnd("idle");
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    // ─── Cleanup ───────────────────────────────────────────────────────
    return () => {
      cancelled = true;
      if (claimTimer != null) window.clearTimeout(claimTimer);
      if (startRetryTimer != null) window.clearTimeout(startRetryTimer);
      stopInterval();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      try {
        channel?.removeEventListener("message", onMessage);
        channel?.close();
      } catch {
        // ignore
      }
      channelRef.current = null;
      isLeaderRef.current = false;
    };
  }, [enabled, sendEnd]);

  return { endSession };
}

export const SESSION_STORAGE_KEY = STORAGE_KEY;
export const SESSION_CHANNEL_NAME = CHANNEL_NAME;
export const SESSION_HEARTBEAT_MS = HEARTBEAT_MS;
