
import { API_BASE, fetchJsonApi } from '../../api/base';
import { AuthMeResponse } from '../../api/types';

export async function getMe(): Promise<AuthMeResponse> {
  return fetchJsonApi<AuthMeResponse>(`${API_BASE}/auth/me`);
}

export function getGoogleLoginUrl(): string {
  return `${API_BASE}/auth/google`;
}

export async function logout(): Promise<{ ok: boolean }> {
  await fetchJsonApi(`${API_BASE}/auth/logout`, { method: "POST" });
  return { ok: true };
}
