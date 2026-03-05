import { prisma } from "../db/prisma.js";
import { logger } from "./logger.js";

/**
 * Fire-and-forget audit log writer.
 * Never throws — audit failure must not break the primary operation.
 */
export function writeAuditLog(params: {
  userId: number;
  action: string;
  resourceType: string;
  resourceId?: string | number;
  metadata?: Record<string, unknown>;
}): void {
  prisma.auditLog
    .create({
      data: {
        userId: params.userId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId != null ? String(params.resourceId) : null,
        metadata: params.metadata ? (params.metadata as any) : undefined,
      },
    })
    .catch((err) => {
      logger.error({ error: String(err), audit: params }, "Failed to write audit log");
    });
}
