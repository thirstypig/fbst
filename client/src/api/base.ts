
import { JsonError } from './types';

const RAW_BASE: string =
  import.meta.env.VITE_API_BASE ??
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost:4000";

export const API_BASE: string = (() => {
  const b = String(RAW_BASE).replace(/\/+$/, ""); // trim trailing slash(es)
  return b.endsWith("/api") ? b : `${b}/api`;
})();

export const MLB_API_BASE = "https://statsapi.mlb.com/api/v1";

export async function fetchJsonApi<T>(url: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 
    Accept: "application/json", 
    ...init?.headers as Record<string, string> 
  };

  // Automatically add Content-Type if body is present and not already set
  if (init?.body && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });

  const text = await res.text();
  const maybeJson = (() => {
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  })();

  if (!res.ok) {
    const errorBody = maybeJson as JsonError | null;
    const msg =
      (errorBody && (errorBody.error || errorBody.message)) ||
      (text ? `HTTP ${res.status} for ${url} — ${text.slice(0, 180)}` : `HTTP ${res.status} for ${url}`);
    throw new Error(msg);
  }

  return (maybeJson ?? ({} as T)) as T;
}

export async function fetchJsonPublic<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    credentials: "omit",
  });

  const text = await res.text();
  const maybeJson = (() => {
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  })();

  if (!res.ok) {
    const errorBody = maybeJson as JsonError | null;
    const msg =
      (errorBody && (errorBody.error || errorBody.message)) ||
      (text ? `HTTP ${res.status} for ${url} — ${text.slice(0, 180)}` : `HTTP ${res.status} for ${url}`);
    throw new Error(msg);
  }

  return (maybeJson ?? ({} as T)) as T;
}

export function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function fmt2(v: number): string {
  if (!Number.isFinite(v)) return "";
  return v.toFixed(2);
}

export function fmt3Avg(h: number, ab: number): string {
  if (!ab) return ".000";
  const s = (h / ab).toFixed(3);
  return s.startsWith("0") ? s.slice(1) : s;
}

export function fmtRate(v: number): string {
  if (!Number.isFinite(v)) return ".000";
  const s = v.toFixed(3);
  return s.startsWith("0") ? s.slice(1) : s;
}

export function yyyyMmDd(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function addDays(d: Date, delta: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + delta);
  return x;
}
