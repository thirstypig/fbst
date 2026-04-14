import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Helper: advance fake timers and flush microtasks repeatedly until
// a predicate resolves or we exceed a bounded number of tries. Needed
// because the hook awaits supabase.auth.getSession() + fetchJsonApi,
// which require multiple microtask flushes between timer ticks.
async function flushUntil(predicate: () => boolean, opts?: { maxTicks?: number; tickMs?: number }) {
  const maxTicks = opts?.maxTicks ?? 50;
  const tickMs = opts?.tickMs ?? 10;
  for (let i = 0; i < maxTicks; i++) {
    if (predicate()) return;
    await act(async () => {
      vi.advanceTimersByTime(tickMs);
      // flush microtasks
      await Promise.resolve();
      await Promise.resolve();
    });
  }
  if (!predicate()) throw new Error("flushUntil: predicate never satisfied");
}

// Mock supabase
vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { access_token: "test-token" } },
      })),
    },
  },
}));

// Mock fetchJsonApi + API_BASE
vi.mock("../../api/base", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("../../api/base");
  return {
    ...actual,
    API_BASE: "/api",
    fetchJsonApi: vi.fn(),
  };
});

// Silence errorBus reporting in these tests
vi.mock("../../lib/errorBus", () => ({
  reportError: vi.fn(),
}));

import { useSessionHeartbeat, SESSION_STORAGE_KEY } from "../useSessionHeartbeat";
import { fetchJsonApi } from "../../api/base";

// ─── Helpers to stub BroadcastChannel ─────────────────────────────────────

type BCListener = (ev: MessageEvent) => void;

class FakeBroadcastChannel {
  static channels: Map<string, FakeBroadcastChannel[]> = new Map();
  name: string;
  listeners: Set<BCListener> = new Set();
  closed = false;
  lastPosted: unknown[] = [];

  constructor(name: string) {
    this.name = name;
    const arr = FakeBroadcastChannel.channels.get(name) ?? [];
    arr.push(this);
    FakeBroadcastChannel.channels.set(name, arr);
  }

  addEventListener(_type: "message", listener: BCListener) {
    this.listeners.add(listener);
  }

  removeEventListener(_type: "message", listener: BCListener) {
    this.listeners.delete(listener);
  }

  postMessage(data: unknown) {
    this.lastPosted.push(data);
    const peers = FakeBroadcastChannel.channels.get(this.name) ?? [];
    for (const peer of peers) {
      if (peer === this || peer.closed) continue;
      for (const l of peer.listeners) {
        l({ data } as MessageEvent);
      }
    }
  }

  close() {
    this.closed = true;
    const arr = FakeBroadcastChannel.channels.get(this.name) ?? [];
    FakeBroadcastChannel.channels.set(
      this.name,
      arr.filter((c) => c !== this),
    );
  }

  static reset() {
    FakeBroadcastChannel.channels.clear();
  }
}

// Track fetch calls (for /sessions/end via raw fetch keepalive path)
const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));

beforeEach(() => {
  vi.useFakeTimers();
  FakeBroadcastChannel.reset();
  (globalThis as unknown as { BroadcastChannel: typeof BroadcastChannel }).BroadcastChannel =
    FakeBroadcastChannel as unknown as typeof BroadcastChannel;

  fetchMock.mockClear();
  (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

  vi.mocked(fetchJsonApi).mockReset();
  vi.mocked(fetchJsonApi).mockResolvedValue({ token: "session-abc" });

  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }

  // Ensure visibility starts as "visible"
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => "visible",
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useSessionHeartbeat", () => {
  it("does nothing when disabled", async () => {
    renderHook(() => useSessionHeartbeat(false));
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(fetchJsonApi).not.toHaveBeenCalled();
  });

  it("starts a session and stores token on first mount (leader)", async () => {
    const { unmount } = renderHook(() => useSessionHeartbeat(true));
    await flushUntil(() => sessionStorage.getItem(SESSION_STORAGE_KEY) === "session-abc");
    const startCalls = vi
      .mocked(fetchJsonApi)
      .mock.calls.filter((c) => String(c[0]).includes("/sessions/start"));
    expect(startCalls.length).toBeGreaterThanOrEqual(1);
    unmount();
  });

  it("sends heartbeat at 30s intervals while visible", async () => {
    renderHook(() => useSessionHeartbeat(true));
    await flushUntil(() => sessionStorage.getItem(SESSION_STORAGE_KEY) === "session-abc");
    vi.mocked(fetchJsonApi).mockClear();
    vi.mocked(fetchJsonApi).mockResolvedValue({});

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });
    const calls = vi.mocked(fetchJsonApi).mock.calls.filter((c) =>
      String(c[0]).includes("/sessions/heartbeat"),
    );
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });

  it("pauses heartbeats when visibility changes to hidden and uses keepalive for end", async () => {
    renderHook(() => useSessionHeartbeat(true));
    await flushUntil(() => sessionStorage.getItem(SESSION_STORAGE_KEY) === "session-abc");
    vi.mocked(fetchJsonApi).mockClear();

    // Flip to hidden — fires end via fetch keepalive
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushUntil(() =>
      fetchMock.mock.calls.some((c) => String(c[0]).includes("/sessions/end")),
    );

    const endCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes("/sessions/end"),
    );
    expect(endCalls.length).toBeGreaterThanOrEqual(1);
    const init = endCalls[0][1] as RequestInit | undefined;
    expect(init?.keepalive).toBe(true);
    expect((init?.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer test-token",
    );

    // Interval should not fire heartbeats while hidden
    vi.mocked(fetchJsonApi).mockClear();
    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });
    const hb = vi.mocked(fetchJsonApi).mock.calls.filter((c) =>
      String(c[0]).includes("/sessions/heartbeat"),
    );
    expect(hb.length).toBe(0);
  });

  it("endSession() returned from hook closes session and clears storage", async () => {
    const { result } = renderHook(() => useSessionHeartbeat(true));
    await flushUntil(() => sessionStorage.getItem(SESSION_STORAGE_KEY) === "session-abc");

    await act(async () => {
      await result.current.endSession();
    });

    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    const endCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes("/sessions/end"),
    );
    expect(endCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("second hook instance defers (does not re-create session) when leader exists", async () => {
    // Mount first — becomes leader, creates session
    const first = renderHook(() => useSessionHeartbeat(true));
    await flushUntil(() => sessionStorage.getItem(SESSION_STORAGE_KEY) === "session-abc");
    vi.mocked(fetchJsonApi).mockClear();

    // Second instance — should see a pong from the leader and defer
    const second = renderHook(() => useSessionHeartbeat(true));
    // Flush several ticks for leader election + bootstrap
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(50);
        await Promise.resolve();
        await Promise.resolve();
      }
    });

    // The second instance must NOT issue /sessions/start
    const startCalls = vi.mocked(fetchJsonApi).mock.calls.filter((c) =>
      String(c[0]).includes("/sessions/start"),
    );
    expect(startCalls.length).toBe(0);

    first.unmount();
    second.unmount();
  });

  it("cleans up listeners and intervals on unmount", async () => {
    const { unmount } = renderHook(() => useSessionHeartbeat(true));
    await flushUntil(() => sessionStorage.getItem(SESSION_STORAGE_KEY) === "session-abc");
    vi.mocked(fetchJsonApi).mockClear();

    unmount();

    // After unmount, advancing the clock must not trigger any new heartbeats
    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
    });
    const hb = vi.mocked(fetchJsonApi).mock.calls.filter((c) =>
      String(c[0]).includes("/sessions/heartbeat"),
    );
    expect(hb.length).toBe(0);
  });
});
