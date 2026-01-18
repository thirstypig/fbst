
import { prisma } from '../db/prisma';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PERIOD_DATES = [
  { p: 1, start: '2024-03-28', end: '2024-04-20' },
  { p: 2, start: '2024-04-21', end: '2024-05-18' },
  { p: 3, start: '2024-05-19', end: '2024-06-08' },
  { p: 4, start: '2024-06-09', end: '2024-07-06' },
  { p: 5, start: '2024-07-07', end: '2024-08-03' },
  { p: 6, start: '2024-08-04', end: '2024-08-31' },
  { p: 7, start: '2024-09-01', end: '2024-09-29' },
];

async function import2024() {
  const year = 2024;
  const leagueId = 1;
  const archiveDir = path.join(__dirname, '../data/archive/2024');

  console.log(`\n🚀 Importing 2024 data...`);

  // 1. Build lookup map from existing HistoricalPlayerStat (2025)
  // to resolve abbreviated names to MLB IDs and Full Names.
  console.log('🔍 Building player lookup from 2025 data...');
  const stats2025 = await prisma.historicalPlayerStat.findMany({
    where: { period: { season: { year: 2025 } } },
    select: {
      playerName: true,
      fullName: true,
      mlbId: true,
      position: true,
      mlbTeam: true,
    }
  });

  const lookup = new Map<string, any>();
  for (const s of stats2025) {
    if (!lookup.has(s.playerName)) {
      lookup.set(s.playerName, {
        fullName: s.fullName,
        mlbId: s.mlbId,
        position: s.position,
        mlbTeam: s.mlbTeam
      });
    }
  }
  console.log(`✅ Lookup built with ${lookup.size} players`);

  // 2. Create or get HistoricalSeason
  const season = await prisma.historicalSeason.upsert({
    where: { year_leagueId: { year, leagueId } },
    create: { year, leagueId },
    update: {},
  });

  // 3. Process each period
  for (const dateInfo of PERIOD_DATES) {
    const periodNum = dateInfo.p;
    const fileName = periodNum === 7 ? 'end_of_season.csv' : `period_${periodNum}.csv`;
    const csvPath = path.join(archiveDir, fileName);

    if (!fs.existsSync(csvPath)) {
      console.warn(`⚠️  Missing file: ${fileName}`);
      continue;
    }

    console.log(`\n📄 Processing Period ${periodNum} (${fileName})...`);

    const records = parse(fs.readFileSync(csvPath, 'utf-8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const period = await prisma.historicalPeriod.upsert({
      where: { seasonId_periodNumber: { seasonId: season.id, periodNumber: periodNum } },
      create: {
        seasonId: season.id,
        periodNumber: periodNum,
        startDate: new Date(dateInfo.start),
        endDate: new Date(dateInfo.end),
      },
      update: {
        startDate: new Date(dateInfo.start),
        endDate: new Date(dateInfo.end),
      }
    });

    // Clear existing for idempotency
    await prisma.historicalPlayerStat.deleteMany({ where: { periodId: period.id } });

    let imported = 0;
    for (const row of records) {
      const pName = row.player_name;
      const ref = lookup.get(pName);

      await prisma.historicalPlayerStat.create({
        data: {
          periodId: period.id,
          playerName: pName,
          fullName: ref?.fullName || pName,
          mlbId: row.mlb_id || ref?.mlbId || null,
          teamCode: row.team_code.toUpperCase(),
          isPitcher: row.is_pitcher.toLowerCase() === 'true',
          position: ref?.position || null,
          mlbTeam: ref?.mlbTeam || null,
        }
      });
      imported++;
    }
    console.log(`   ✓ Imported ${imported} players`);
  }

  console.log(`\n🎉 2024 Initial Import Complete!`);
}

import2024()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
