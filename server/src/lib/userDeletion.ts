import { prisma } from "../db/prisma.js";
import { hashEmail } from "./ipHash.js";
import { logger } from "./logger.js";

/**
 * GDPR right-to-erasure with audit trail (plan R16).
 *
 * `UserDeletionLog` is the ONLY record that survives a user deletion — every
 * other user-related row is onDelete: Cascade. To preserve evidence of who
 * was deleted and why (for support, compliance audits, abuse investigation),
 * we write the log row *before* the cascade runs, in the same transaction.
 *
 * **NEVER call `prisma.user.delete()` directly in application code.** That
 * skips the audit log and defeats R16. This helper is the only sanctioned
 * path. The email is hashed with HMAC before storage so we retain
 * correlation ability without storing plaintext PII after erasure.
 */

export interface UserDeletionOptions {
  /** Admin user id if this is an admin-initiated delete; null/undefined for self-delete. */
  deletedBy?: number | null;
  /** Free-form reason for audit ("support_request", "tos_violation", "self_delete", etc.). */
  reason?: string;
  /** Arbitrary context captured at deletion time (e.g. IP, session count). */
  metadata?: Record<string, unknown>;
}

export interface UserDeletionResult {
  userId: number;
  emailHash: string;
  deletedAt: Date;
  logId: number;
}

/**
 * Delete a user and all cascading data, writing a UserDeletionLog row first.
 * Returns info about the deletion log row so callers can log/report it.
 * Throws if the user does not exist.
 */
export async function deleteUserWithAudit(
  userId: number,
  options: UserDeletionOptions = {},
): Promise<UserDeletionResult> {
  // Fetch the email BEFORE the cascade — after delete it's gone forever.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) {
    throw new Error(`deleteUserWithAudit: user ${userId} not found`);
  }

  const emailHash = hashEmail(user.email);

  // Transactional: if the log write fails, the delete must not happen. If
  // the delete fails, the log write must roll back. This is the entire point
  // of R16 — keep the two in lockstep.
  const result = await prisma.$transaction(async (tx) => {
    const log = await tx.userDeletionLog.create({
      data: {
        userId: user.id,
        emailHash,
        deletedBy: options.deletedBy ?? null,
        reason: options.reason ?? null,
        metadata: options.metadata ? (options.metadata as object) : undefined,
      },
    });
    await tx.user.delete({ where: { id: user.id } });
    return log;
  });

  logger.info(
    { userId, logId: result.id, deletedBy: options.deletedBy ?? null, reason: options.reason ?? null },
    "User deleted with audit log",
  );

  return {
    userId: user.id,
    emailHash,
    deletedAt: result.deletedAt,
    logId: result.id,
  };
}
