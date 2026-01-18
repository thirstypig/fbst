// Apply draft positions and fix data issues
import { prisma } from '../db/prisma';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse draft CSV and apply positions
async function applyDraftPositions() {
  console.log('\n📋 Applying draft positions from draft_2025_period_plus.csv...\n');

  const csvPath = path.join(__dirname, '../data/archive/2025/draft_2025_period_plus.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.trim().split('\n');

  // Build lookup: playerName_teamCode -> position
  const positionMap = new Map<string, string>();
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV (handle quoted fields)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else current += char;
    }
    values.push(current.trim());

    const playerName = values[0];
    const teamCode = values[2];
    const position = values[4];

    if (playerName && teamCode && position) {
      const key = `${playerName.toLowerCase()}_${teamCode}`;
      positionMap.set(key, position);
    }
  }

  console.log(`  Found ${positionMap.size} player positions in draft file\n`);

  // Apply to all periods
  const periods = await prisma.historicalPeriod.findMany({
    where: { season: { year: 2025 } },
    include: {
      stats: {
        select: { id: true, playerName: true, teamCode: true, isPitcher: true },
      },
    },
    orderBy: { periodNumber: 'asc' },
  });

  let updated = 0;
  for (const period of periods) {
    for (const stat of period.stats) {
      const key = `${stat.playerName.toLowerCase()}_${stat.teamCode}`;
      const draftPos = positionMap.get(key);
      
      if (draftPos) {
        await prisma.historicalPlayerStat.update({
          where: { id: stat.id },
          data: { position: draftPos },
        });
        updated++;
      }
    }
    console.log(`  Period ${period.periodNumber}: Applied draft positions`);
  }

  console.log(`\n✅ Updated ${updated} player positions from draft\n`);
}

// Fix Shohei Ohtani - TWP should be DH for hitter version
async function fixOhtaniRule() {
  console.log('\n⚾ Fixing Shohei Ohtani rule...\n');

  // Fix hitter Ohtani (TWP -> DH)
  const hitterUpdates = await prisma.historicalPlayerStat.updateMany({
    where: {
      OR: [
        { fullName: { contains: 'Ohtani' } },
        { playerName: { contains: 'Ohtani' } },
      ],
      isPitcher: false,
    },
    data: { position: 'DH' },
  });
  console.log(`  Updated ${hitterUpdates.count} Ohtani hitter entries to DH`);

  // Fix pitcher Ohtani (should be P)
  const pitcherUpdates = await prisma.historicalPlayerStat.updateMany({
    where: {
      OR: [
        { fullName: { contains: 'Ohtani' } },
        { playerName: { contains: 'Ohtani' } },
      ],
      isPitcher: true,
    },
    data: { position: 'P' },
  });
  console.log(`  Updated ${pitcherUpdates.count} Ohtani pitcher entries to P\n`);
}

// Check for duplicates in same period/team
async function checkDuplicates() {
  console.log('\n🔍 Checking for duplicate players...\n');

  const periods = await prisma.historicalPeriod.findMany({
    where: { season: { year: 2025 } },
    include: {
      stats: {
        select: { id: true, playerName: true, fullName: true, teamCode: true, isPitcher: true },
      },
    },
    orderBy: { periodNumber: 'asc' },
  });

  for (const period of periods) {
    const seen = new Map<string, number>();
    const duplicates: string[] = [];

    for (const stat of period.stats) {
      // Key by player name + team (allowing same player on different teams after trade)
      const key = `${(stat.fullName || stat.playerName).toLowerCase()}_${stat.teamCode}_${stat.isPitcher}`;
      const count = (seen.get(key) || 0) + 1;
      seen.set(key, count);
      
      if (count === 2) {
        duplicates.push(`${stat.fullName || stat.playerName} (${stat.teamCode}, ${stat.isPitcher ? 'P' : 'H'})`);
      }
    }

    if (duplicates.length > 0) {
      console.log(`  ⚠️ Period ${period.periodNumber} duplicates:`);
      duplicates.forEach(d => console.log(`     - ${d}`));
    } else {
      console.log(`  ✅ Period ${period.periodNumber}: No duplicates`);
    }
  }
  console.log('');
}

async function main() {
  try {
    await applyDraftPositions();
    await fixOhtaniRule();
    await checkDuplicates();
    console.log('✅ Done!\n');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
