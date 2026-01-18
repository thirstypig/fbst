import 'dotenv/config';
import { prisma } from '../db/prisma';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Period dates for 2020 (Shortened Season)
const PERIOD_DATES_2020 = [
  { p: 1, start: '2020-07-23', end: '2020-08-01' },
  { p: 2, start: '2020-08-02', end: '2020-08-22' },
  { p: 3, start: '2020-08-23', end: '2020-09-22' },
  { p: 4, start: '2020-09-23', end: '2020-09-27' },
];

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

async function import2020() {
  const year = 2020;
  const leagueId = 1;
  const archiveDir = path.join(__dirname, '../data/archive/2020');

  console.log(`\n🚀 Importing 2020 data...`);

  // 1. Create or get HistoricalSeason
  const season = await prisma.historicalSeason.upsert({
    where: { year_leagueId: { year, leagueId } },
    create: { year, leagueId },
    update: {},
  });
  console.log(`✅ Season ${year} (ID: ${season.id}) ready`);

  // 2. Load MLB ID lookups (cross-year consistency)
  let mlbIdLookup = new Map<string, { mlbId: string; fullName: string | null; position?: string }>();
  
  console.log('🔍 Loading MLB IDs from all years in database...');
  const allPlayerIds = await prisma.historicalPlayerStat.findMany({
    where: { mlbId: { not: null } },
    select: { playerName: true, mlbId: true, fullName: true, teamCode: true, position: true },
    distinct: ['playerName', 'teamCode'],
  });
  
  for (const p of allPlayerIds) {
    const key = `${p.playerName.toLowerCase()}_${p.teamCode}`;
    if (!mlbIdLookup.has(key) && p.mlbId) {
      mlbIdLookup.set(key, { mlbId: p.mlbId, fullName: p.fullName, position: p.position || undefined });
    }
  }
  
  console.log(`✅ Total MLB ID mappings available: ${mlbIdLookup.size}`);

  let totalStats = 0;

  // 3. Process each period
  for (const dateInfo of PERIOD_DATES_2020) {
    const periodNum = dateInfo.p;
    const fileName = `period_${periodNum}.csv`;
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
      relax_column_count: true 
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

          // Hitting stats
          AB: row.AB || row.ab ? toNum(row.AB || row.ab) : null,
          H: row.H || row.h ? toNum(row.H || row.h) : null,
          R: row.R || row.r ? toNum(row.R || row.r) : null,
          HR: row.HR || row.hr ? toNum(row.HR || row.hr) : null,
          RBI: row.RBI || row.rbi ? toNum(row.RBI || row.rbi) : null,
          SB: row.SB || row.sb ? toNum(row.SB || row.sb) : null,
          AVG: row.AVG || row.avg ? parseFloat(row.AVG || row.avg) : null,

          // Pitching stats
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

  // Import Season Standings if exists
  const standingsPath = path.join(archiveDir, 'season_standings_2020.csv');
  if (fs.existsSync(standingsPath)) {
      console.log(`\n  📊 Processing season_standings_2020.csv...`);
    
      const csvData = fs.readFileSync(standingsPath, 'utf-8');
      const records = parse(csvData, { 
        columns: true, 
        skip_empty_lines: true, 
        trim: true, 
        relax_column_count: true 
      });
  
      await prisma.historicalStanding.deleteMany({ where: { seasonId: season.id } });
  
      for (const row of records) {
        await prisma.historicalStanding.create({
          data: {
            seasonId: season.id,
            teamCode: String(row.team_code || '').trim().toUpperCase(),
            teamName: String(row.team_name || row.Team || '').trim(),
            totalScore: toNum(row.total_score || row.Total),
            finalRank: toNum(row.final_rank || row.Rank),
            R_score: toNum(row.R_score || row.R),
            HR_score: toNum(row.HR_score || row.HR),
            RBI_score: toNum(row.RBI_score || row.RBI),
            SB_score: toNum(row.SB_score || row.SB),
            AVG_score: toNum(row.AVG_score || row.AVG),
            W_score: toNum(row.W_score || row.W),
            SV_score: toNum(row.SV_score || row.SV),
            K_score: toNum(row.K_score || row.K),
            ERA_score: toNum(row.ERA_score || row.ERA),
            WHIP_score: toNum(row.WHIP_score || row.WHIP),
          },
        });
      }
      console.log(`     ✓ Imported ${records.length} standings`);
  }

  console.log(`\n✅ Import complete for ${year}!`);
  console.log(`   - Periods: ${PERIOD_DATES_2020.length}`);
  console.log(`   - Player stats: ${totalStats}`);
}

import2020()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
