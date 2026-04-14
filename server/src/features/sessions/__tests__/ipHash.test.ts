import { describe, it, expect } from "vitest";

// Ensure IP_HASH_SECRET is set BEFORE importing the module under test.
// The module throws at import time if the secret is missing or <32 chars.
process.env.IP_HASH_SECRET =
  process.env.IP_HASH_SECRET ??
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const { hashIp, truncateIp } = await import("../../../lib/ipHash.js");

describe("hashIp", () => {
  it("returns a 64-char hex string", () => {
    const h = hashIp("1.2.3.4");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same input", () => {
    expect(hashIp("1.2.3.4")).toBe(hashIp("1.2.3.4"));
  });

  it("produces different outputs for different inputs", () => {
    expect(hashIp("1.2.3.4")).not.toBe(hashIp("1.2.3.5"));
  });
});

describe("truncateIp", () => {
  it("truncates IPv4 to /24", () => {
    expect(truncateIp("192.168.1.42")).toBe("192.168.1.0");
    expect(truncateIp("10.0.0.1")).toBe("10.0.0.0");
  });

  it("truncates IPv6 to /48 (first 3 hextets + ::)", () => {
    expect(truncateIp("2001:db8:85a3:0:0:8a2e:370:7334")).toBe("2001:db8:85a3::");
  });

  it("passes malformed IPs through untouched", () => {
    expect(truncateIp("not-an-ip")).toBe("not-an-ip");
    expect(truncateIp("1.2.3")).toBe("1.2.3");
  });
});
