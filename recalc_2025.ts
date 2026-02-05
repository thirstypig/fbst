
import { ArchiveStatsService } from './server/src/services/archiveStatsService';
import { prisma } from './server/src/db/prisma';

async function run() {
    console.log("Recalculating 2025...");
    const svc = new ArchiveStatsService();
    try {
        // Ensure Season & Period 1 Exists
        const season = await prisma.historicalSeason.upsert({
            where: { year_leagueId: { year: 2025, leagueId: 1 } },
            create: { year: 2025, leagueId: 1 },
            update: {}
        });

        const p1 = await prisma.historicalPeriod.upsert({
            where: { seasonId_periodNumber: { seasonId: season.id, periodNumber: 1 } },
            create: { seasonId: season.id, periodNumber: 1, startDate: new Date('2025-03-27'), endDate: new Date('2025-10-01') },
            update: {}
        });
        console.log("Ensured Period 1 exists:", p1.id);

        const result = await svc.recalculateYear(2025, undefined, undefined, true);
        console.log("Result:", result);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
