import 'dotenv/config';
import { prisma } from '../db/prisma';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Export MLB ID mappings to a reference file that can be used for recovery
 * and future imports. This creates a lookup table of player abbreviations
 * to their MLB IDs, full names, and positions.
 */
async function exportMlbIdReference(year: number) {
  console.log(`\n📤 Exporting MLB ID reference for ${year}...\n`);
  
  // Get all unique players with MLB IDs
  const players = await prisma.historicalPlayerStat.findMany({
    where: {
      period: { season: { year } },
      mlbId: { not: null }
    },
    select: {
      playerName: true,
      fullName: true,
      mlbId: true,
      teamCode: true,
      position: true,
      isPitcher: true,
    },
    distinct: ['playerName', 'teamCode'],
    orderBy: [
      { teamCode: 'asc' },
      { playerName: 'asc' },
    ],
  });
  
  console.log(`Found ${players.length} player-team combinations with MLB IDs`);
  
  // Create reference object
  const reference = {
    year,
    exportDate: new Date().toISOString(),
    totalPlayers: players.length,
    players: players.map(p => ({
      playerName: p.playerName,
      fullName: p.fullName,
      mlbId: p.mlbId,
      teamCode: p.teamCode,
      position: p.position,
      isPitcher: p.isPitcher,
    })),
  };
  
  // Save to data/mlb_id_reference directory
  const refDir = path.join(__dirname, '../data/mlb_id_reference');
  if (!fs.existsSync(refDir)) {
    fs.mkdirSync(refDir, { recursive: true });
  }
  
  const refPath = path.join(refDir, `${year}_mlb_ids.json`);
  fs.writeFileSync(refPath, JSON.stringify(reference, null, 2));
  
  console.log(`✅ Saved reference to: ${refPath}\n`);
  
  // Also create a simple CSV for easy viewing
  const csvPath = path.join(refDir, `${year}_mlb_ids.csv`);
  const csvLines = ['playerName,fullName,mlbId,teamCode,position,isPitcher'];
  for (const p of reference.players) {
    csvLines.push(
      `"${p.playerName}","${p.fullName || ''}",${p.mlbId},${p.teamCode},"${p.position || ''}",${p.isPitcher}`
    );
  }
  fs.writeFileSync(csvPath, csvLines.join('\n'));
  
  console.log(`✅ Saved CSV to: ${csvPath}\n`);
  
  return refPath;
}

async function main() {
  console.log('=== MLB ID Reference Export ===');
  
  const years = [2023, 2024, 2025];
  
  for (const year of years) {
    try {
      await exportMlbIdReference(year);
    } catch (error: any) {
      console.log(`⚠️  Skipping ${year}: ${error.message}\n`);
    }
  }
  
  console.log('🎉 Export complete!\n');
  console.log('💡 These reference files can be used to:');
  console.log('   - Recover MLB IDs after accidental data loss');
  console.log('   - Populate MLB IDs during import');
  console.log('   - Verify player data consistency\n');
  
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
