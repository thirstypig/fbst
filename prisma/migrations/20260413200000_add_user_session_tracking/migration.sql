-- Migration: add_user_session_tracking
-- Generated: 2026-04-13 (Session 63, Phase B)
-- Plan: docs/plans/2026-04-13-admin-users-session-tracking-plan.md
--
-- Adds three tables for admin users engagement tracking:
--   UserSession     — one row per browser per login cycle (heartbeats update lastSeenAt)
--   UserMetrics     — denormalized rollup, one row per user (updated on session end)
--   UserDeletionLog — non-cascading audit trail, survives user erasure
--
-- NOTE per plan R6: lastSeenAt on UserSession is DELIBERATELY NOT indexed.
-- Indexing it breaks Postgres HOT updates and causes ~100MB/day dead-tuple
-- bloat at 1k DAU. Admin "active now" queries use UserMetrics.lastSeenAt instead.
--
-- NOTE per plan R8: IP_HASH_SECRET env var required — rows will fail to insert
-- without it if the app tries to hash IPs. Deploy env BEFORE running migration.

-- CreateTable
CREATE TABLE "UserSession" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "ipHash" TEXT,
    "ipTruncated" TEXT,
    "ipRaw" TEXT,
    "userAgent" TEXT,
    "country" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "endReason" TEXT,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMetrics" (
    "userId" INTEGER NOT NULL,
    "totalLogins" INTEGER NOT NULL DEFAULT 0,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "totalSecondsOnSite" INTEGER NOT NULL DEFAULT 0,
    "avgSessionSec" INTEGER NOT NULL DEFAULT 0,
    "leaguesOwnedCount" INTEGER NOT NULL DEFAULT 0,
    "leaguesCommissionedCount" INTEGER NOT NULL DEFAULT 0,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3),
    "signupSource" TEXT,
    "signupUtmSource" TEXT,
    "signupUtmCampaign" TEXT,

    CONSTRAINT "UserMetrics_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserDeletionLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "emailHash" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedBy" INTEGER,
    "reason" TEXT,
    "metadata" JSONB,

    CONSTRAINT "UserDeletionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_token_key" ON "UserSession"("token");

-- CreateIndex
-- Deliberate: NO index on UserSession.lastSeenAt (plan R6). HOT updates only.
CREATE INDEX "UserSession_userId_startedAt_idx" ON "UserSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "UserMetrics_lastSeenAt_idx" ON "UserMetrics"("lastSeenAt" DESC);

-- CreateIndex
CREATE INDEX "UserMetrics_lastLoginAt_idx" ON "UserMetrics"("lastLoginAt" DESC);

-- CreateIndex
CREATE INDEX "UserDeletionLog_deletedAt_idx" ON "UserDeletionLog"("deletedAt");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMetrics" ADD CONSTRAINT "UserMetrics_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Performance tuning per plan R6 + performance agent review:
-- UserSession is heartbeat-hot. Reserve fillfactor for HOT updates, tune
-- autovacuum aggressively to clean dead tuples more frequently.
ALTER TABLE "UserSession" SET (
    fillfactor = 80,
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_vacuum_cost_limit = 1000
);
