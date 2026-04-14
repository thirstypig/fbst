import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { logger } from "../../lib/logger.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { writeAuditLog } from "../../lib/auditLog.js";
import { hashIp, truncateIp } from "../../lib/ipHash.js";

const router = Router();

// ── Constants (plan R4/R5/R9) ────────────────────────────────────

/** Skip writing on heartbeat if lastSeenAt is this recent (plan R4 dedupe). */
const HEARTBEAT_DEDUPE_MS = 25 * 1000;
/** Clamp session duration rollups to 8h (plan R5 defensive). */
const MAX_DURATION_SEC = 28_800;
/** Session cap per user (plan R9). */
const CONCURRENT_SESSION_CAP = 10;
/** Credential-stuffing canary threshold (plan R9). */
const CANARY_SESSIONS_PER_HOUR = 100;
/** Session token lifetime for client-visible expiresAt. */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// ── In-memory rate limiter (per-user fixed window) ───────────────
// Lightweight bucket. Sticky to a single process — heartbeat abuse
// across multiple instances is still bounded by the 10-concurrent
// session cap enforced server-side.
type Bucket = { windowStart: number; count: number };
const startBuckets = new Map<number, Bucket>();
const heartbeatBuckets = new Map<number, Bucket>();

function rateLimit(
  buckets: Map<number, Bucket>,
  userId: number,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const bucket = buckets.get(userId);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(userId, { windowStart: now, count: 1 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

/** Test-only: clear rate limiter state between cases. */
export function __resetSessionRateLimitersForTests(): void {
  startBuckets.clear();
  heartbeatBuckets.clear();
}

// ── Schemas ──────────────────────────────────────────────────────

const startSchema = z.object({
  userAgent: z.string().max(512).optional(),
  signupSource: z.string().max(64).optional(),
});

const heartbeatSchema = z.object({
  token: z.string().min(1).max(64),
});

const endSchema = z.object({
  token: z.string().min(1).max(64),
  reason: z.enum(["logout", "idle"]).optional(),
});

// ── Helpers ──────────────────────────────────────────────────────

function readClientIp(req: Request): string {
  return (req.ip ?? req.socket?.remoteAddress ?? "").toString();
}

function readCountry(req: Request): string | null {
  const raw = req.headers["cf-ipcountry"];
  if (typeof raw !== "string" || !raw) return null;
  return raw.slice(0, 2).toUpperCase();
}

// ── POST /start ──────────────────────────────────────────────────

export async function handleSessionStart(req: Request, res: Response) {
  const userId = req.user!.id;

  // Rate limit: 10/min per user
  if (!rateLimit(startBuckets, userId, 10, 60 * 1000)) {
    return res.status(429).json({ error: "Too many session starts, try again later" });
  }

  // Credential-stuffing canary (plan R9)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentSessionCount = await prisma.userSession.count({
    where: { userId, startedAt: { gte: oneHourAgo } },
  });
  if (recentSessionCount > CANARY_SESSIONS_PER_HOUR) {
    logger.warn(
      { userId, recentSessionCount },
      "High session creation rate — possible credential stuffing",
    );
    return res.status(429).json({ error: "Too many sessions, try again later" });
  }

  const rawIp = readClientIp(req);
  const ipHash = rawIp ? hashIp(rawIp) : null;
  const ipTruncated = rawIp ? truncateIp(rawIp) : null;
  const country = readCountry(req);
  const userAgent = req.body.userAgent ?? req.headers["user-agent"]?.toString().slice(0, 512) ?? null;
  const signupSource = req.body.signupSource ?? null;

  const now = new Date();

  // Enforce concurrent-session cap (plan R9) — close oldest if at/over limit.
  // Wrapped in a transaction with the create so the cap is atomic.
  const created = await prisma.$transaction(async (tx) => {
    const openCount = await tx.userSession.count({
      where: { userId, endedAt: null },
    });
    if (openCount >= CONCURRENT_SESSION_CAP) {
      const oldest = await tx.userSession.findFirst({
        where: { userId, endedAt: null },
        orderBy: { startedAt: "asc" },
        select: { id: true, startedAt: true, lastSeenAt: true },
      });
      if (oldest) {
        const durationSec = Math.min(
          Math.floor((oldest.lastSeenAt.getTime() - oldest.startedAt.getTime()) / 1000),
          MAX_DURATION_SEC,
        );
        await tx.userSession.update({
          where: { id: oldest.id },
          data: {
            endedAt: oldest.lastSeenAt,
            durationSec,
            endReason: "session_cap",
          },
        });
      }
    }

    const session = await tx.userSession.create({
      data: {
        userId,
        ipHash,
        ipTruncated,
        ipRaw: rawIp || null,
        userAgent: userAgent || null,
        country,
      },
      select: { token: true, startedAt: true },
    });

    // Upsert denormalized UserMetrics (plan R11)
    await tx.userMetrics.upsert({
      where: { userId },
      create: {
        userId,
        firstSeenAt: now,
        lastSeenAt: now,
        lastLoginAt: now,
        totalLogins: 1,
        totalSessions: 1,
        signupSource: signupSource ?? undefined,
      },
      update: {
        lastLoginAt: now,
        lastSeenAt: now,
        totalLogins: { increment: 1 },
        totalSessions: { increment: 1 },
      },
    });

    return session;
  });

  // Write audit-log LOGIN entry (plan R17). Fire-and-forget — never blocks response.
  writeAuditLog({
    userId,
    action: "LOGIN",
    resourceType: "User",
    resourceId: String(userId),
  });

  logger.info(
    { userId, country, hasCountry: Boolean(country) },
    "session.start",
  );

  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  return res.status(201).json({ token: created.token, expiresAt });
}

// ── POST /heartbeat ──────────────────────────────────────────────

export async function handleSessionHeartbeat(req: Request, res: Response) {
  const userId = req.user!.id;

  // Rate limit: 20/min per user
  if (!rateLimit(heartbeatBuckets, userId, 20, 60 * 1000)) {
    return res.status(429).json({ error: "Too many heartbeats" });
  }

  const token = req.body.token as string;

  const session = await prisma.userSession.findUnique({
    where: { token },
    select: { id: true, userId: true, lastSeenAt: true, endedAt: true },
  });

  // Silent 204 on not-found / ownership mismatch / already-ended (plan R2 no enumeration)
  if (!session || session.userId !== userId || session.endedAt != null) {
    return res.status(204).end();
  }

  // Dedupe within 25s (plan R4) — avoid redundant UPDATE
  if (Date.now() - session.lastSeenAt.getTime() < HEARTBEAT_DEDUPE_MS) {
    return res.status(204).end();
  }

  await prisma.userSession.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() },
  });

  return res.status(204).end();
}

// ── POST /end ────────────────────────────────────────────────────

export async function handleSessionEnd(req: Request, res: Response) {
  const userId = req.user!.id;
  const token = req.body.token as string;
  const reason = (req.body.reason as "logout" | "idle" | undefined) ?? "logout";

  const session = await prisma.userSession.findUnique({
    where: { token },
    select: { id: true, userId: true, startedAt: true, endedAt: true },
  });

  // Silent 204 on ownership mismatch or already-ended
  if (!session || session.userId !== userId || session.endedAt != null) {
    return res.status(204).end();
  }

  const endedAt = new Date();
  const rawDuration = Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000);
  const durationSec = Math.max(0, Math.min(rawDuration, MAX_DURATION_SEC));

  await prisma.userSession.update({
    where: { id: session.id },
    data: { endedAt, durationSec, endReason: reason },
  });

  // Roll up to UserMetrics (plan R5). Raw SQL so it's a single atomic UPDATE
  // — avoids a read-modify-write race if two sessions end simultaneously.
  try {
    await prisma.$executeRaw`
      UPDATE "UserMetrics"
      SET "totalSecondsOnSite" = "totalSecondsOnSite" + ${durationSec},
          "avgSessionSec" = CASE
            WHEN "totalSessions" > 0
              THEN ("totalSecondsOnSite" + ${durationSec}) / "totalSessions"
            ELSE 0
          END,
          "lastSeenAt" = GREATEST("lastSeenAt", ${endedAt})
      WHERE "userId" = ${userId}
    `;
  } catch (err) {
    // Never let a metrics-rollup failure break the end-of-session response.
    logger.warn(
      { error: String(err), userId, sessionId: session.id },
      "Failed to roll up UserMetrics on session end",
    );
  }

  return res.status(204).end();
}

// ── Route wiring ─────────────────────────────────────────────────

router.post(
  "/start",
  requireAuth,
  validateBody(startSchema),
  asyncHandler(handleSessionStart),
);

router.post(
  "/heartbeat",
  requireAuth,
  validateBody(heartbeatSchema),
  asyncHandler(handleSessionHeartbeat),
);

router.post(
  "/end",
  requireAuth,
  validateBody(endSchema),
  asyncHandler(handleSessionEnd),
);

export const sessionsRouter = router;
export default sessionsRouter;
