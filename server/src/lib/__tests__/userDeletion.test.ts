import { describe, it, expect, vi, beforeEach } from "vitest";

// ipHash is imported transitively — seed the env so the module load doesn't throw.
if (!process.env.IP_HASH_SECRET || process.env.IP_HASH_SECRET.length < 32) {
  process.env.IP_HASH_SECRET = "a".repeat(64);
}

// Mock the Prisma singleton BEFORE importing the helper.
vi.mock("../../db/prisma.js", () => {
  const userFindUnique = vi.fn();
  const userDelete = vi.fn();
  const logCreate = vi.fn();
  const txRunner = vi.fn(async (cb: (tx: any) => Promise<any>) =>
    cb({
      userDeletionLog: { create: logCreate },
      user: { delete: userDelete },
    }),
  );
  return {
    prisma: {
      user: { findUnique: userFindUnique, delete: userDelete },
      userDeletionLog: { create: logCreate },
      $transaction: txRunner,
    },
  };
});

vi.mock("../logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { prisma } = await import("../../db/prisma.js");
const { deleteUserWithAudit } = await import("../userDeletion.js");
const { hashEmail } = await import("../ipHash.js");

describe("deleteUserWithAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes a UserDeletionLog row with hashed email before deleting the user", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: 42, email: "alice@example.com" });
    (prisma.userDeletionLog.create as any).mockResolvedValue({
      id: 7,
      deletedAt: new Date("2026-04-14T20:00:00Z"),
    });

    const result = await deleteUserWithAudit(42, { reason: "self_delete" });

    expect(result.userId).toBe(42);
    expect(result.logId).toBe(7);
    expect(result.emailHash).toBe(hashEmail("alice@example.com"));

    expect(prisma.userDeletionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 42,
        emailHash: hashEmail("alice@example.com"),
        reason: "self_delete",
        deletedBy: null,
      }),
    });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 42 } });
  });

  it("records deletedBy when an admin initiates", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: 99, email: "bob@example.com" });
    (prisma.userDeletionLog.create as any).mockResolvedValue({ id: 8, deletedAt: new Date() });

    await deleteUserWithAudit(99, { deletedBy: 1, reason: "tos_violation" });

    expect(prisma.userDeletionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ deletedBy: 1, reason: "tos_violation" }),
    });
  });

  it("normalizes email (lowercase + trim) before hashing", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: 1, email: "  Foo@BAR.com  " });
    (prisma.userDeletionLog.create as any).mockResolvedValue({ id: 1, deletedAt: new Date() });

    const result = await deleteUserWithAudit(1);
    expect(result.emailHash).toBe(hashEmail("foo@bar.com"));
  });

  it("throws when user does not exist", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    await expect(deleteUserWithAudit(404)).rejects.toThrow(/user 404 not found/);
    expect(prisma.userDeletionLog.create).not.toHaveBeenCalled();
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it("stores metadata as JSON when provided", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: 2, email: "a@b.com" });
    (prisma.userDeletionLog.create as any).mockResolvedValue({ id: 2, deletedAt: new Date() });

    await deleteUserWithAudit(2, { metadata: { source: "admin_panel", ipCountry: "US" } });

    expect(prisma.userDeletionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: { source: "admin_panel", ipCountry: "US" },
      }),
    });
  });
});
