// Update period dates and import end_of_season.csv as Period 7
import { prisma } from '../db/prisma';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Corrected period dates (2025)
const PERIOD_DATES = [
  { period: 1, start: '2025-03-27', end: '2025-04-19' },  // draft to Apr 19
  { period: 2, start: '2025-04-20', end: '2025-05-17' },  // Apr 20 to May 17
  { period: 3, start: '2025-05-18', end: '2025-06-07' },  // May 18 to Jun 7
  { period: 4, start: '2025-06-08', end: '2025-07-05' },  // Jun 8 to Jul 5
  { period: 5, start: '2025-07-06', end: '2025-08-02' },  // Jul 6 to Aug 2
  { period: 6, start: '2025-08-03', end: '2025-08-30' },  // Aug 3 to Aug 30
  { period: 7, start: '2025-08-31', end: '2025-09-28' },  // Aug 31 to end of season
];

async function updatePeriodDates() {
  console.log('\n📅 Updating period dates...\n');

  const season = await prisma.historicalSeason.findFirst({
    where: { year: 2025 },
  });

  if (!season) {
    console.log('No 2025 season found!');
    return;
  }

  for (const pd of PERIOD_DATES) {
    const result = await prisma.historicalPeriod.updateMany({
      where: {
        seasonId: season.id,
        periodNumber: pd.period,
      },
      data: {
        startDate: new Date(pd.start),
        endDate: new Date(pd.end),
      },
    });
    console.log(`  Period ${pd.period}: ${pd.start} to ${pd.end} (${result.count} updated)`);
  }
}

async function importEndOfSeason() {
  console.log('\n📦 Importing end_of_season.csv as Period 7...\n');

  const season = await prisma.historicalSeason.findFirst({
    where: { year: 2025 },
  });

  if (!season) {
    console.log('No 2025 season found!');
    return;
  }

  // Check if period 7 already exists
  let period7 = await prisma.historicalPeriod.findFirst({
    where: { seasonId: season.id, periodNumber: 7 },
  });

  if (period7) {
    // Delete existing stats for period 7
    await prisma.historicalPlayerStat.deleteMany({
      where: { periodId: period7.id },
    });
    console.log('  Cleared existing Period 7 stats');
  } else {
    // Create period 7
    period7 = await prisma.historicalPeriod.create({
      data: {
        seasonId: season.id,
        periodNumber: 7,
        startDate: new Date('2025-08-31'),
        endDate: new Date('2025-09-28'),
      },
    });
    console.log('  Created Period 7');
  }

  // Read CSV
  const csvPath = path.join(__dirname, '../data/archive/2025/end_of_season.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.trim().split('\n');
  const header = lines[0].split(',');

  console.log(`  Found ${lines.length - 1} players in CSV\n`);

  let imported = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line (handle quoted fields)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const playerName = values[0];
    const mlbId = values[1] || null;
    const teamCode = values[2];
    const isPitcher = values[3]?.toLowerCase() === 'true';

    if (!playerName || !teamCode) continue;

    await prisma.historicalPlayerStat.create({
      data: {
        periodId: period7.id,
        playerName,
        mlbId,
        teamCode,
        isPitcher,
      },
    });
    imported++;
  }

  console.log(`  ✅ Imported ${imported} players for Period 7\n`);
}

async function main() {
  try {
    await updatePeriodDates();
    await importEndOfSeason();
    console.log('✅ Done!\n');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
