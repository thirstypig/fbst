import 'dotenv/config';
import { prisma } from '../db/prisma';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//Period dates for 2023
const PERIOD_DATES_2023 = [
  { p: 1, start: '2023-03-30', end: '2023-04-22' },  // Draft period
  { p: 2, start: '2023-04-23', end: '2023-05-20' },
  {p: 3, start: '2023-05-21', end: '2023-06-10' },
  { p: 4, start: '2023-06-11', end: '2023-07-08' },
  { p: 5, start: '2023-07-09', end: '2023-08-05' },
  { p: 6, start: '2023-08-06', end: '2023-09-03' },
  { p: 7, start: '2023-09-04', end: '2023-10-01' },  // End of season
];

// File name mapping for 2023 (they use uppercase Period_ vs lowercase period_)
const FILE_NAME_MAP_2023: Record<number, string> = {
  1: 'draft_2023_auction_period_format.csv',
  2: 'period_1.csv',  // Period 1 stats → period 2
  3: 'period_2.csv',  // Period 2 stats → period 3
  4: 'period_3.csv',
  5: 'period_4.csv',
  6: 'period_5.csv',
  7: 'period_6.csv',
};

function toNum(v: any): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toBool(v: any): boolean {
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

async function import2023() {
  const year = 2023;
  const leagueId = 1;
  const archiveDir = path.join(__dirname, '../data/archive/2023');

  console.log(`\n🚀 Importing 2023 data...`);

  // 1. Create or get HistoricalSeason
  const season = await prisma.historicalSeason.upsert({
    where: { year_leagueId: { year, leagueId } },
    create: { year, leagueId },
    update: {},
  });
  console.log(`✅ Season ${year} (ID: ${season.id}) ready`);

  // 2. Load MLB ID reference - check both reference file AND all years in database
  // Rule: If player+team combination exists in any year, use that MLB ID
  const refPath = path.join(__dirname, '../data/mlb_id_reference/2023_mlb_ids.json');
  let mlbIdLookup = new Map<string, { mlbId: string; fullName: string | null }>();
  
  if (fs.existsSync(refPath)) {
    const refData = JSON.parse(fs.readFileSync(refPath, 'utf-8'));
    console.log(`📚 Loaded ${refData.totalPlayers} MLB ID mappings from reference file`);
    for (const p of refData.players) {
      const key = `${p.playerName.toLowerCase()}_${p.teamCode}`;
      mlbIdLookup.set(key, { mlbId: p.mlbId, fullName: p.fullName });
    }
  }

  // Also load from all existing years in database (cross-year consistency)
  console.log('🔍 Loading MLB IDs from all years in database...');
  const allPlayerIds = await prisma.historicalPlayerStat.findMany({
    where: { mlbId: { not: null } },
    select: { playerName: true, mlbId: true, fullName: true, teamCode: true },
    distinct: ['playerName', 'teamCode'],
  });
  
  for (const p of allPlayerIds) {
    const key = `${p.playerName.toLowerCase()}_${p.teamCode}`;
    // Only add if not already in lookup (reference file takes precedence)
    if (!mlbIdLookup.has(key) && p.mlbId) {
      mlbIdLookup.set(key, { mlbId: p.mlbId, fullName: p.fullName });
    }
  }
  
  console.log(`✅ Total MLB ID mappings available: ${mlbIdLookup.size}`);

  let totalStats = 0;

  // 3. Process each period with correct file names
  for (const dateInfo of PERIOD_DATES_2023) {
    const periodNum = dateInfo.p;
    const fileName = FILE_NAME_MAP_2023[periodNum];
    const csvPath = path.join(archiveDir, fileName);

    if (!fs.existsSync(csvPath)) {
      console.warn(`⚠️  Missing file: ${fileName}`);
      continue;
    }

    console.log(`\n📄 Processing Period ${periodNum} (${fileName})...`);

    const csvData = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true  // Handle malformed rows
    });

    // Create or update period
    const period = await prisma.historicalPeriod.upsert({
      where: {
        seasonId_periodNumber: {
          seasonId: season.id,
          periodNumber: periodNum
        }
      },
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

    // Delete existing stats for this period (for re-imports)
    await prisma.historicalPlayerStat.deleteMany({
      where: { periodId: period.id }
    });

    // Import player stats
    for (const row of records as any[]) {
      const playerName = String(row.player_name || row.name || '').trim();
      const teamCode = String(row.team_code || '').trim().toUpperCase();
      
      // Look up MLB ID from reference
      const key = `${playerName.toLowerCase()}_${teamCode}`;
      const ref = mlbIdLookup.get(key);

      await prisma.historicalPlayerStat.create({
        data: {
          periodId: period.id,
          playerName: playerName,
          fullName: ref?.fullName || row.full_name || null,
          mlbId: row.mlb_id || ref?.mlbId || null,
          teamCode: teamCode,
          isPitcher: toBool(row.is_pitcher || row.pitcher),
          position: row.position || row.pos || ref?.position || null,
          mlbTeam: row.mlb_team || row.mlbTeam || null,

          // Hitting stats - handle both column name cases
          AB: row.AB || row.ab ? toNum(row.AB || row.ab) : null,
          H: row.H || row.h ? toNum(row.H || row.h) : null,
          R: row.R || row.r ? toNum(row.R || row.r) : null,
          HR: row.HR || row.hr ? toNum(row.HR || row.hr) : null,
          RBI: row.RBI || row.rbi ? toNum(row.RBI || row.rbi) : null,
          SB: row.SB || row.sb ? toNum(row.SB || row.sb) : null,
          AVG: row.AVG || row.avg ? parseFloat(row.AVG || row.avg) : null,

          // Pitching stats - handle both column name cases
          W: row.W || row.w ? toNum(row.W || row.w) : null,
          SV: row.SV || row.sv ? toNum(row.SV || row.sv) : null,
          K: row.K || row.k || row.SO || row.so ? toNum(row.K || row.k || row.SO || row.so) : null,
          IP: row.IP || row.ip ? parseFloat(row.IP || row.ip) : null,
          ER: row.ER || row.er ? toNum(row.ER || row.er) : null,
          ERA: row.ERA || row.era ? parseFloat(row.ERA || row.era) : null,
          WHIP: row.WHIP || row.whip ? parseFloat(row.WHIP || row.whip) : null,
        },
      });
      totalStats++;
    }

    console.log(`     ✓ Imported ${records.length} player stats for Period ${periodNum}`);
  }

  console.log(`\n✅ Import complete for ${year}!`);
  console.log(`   - Periods: ${PERIOD_DATES_2023.length}`);
  console.log(`   - Player stats: ${totalStats}`);
}

import2023()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
