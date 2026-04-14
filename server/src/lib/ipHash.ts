import crypto from "node:crypto";

/**
 * IP privacy utilities for session tracking (plan R8).
 *
 * - `hashIp` — HMAC-SHA256(ip, IP_HASH_SECRET). Deterministic + unguessable.
 *   Used for long-term session rows so we can still correlate across sessions
 *   for fraud investigations without storing raw PII.
 * - `truncateIp` — coarse bucketing retained after the 7-day raw-IP window.
 *
 * Fail-fast: the module refuses to load without a strong secret so a
 * misconfigured deploy never silently hashes with an empty key.
 */
const SECRET = process.env.IP_HASH_SECRET;
if (!SECRET || SECRET.length < 32) {
  throw new Error(
    "IP_HASH_SECRET env var missing or <32 chars. Generate with `openssl rand -hex 32`.",
  );
}

// Narrow for TS — the guard above proves SECRET is a non-empty string.
const SECRET_STR: string = SECRET;

export function hashIp(raw: string): string {
  return crypto.createHmac("sha256", SECRET_STR).update(raw).digest("hex");
}

export function truncateIp(raw: string): string {
  // IPv6 → keep first 3 hextets + "::" (≈ /48)
  if (raw.includes(":")) {
    const parts = raw.split(":");
    return parts.slice(0, 3).join(":") + "::";
  }
  // IPv4 → /24
  const parts = raw.split(".");
  if (parts.length !== 4) return raw; // leave malformed IPs alone
  return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
}
