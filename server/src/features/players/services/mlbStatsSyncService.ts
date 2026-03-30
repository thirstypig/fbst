import { prisma } from "../../../db/prisma.js";
import { logger } from "../../../lib/logger.js";
import { mlbGetJson } from "../../../lib/mlbApi.js";
import { chunk } from "../../../lib/utils.js";

const MLB_BASE = "https://statsapi.mlb.com/api/v1";

/**
 * Sync player stats from the MLB Stats API into PlayerStatsPeriod for a given period.
 * Fetches stats by date range for all rostered players in the league.
 */
export async function syncPeriodStats(periodId: number): Promise<{
  synced: number;
  skipped: number;
  errors: number;
}> {
  const period = await prisma.period.findUnique({ where: { id: periodId } });
  if (!period) throw new Error(`Period ${periodId} not found`);

  const startDate = period.startDate.toISOString().split("T")[0];
  const endDate = period.endDate.toISOString().split("T")[0];

  // Find all players who were ever rostered during this period
  // (includes released players so their stats are captured for date-aware attribution)
  const rosters = await prisma.roster.findMany({
    where: {
      OR: [
        { releasedAt: null },
        { releasedAt: { gte: period.startDate } },
      ],
      acquiredAt: { lte: period.endDate },
    },
    select: { player: { select: { id: true, mlbId: true } } },
  });

  const playerMap = new Map<number, number>(); // mlbId -> playerId
  for (const r of rosters) {
    if (r.player.mlbId) {
      playerMap.set(r.player.mlbId, r.player.id);
    }
  }

  const mlbIds = [...playerMap.keys()];
  if (mlbIds.length === 0) {
    logger.info({}, "No rostered players with mlbIds — skipping stats sync");
    return { synced: 0, skipped: 0, errors: 0 };
  }

  logger.info(
    { periodId, startDate, endDate, playerCount: mlbIds.length },
    "Starting period stats sync"
  );

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  const batches = chunk(mlbIds.map(String), 50);

  for (const batch of batches) {
    try {
      const ids = batch.join(",");
      const hydrate = `stats(group=[hitting,pitching],type=[byDateRange],startDate=${startDate},endDate=${endDate})`;
      const url = `${MLB_BASE}/people?personIds=${ids}&hydrate=${hydrate}`;
      const data = await mlbGetJson(url);
      const people: any[] = data.people || [];

      for (const person of people) {
        const mlbId = person.id;
        const playerId = playerMap.get(mlbId);
        if (!playerId) {
          skipped++;
          continue;
        }

        const stats = parsePlayerStats(person);

        await prisma.playerStatsPeriod.upsert({
          where: { playerId_periodId: { playerId, periodId } },
          create: { playerId, periodId, ...stats },
          update: stats,
        });

        synced++;
      }

      // Polite delay between batches
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      logger.error({ error: String(err), batch: batch.slice(0, 3) }, "Batch stats fetch failed");
      errors += batch.length;
    }
  }

  logger.info({ synced, skipped, errors, periodId }, "Period stats sync complete");
  return { synced, skipped, errors };
}

/**
 * Parse hitting + pitching stats from an MLB API person response.
 */
function parsePlayerStats(person: any): {
  AB: number;
  H: number;
  R: number;
  HR: number;
  RBI: number;
  SB: number;
  W: number;
  SV: number;
  K: number;
  IP: number;
  ER: number;
  BB_H: number;
} {
  const result = { AB: 0, H: 0, R: 0, HR: 0, RBI: 0, SB: 0, W: 0, SV: 0, K: 0, IP: 0, ER: 0, BB_H: 0 };

  if (!person.stats) return result;

  for (const statGroup of person.stats) {
    const groupName = statGroup.group?.displayName?.toLowerCase();
    const split = statGroup.splits?.[0]?.stat;
    if (!split) continue;

    if (groupName === "hitting") {
      result.AB = split.atBats || 0;
      result.H = split.hits || 0;
      result.R = split.runs || 0;
      result.HR = split.homeRuns || 0;
      result.RBI = split.rbi || 0;
      result.SB = split.stolenBases || 0;
    } else if (groupName === "pitching") {
      result.W = split.wins || 0;
      result.SV = split.saves || 0;
      result.K = split.strikeOuts || 0;
      result.IP = split.inningsPitched ? parseFloat(split.inningsPitched) : 0;
      result.ER = split.earnedRuns || 0;
      // BB_H = walks + hits allowed (for WHIP = BB_H / IP)
      result.BB_H = (split.baseOnBalls || 0) + (split.hits || 0);
    }
  }

  return result;
}

/**
 * Sync stats for all active periods (status = "active").
 */
export async function syncAllActivePeriods(): Promise<void> {
  const periods = await prisma.period.findMany({
    where: { status: "active" },
    orderBy: { id: "asc" },
  });

  for (const period of periods) {
    try {
      await syncPeriodStats(period.id);
    } catch (err) {
      logger.error({ error: String(err), periodId: period.id }, "Failed to sync period stats");
    }
  }
}

/**
 * Sync daily stats for a single date into PlayerStatsDaily.
 * Queries all players who were rostered on that date (including recently released).
 */
export async function syncDailyStats(dateStr: string): Promise<{
  synced: number;
  skipped: number;
  errors: number;
}> {
  const targetDate = new Date(`${dateStr}T00:00:00Z`);

  // Find all players rostered on this date (active or released after this date)
  const rosters = await prisma.roster.findMany({
    where: {
      acquiredAt: { lte: targetDate },
      OR: [
        { releasedAt: null },
        { releasedAt: { gt: targetDate } },
      ],
    },
    select: { player: { select: { id: true, mlbId: true } } },
  });

  const playerMap = new Map<number, number>();
  for (const r of rosters) {
    if (r.player.mlbId) {
      playerMap.set(r.player.mlbId, r.player.id);
    }
  }

  const mlbIds = [...playerMap.keys()];
  if (mlbIds.length === 0) {
    logger.info({ dateStr }, "No rostered players for daily stats sync");
    return { synced: 0, skipped: 0, errors: 0 };
  }

  logger.info({ dateStr, playerCount: mlbIds.length }, "Starting daily stats sync");

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  const batches = chunk(mlbIds.map(String), 50);

  for (const batch of batches) {
    try {
      const ids = batch.join(",");
      const hydrate = `stats(group=[hitting,pitching],type=[byDateRange],startDate=${dateStr},endDate=${dateStr})`;
      const url = `${MLB_BASE}/people?personIds=${ids}&hydrate=${hydrate}`;
      const data = await mlbGetJson(url);
      const people: any[] = data.people || [];

      for (const person of people) {
        const mlbId = person.id;
        const playerId = playerMap.get(mlbId);
        if (!playerId) { skipped++; continue; }

        const stats = parsePlayerStats(person);

        // Skip if all zeros (off-day / no game)
        const hasStats = stats.AB > 0 || stats.H > 0 || stats.R > 0 || stats.HR > 0 ||
          stats.W > 0 || stats.SV > 0 || stats.K > 0 || stats.IP > 0;
        if (!hasStats) { skipped++; continue; }

        await prisma.playerStatsDaily.upsert({
          where: { playerId_gameDate: { playerId, gameDate: targetDate } },
          create: { playerId, gameDate: targetDate, ...stats },
          update: stats,
        });

        synced++;
      }

      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      logger.error({ error: String(err), batch: batch.slice(0, 3) }, "Daily stats batch failed");
      errors += batch.length;
    }
  }

  logger.info({ synced, skipped, errors, dateStr }, "Daily stats sync complete");
  return { synced, skipped, errors };
}
