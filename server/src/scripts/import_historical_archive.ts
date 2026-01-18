// server/src/scripts/import_historical_archive.ts
/**
 * Import historical season data from CSV files
 * 
 * Usage: tsx src/scripts/import_historical_archive.ts 2024
 * 
 * Directory structure expected:
 * server/src/data/archive/2024/
 *   ├── period_1.csv
 *   ├── period_2.csv
 *   ├── period_3.csv
 *   ├── period_4.csv
 *   ├── period_5.csv
 *   ├── period_6.csv
 *   └── season_standings.csv (optional)
 * 
 * CSV Format for period files:
 * player_name,full_name,mlb_id,team_code,is_pitcher,AB,H,R,HR,RBI,SB,AVG,W,SV,K,IP,ER,ERA,WHIP
 * 
 * player_name = abbreviated name for reference (e.g., "S. Ohtani")
 * full_name = full display name (e.g., "Shohei Ohtani")
 * 
 * CSV Format for season_standings.csv:
 * team_code,team_name,R_score,HR_score,RBI_score,SB_score,AVG_score,W_score,SV_score,K_score,ERA_score,WHIP_score,total_score,final_rank
 */

import 'dotenv/config';
import { prisma } from '../db/prisma';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function importHistoricalYear(year: number, leagueId: number = 1) {
  const archiveDir = path.join(__dirname, '../data/archive', year.toString());
  
  if (!fs.existsSync(archiveDir)) {
    throw new Error(`Archive directory not found: ${archiveDir}`);
  }

  console.log(`\n📦 Importing historical data for ${year}...`);

  // 1. Create or get HistoricalSeason
  const season = await prisma.historicalSeason.upsert({
    where: { year_leagueId: { year, leagueId } },
    create: { year, leagueId },
    update: {},
  });
  console.log(`✅ Season ${year} (ID: ${season.id}) ready`);

  // 2. Find all period CSV files
  const periodFiles = fs.readdirSync(archiveDir)
    .filter(f => f.match(/^period_\d+\.csv$/))
    .sort();

  if (periodFiles.length === 0) {
    console.warn(`⚠️  No period CSV files found in ${archiveDir}`);
  }

  let totalStats = 0;

  // 3. Import each period
  for (const file of periodFiles) {
    const periodNum = parseInt(file.match(/period_(\d+)\.csv$/)?.[1] || '0');
    if (periodNum === 0) continue;

    const csvPath = path.join(archiveDir, file);
    console.log(`\n  📄 Processing ${file}...`);

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
        periodNumber: periodNum 
      },
      update: {},
    });

    // Delete existing stats for this period (for re-imports)
    await prisma.historicalPlayerStat.deleteMany({
      where: { periodId: period.id }
    });

    // Import player stats
    for (const row of records) {
      await prisma.historicalPlayerStat.create({
        data: {
          periodId: period.id,
          playerName: String(row.player_name || '').trim(),
          fullName: row.full_name ? String(row.full_name).trim() : null,
          mlbId: row.mlb_id ? String(row.mlb_id).trim() : null,
          teamCode: String(row.team_code || '').trim().toUpperCase(),
          isPitcher: toBool(row.is_pitcher),
          
          // Hitting stats
          AB: row.AB ? toNum(row.AB) : null,
          H: row.H ? toNum(row.H) : null,
          R: row.R ? toNum(row.R) : null,
          HR: row.HR ? toNum(row.HR) : null,
          RBI: row.RBI ? toNum(row.RBI) : null,
          SB: row.SB ? toNum(row.SB) : null,
          AVG: row.AVG ? parseFloat(row.AVG) : null,
          
          // Pitching stats
          W: row.W ? toNum(row.W) : null,
          SV: row.SV ? toNum(row.SV) : null,
          K: row.K ? toNum(row.K) : null,
          IP: row.IP ? parseFloat(row.IP) : null,
          ER: row.ER ? toNum(row.ER) : null,
          ERA: row.ERA ? parseFloat(row.ERA) : null,
          WHIP: row.WHIP ? parseFloat(row.WHIP) : null,
        },
      });
      totalStats++;
    }

    console.log(`     ✓ Imported ${records.length} player stats for Period ${periodNum}`);
  }

  // 4. Import season standings if file exists
  const standingsFile = path.join(archiveDir, 'season_standings.csv');
  if (fs.existsSync(standingsFile)) {
    console.log(`\n  📊 Processing season_standings.csv...`);
    
    const csvData = fs.readFileSync(standingsFile, 'utf-8');
    const records = parse(csvData, { 
      columns: true,
      skip_empty_lines: true,
      trim: true 
    });

    // Delete existing standings
    await prisma.historicalStanding.deleteMany({
      where: { seasonId: season.id }
    });

    for (const row of records) {
      await prisma.historicalStanding.create({
        data: {
          seasonId: season.id,
          teamCode: String(row.team_code || '').trim().toUpperCase(),
          teamName: String(row.team_name || '').trim(),
          
          R_score: row.R_score ? toNum(row.R_score) : null,
          HR_score: row.HR_score ? toNum(row.HR_score) : null,
          RBI_score: row.RBI_score ? toNum(row.RBI_score) : null,
          SB_score: row.SB_score ? toNum(row.SB_score) : null,
          AVG_score: row.AVG_score ? toNum(row.AVG_score) : null,
          W_score: row.W_score ? toNum(row.W_score) : null,
          SV_score: row.SV_score ? toNum(row.SV_score) : null,
          K_score: row.K_score ? toNum(row.K_score) : null,
          ERA_score: row.ERA_score ? toNum(row.ERA_score) : null,
          WHIP_score: row.WHIP_score ? toNum(row.WHIP_score) : null,
          
          totalScore: toNum(row.total_score),
          finalRank: toNum(row.final_rank),
        },
      });
    }

    console.log(`     ✓ Imported ${records.length} team standings`);
  }

  console.log(`\n✅ Import complete for ${year}!`);
  console.log(`   - Periods: ${periodFiles.length}`);
  console.log(`   - Player stats: ${totalStats}`);
}

// Main execution
async function main() {
  const yearArg = process.argv[2];
  
  if (!yearArg) {
    console.error('Usage: tsx src/scripts/import_historical_archive.ts <year>');
    console.error('Example: tsx src/scripts/import_historical_archive.ts 2024');
    process.exit(1);
  }

  const year = parseInt(yearArg);
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    console.error('Invalid year. Please provide a valid year (e.g., 2024)');
    process.exit(1);
  }

  try {
    await importHistoricalYear(year);
    console.log('\n🎉 All done!\n');
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
