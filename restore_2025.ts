
import { ArchiveImportService } from './server/src/services/archiveImportService';
import { prisma } from './server/src/db/prisma';
import path from 'path';

async function restore() {
    const YEAR = 2025;
    console.log(`Restoring 2025 from XLSX...`);

    // 1. Clear corrupted Historical Stats for 2025
    // We want to clear knowledge base so we don't fuzzy match to bad "Juan Wood" entries
    const season = await prisma.historicalSeason.findFirst({ where: { year: YEAR } });
    if (season) {
        const periods = await prisma.historicalPeriod.findMany({ where: { seasonId: season.id } });
        for (const p of periods) {
            await prisma.historicalPlayerStat.deleteMany({ where: { periodId: p.id } });
        }
        console.log("Cleared existing 2025 historical stats.");
    }

    // 2. Run Import Service
    // This will read 2025.xlsx and regenerate period CSVs using the new logic
    const svc = new ArchiveImportService(YEAR);
    const xlsxPath = path.join(__dirname, 'server/src/data/archive/2025/2025.xlsx');
    
    const result = await svc.processAndImport(xlsxPath);
    console.log("Import Result:", result);
}

restore().catch(console.error).finally(() => prisma.$disconnect());
