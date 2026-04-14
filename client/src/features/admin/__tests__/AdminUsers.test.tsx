import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock auth
vi.mock("../../../auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

// Mock API
vi.mock("../../../api/base", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("../../../api/base");
  return {
    ...actual,
    API_BASE: "/api",
    fetchJsonApi: vi.fn(),
  };
});

vi.mock("../../../lib/errorBus", () => ({
  reportError: vi.fn(),
}));

import { useAuth } from "../../../auth/AuthProvider";
import { fetchJsonApi } from "../../../api/base";
import AdminUsers from "../pages/AdminUsers";

interface AdminUserRow {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  signupAt: string;
  lastLoginAt: string | null;
  totalLogins: number;
  totalSessions: number;
  totalSecondsOnSite: number;
  avgSessionSec: number;
  leaguesOwned: number;
  leaguesCommissioned: number;
  tier: "free" | "pro" | "commissioner" | "unknown";
  signupSource: string | null;
  country: string | null;
}

function row(partial: Partial<AdminUserRow> = {}): AdminUserRow {
  const now = new Date().toISOString();
  return {
    id: 1,
    email: "alice@example.com",
    name: "Alice Example",
    avatarUrl: null,
    isAdmin: false,
    signupAt: now,
    lastLoginAt: now,
    totalLogins: 1,
    totalSessions: 2,
    totalSecondsOnSite: 3600,
    avgSessionSec: 1800,
    leaguesOwned: 1,
    leaguesCommissioned: 0,
    tier: "free",
    signupSource: null,
    country: null,
    ...partial,
  };
}

function defaultResponse(overrides: { users?: AdminUserRow[]; total?: number; page?: number } = {}) {
  return {
    users: overrides.users ?? [row()],
    total: overrides.total ?? 1,
    page: overrides.page ?? 1,
    pageSize: 50,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminUsers />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(fetchJsonApi).mockReset();
  vi.mocked(fetchJsonApi).mockImplementation(async (url: string) => {
    if (url.includes("/admin/stats")) {
      return {
        users: { total: 42, active30d: 10, newThisMonth: 3, paid: 0 },
      } as unknown;
    }
    if (url.includes("/admin/users")) {
      return defaultResponse() as unknown;
    }
    return {} as unknown;
  });
});

describe("AdminUsers", () => {
  it("shows access-required message for non-admin", () => {
    vi.mocked(useAuth).mockReturnValue({ isAdmin: false } as any);
    renderPage();
    expect(screen.getByText("Admin access required.")).toBeInTheDocument();
  });

  it("renders table row with user data for admins", async () => {
    vi.mocked(useAuth).mockReturnValue({ isAdmin: true } as any);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Alice Example")).toBeInTheDocument();
    });
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    // Sessions cell
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("fetches stats and users on mount", async () => {
    vi.mocked(useAuth).mockReturnValue({ isAdmin: true } as any);
    renderPage();
    await waitFor(() => {
      const urls = vi.mocked(fetchJsonApi).mock.calls.map((c) => String(c[0]));
      expect(urls.some((u) => u.includes("/admin/stats"))).toBe(true);
      expect(urls.some((u) => u.includes("/admin/users"))).toBe(true);
    });
  });

  it("debounces search input before hitting API", async () => {
    vi.useFakeTimers();
    vi.mocked(useAuth).mockReturnValue({ isAdmin: true } as any);
    renderPage();
    // Initial fetches flush
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    const callsBefore = vi.mocked(fetchJsonApi).mock.calls.length;

    const input = screen.getByPlaceholderText(/search by email/i);
    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "al" } });
    fireEvent.change(input, { target: { value: "ali" } });

    // Before debounce delay elapses, no new /admin/users call fired
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    const midCalls = vi
      .mocked(fetchJsonApi)
      .mock.calls.map((c) => String(c[0]))
      .filter((u) => u.includes("search="));
    expect(midCalls.length).toBe(0);

    // After debounce
    await act(async () => {
      vi.advanceTimersByTime(250);
      await vi.runOnlyPendingTimersAsync();
    });

    const afterCalls = vi
      .mocked(fetchJsonApi)
      .mock.calls.map((c) => String(c[0]))
      .filter((u) => u.includes("search=ali"));
    expect(afterCalls.length).toBeGreaterThanOrEqual(1);
    expect(vi.mocked(fetchJsonApi).mock.calls.length).toBeGreaterThan(callsBefore);
    vi.useRealTimers();
  });

  it("updates query params when filter chips clicked", async () => {
    vi.mocked(useAuth).mockReturnValue({ isAdmin: true } as any);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Alice Example")).toBeInTheDocument();
    });
    vi.mocked(fetchJsonApi).mockClear();
    vi.mocked(fetchJsonApi).mockImplementation(async (url: string) => {
      if (url.includes("/admin/stats")) {
        return { users: { total: 42, active30d: 10, newThisMonth: 3, paid: 0 } } as unknown;
      }
      return defaultResponse() as unknown;
    });

    // Click the "7d" active chip
    fireEvent.click(screen.getByRole("button", { name: "7d" }));
    await waitFor(() => {
      const hit = vi
        .mocked(fetchJsonApi)
        .mock.calls.map((c) => String(c[0]))
        .some((u) => u.includes("active=7d"));
      expect(hit).toBe(true);
    });

    // Click the "Pro" tier chip
    fireEvent.click(screen.getByRole("button", { name: "Pro" }));
    await waitFor(() => {
      const hit = vi
        .mocked(fetchJsonApi)
        .mock.calls.map((c) => String(c[0]))
        .some((u) => u.includes("tier=pro"));
      expect(hit).toBe(true);
    });
  });

  it("pagination Next/Prev buttons fetch new pages", async () => {
    vi.mocked(useAuth).mockReturnValue({ isAdmin: true } as any);
    // Respond with 3 pages of data
    vi.mocked(fetchJsonApi).mockImplementation(async (url: string) => {
      if (url.includes("/admin/stats")) {
        return { users: { total: 42, active30d: 10, newThisMonth: 3, paid: 0 } } as unknown;
      }
      const m = url.match(/[?&]page=(\d+)/);
      const page = m ? Number(m[1]) : 1;
      return defaultResponse({ users: [row({ id: page, name: `User ${page}` })], total: 120, page }) as unknown;
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText("User 1")).toBeInTheDocument();
    });

    const next = screen.getByRole("button", { name: /next/i });
    fireEvent.click(next);
    await waitFor(() => {
      expect(screen.getByText("User 2")).toBeInTheDocument();
    });

    const prev = screen.getByRole("button", { name: /prev/i });
    fireEvent.click(prev);
    await waitFor(() => {
      expect(screen.getByText("User 1")).toBeInTheDocument();
    });
  });

  it("shows empty state when user list is empty", async () => {
    vi.mocked(useAuth).mockReturnValue({ isAdmin: true } as any);
    vi.mocked(fetchJsonApi).mockImplementation(async (url: string) => {
      if (url.includes("/admin/stats")) {
        return { users: { total: 0, active30d: 0, newThisMonth: 0, paid: 0 } } as unknown;
      }
      return defaultResponse({ users: [], total: 0 }) as unknown;
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no users match/i)).toBeInTheDocument();
    });
  });
});
