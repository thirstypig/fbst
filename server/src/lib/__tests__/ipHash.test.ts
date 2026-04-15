import { describe, it, expect } from "vitest";

// ipHash.ts throws at module load if IP_HASH_SECRET is missing. ES module
// `import` statements hoist above any statements, so we seed the env then
// dynamically import — awaiting the import keeps the symbols available to
// the test blocks below at execution time.
if (!process.env.IP_HASH_SECRET || process.env.IP_HASH_SECRET.length < 32) {
  process.env.IP_HASH_SECRET = "a".repeat(64);
}
const { truncateIp, hashIp } = await import("../ipHash.js");

describe("truncateIp — IPv4", () => {
  it("zeros the last octet for /24", () => {
    expect(truncateIp("192.168.1.1")).toBe("192.168.1.0");
    expect(truncateIp("10.0.0.5")).toBe("10.0.0.0");
    expect(truncateIp("8.8.8.8")).toBe("8.8.8.0");
  });

  it("leaves malformed IPv4 unchanged", () => {
    expect(truncateIp("not.an.ip")).toBe("not.an.ip");
    expect(truncateIp("1.2.3")).toBe("1.2.3");
    expect(truncateIp("")).toBe("");
  });
});

describe("truncateIp — IPv6 (regression for Session 63 bugs)", () => {
  it("loopback `::1` produces a valid /48, not `::1::`", () => {
    expect(truncateIp("::1")).toBe("0:0:0::");
  });

  it("documentation prefix `2001:db8::1` produces `2001:db8:0::`, not `2001:db8::::`", () => {
    expect(truncateIp("2001:db8::1")).toBe("2001:db8:0::");
  });

  it("link-local `fe80::1234:5678` produces `fe80:0:0::`, not `fe80:::::`", () => {
    expect(truncateIp("fe80::1234:5678")).toBe("fe80:0:0::");
  });

  it("strips leading zeros from each hextet (`2001:0db8:...` → `2001:db8:0::`)", () => {
    expect(truncateIp("2001:0db8:0000:0000:0000:0000:0000:0001")).toBe("2001:db8:0::");
  });

  it("collapses all-zeros address", () => {
    expect(truncateIp("::")).toBe("0:0:0::");
  });

  it("full 8-group uncompressed", () => {
    expect(truncateIp("2001:db8:1:2:3:4:5:6")).toBe("2001:db8:1::");
  });

  it("strips RFC 4007 zone index", () => {
    expect(truncateIp("fe80::1%eth0")).toBe("fe80:0:0::");
  });

  it("leaves malformed IPv6 unchanged rather than mangling", () => {
    expect(truncateIp("not:an:ip:::bad")).toBe("not:an:ip:::bad");
    expect(truncateIp("gggg::1")).toBe("gggg::1");
  });
});

describe("truncateIp — IPv4-mapped IPv6", () => {
  it("unmaps `::ffff:192.168.1.1` to IPv4 path and /24s it", () => {
    expect(truncateIp("::ffff:192.168.1.1")).toBe("192.168.1.0");
  });

  it("unmaps `::ffff:8.8.8.8`", () => {
    expect(truncateIp("::ffff:8.8.8.8")).toBe("8.8.8.0");
  });

  it("unmaps hex-form `::ffff:c0a8:101` (same as 192.168.1.1)", () => {
    expect(truncateIp("::ffff:c0a8:101")).toBe("192.168.1.0");
  });
});

describe("hashIp", () => {
  it("is deterministic for the same input", () => {
    expect(hashIp("192.168.1.1")).toBe(hashIp("192.168.1.1"));
  });

  it("produces different hashes for different IPs", () => {
    expect(hashIp("192.168.1.1")).not.toBe(hashIp("192.168.1.2"));
  });

  it("returns 64-char hex digest (SHA-256)", () => {
    const h = hashIp("192.168.1.1");
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });
});
