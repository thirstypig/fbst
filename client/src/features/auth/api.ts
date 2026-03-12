
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

export async function updateProfile(payload: {
  name?: string;
  venmoHandle?: string | null;
  zelleHandle?: string | null;
  paypalHandle?: string | null;
}): Promise<{ user: any }> {
  return fetchJsonApi(`${API_BASE}/auth/profile`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
