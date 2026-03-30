/**
 * Backfill daily stats for all active periods.
 * Iterates each date in the period range and calls syncDailyStats().
 *
 * Usage: npx tsx server/src/scripts/backfill-daily-stats.ts [--period <id>]
 */
import { prisma } from "../db/prisma.js";
import { syncDailyStats } from "../features/players/services/mlbStatsSyncService.js";
import { logger } from "../lib/logger.js";

async function main() {
  const periodIdArg = process.argv.indexOf("--period");
  const periodId = periodIdArg !== -1 ? parseInt(process.argv[periodIdArg + 1]) : undefined;

  const periods = periodId
    ? [await prisma.period.findUnique({ where: { id: periodId } })]
    : await prisma.period.findMany({ where: { status: "active" }, orderBy: { id: "asc" } });

  const validPeriods = periods.filter(Boolean) as { id: number; startDate: Date; endDate: Date; name: string }[];

  if (validPeriods.length === 0) {
    console.log("No periods found to backfill.");
    process.exit(0);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const period of validPeriods) {
    console.log(`\nBackfilling period ${period.id} (${period.name}): ${period.startDate.toISOString().split("T")[0]} to ${period.endDate.toISOString().split("T")[0]}`);

    const start = new Date(period.startDate);
    const end = period.endDate < today ? period.endDate : today;
    let totalSynced = 0;

    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split("T")[0];
      try {
        const result = await syncDailyStats(dateStr);
        totalSynced += result.synced;
        console.log(`  ${dateStr}: ${result.synced} synced, ${result.skipped} skipped, ${result.errors} errors`);
      } catch (err) {
        console.error(`  ${dateStr}: FAILED — ${err}`);
      }
      current.setDate(current.getDate() + 1);
    }

    console.log(`  Total synced for period ${period.id}: ${totalSynced}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
