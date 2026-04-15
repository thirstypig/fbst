import crypto from "node:crypto";

/**
 * IP privacy utilities for session tracking (plan R8).
 *
 * - `hashIp` — HMAC-SHA256(ip, IP_HASH_SECRET). Deterministic + unguessable.
 *   Used for long-term session rows so we can still correlate across sessions
 *   for fraud investigations without storing raw PII.
 * - `truncateIp` — coarse bucketing retained after the 7-day raw-IP window.
 *   /24 for IPv4, /48 for IPv6 (first 3 hextets). IPv4-mapped-in-IPv6
 *   addresses (`::ffff:a.b.c.d`) are treated as plain IPv4. All valid inputs
 *   produce a well-formed output — no more `::1::`, `2001:db8::::` etc.
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

/**
 * HMAC-SHA256(email, IP_HASH_SECRET). Used by UserDeletionLog (plan R16) so
 * we can correlate a deleted user with later support contact without
 * retaining the plaintext email. Reuses IP_HASH_SECRET intentionally — same
 * threat model (deterministic PII hash, secret rotates yearly).
 */
export function hashEmail(email: string): string {
  return crypto.createHmac("sha256", SECRET_STR).update(email.toLowerCase().trim()).digest("hex");
}

/**
 * Return the IP truncated to /24 (IPv4) or /48 (IPv6). Safe under all
 * common input shapes including `::1`, `::ffff:a.b.c.d`, compressed `::`
 * forms, and zoned-scope ids (`fe80::1%eth0`). Unknown/malformed inputs
 * are returned unchanged rather than mangled further.
 */
export function truncateIp(raw: string): string {
  if (!raw) return raw;

  // Strip RFC 4007 zone index (`fe80::1%eth0` → `fe80::1`).
  const trimmed = raw.split("%")[0];

  // IPv4 — straightforward /24.
  if (!trimmed.includes(":")) {
    const octets = trimmed.split(".");
    if (octets.length !== 4) return trimmed;
    return `${octets[0]}.${octets[1]}.${octets[2]}.0`;
  }

  // IPv6 — expand `::` to an 8-group array so all downstream logic works
  // against a fixed-shape representation.
  const groups = expandIpv6(trimmed);
  if (!groups) return trimmed;

  // IPv4-mapped IPv6 (`::ffff:a.b.c.d`). After expansion these are always
  // `0:0:0:0:0:ffff:HHHH:LLLL`. Unmap to plain IPv4 and /24 it.
  if (
    groups[0] === "0" && groups[1] === "0" && groups[2] === "0" &&
    groups[3] === "0" && groups[4] === "0" && groups[5] === "ffff"
  ) {
    const hi = parseInt(groups[6], 16);
    const lo = parseInt(groups[7], 16);
    if (Number.isNaN(hi) || Number.isNaN(lo)) return trimmed;
    const a = (hi >> 8) & 0xff;
    const b = hi & 0xff;
    const c = (lo >> 8) & 0xff;
    return `${a}.${b}.${c}.0`;
  }

  // /48 — keep first 3 hextets, zero the rest. Strip leading zeros from
  // each group for canonical form (`0db8` → `db8`), then close with `::`
  // which represents the remaining 5 zero groups.
  const head = groups.slice(0, 3).map((g) => g.replace(/^0+/, "") || "0");
  return `${head.join(":")}::`;
}

/**
 * Expand an IPv6 string to an exact 8-group array of lowercase hex strings
 * (no leading zeros stripped here — that's done by the caller where needed).
 * Handles IPv4-embedded tails (`::ffff:192.168.1.1`) by converting the
 * dotted portion to two hex groups first. Returns `null` on malformed input.
 */
function expandIpv6(ip: string): string[] | null {
  let normalized = ip;

  // Convert IPv4 tail (`a.b.c.d`) to two hex groups so we always work in hex.
  const lastColon = ip.lastIndexOf(":");
  const tail = lastColon >= 0 ? ip.slice(lastColon + 1) : "";
  if (tail.includes(".")) {
    const octets = tail.split(".");
    if (octets.length !== 4) return null;
    const nums = octets.map((o) => parseInt(o, 10));
    if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;
    const hi = ((nums[0] << 8) | nums[1]).toString(16);
    const lo = ((nums[2] << 8) | nums[3]).toString(16);
    normalized = ip.slice(0, lastColon + 1) + `${hi}:${lo}`;
  }

  const parts = normalized.split("::");
  if (parts.length > 2) return null; // two `::` is invalid

  const left = parts[0] ? parts[0].split(":") : [];
  const right = parts.length === 2 && parts[1] ? parts[1].split(":") : [];
  const total = left.length + right.length;
  if (total > 8) return null;

  // If there's no `::` the address must already have 8 explicit groups.
  if (parts.length === 1 && total !== 8) return null;

  const zeros = new Array(8 - total).fill("0");
  const combined = [...left, ...zeros, ...right];
  if (combined.length !== 8) return null;

  for (const g of combined) {
    if (!g || g.length > 4 || !/^[0-9a-fA-F]+$/.test(g)) return null;
  }

  return combined.map((g) => g.toLowerCase());
}
