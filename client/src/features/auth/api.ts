
import { API_BASE, fetchJsonApi } from '../../api/base';
import { AuthMeResponse } from '../../api/types';

export async function getMe(): Promise<AuthMeResponse> {
  return fetchJsonApi<AuthMeResponse>(`${API_BASE}/auth/me`);
}

export function getGoogleLoginUrl(): string {
  return `${API_BASE}/auth/google`;
}

export async function logout(): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${API_BASE}/auth/logout`);
  }
  return { ok: true };
}
