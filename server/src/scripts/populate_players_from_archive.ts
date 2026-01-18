// Import unique player names from historical archive into Player table for autocomplete
import { prisma } from '../db/prisma';

async function populatePlayersFromArchive() {
  console.log('\n🔄 Populating Player table from historical archive...\n');

  // Get all unique fullName values from HistoricalPlayerStat
  const stats = await prisma.historicalPlayerStat.findMany({
    select: {
      fullName: true,
      playerName: true,
      mlbId: true,
    },
    distinct: ['fullName'],
  });

  console.log(`Found ${stats.length} unique players in archive`);

  let added = 0;
  let skipped = 0;

  for (const stat of stats) {
    const name = stat.fullName || stat.playerName;
    if (!name || name.length < 2) {
      skipped++;
      continue;
    }

    // Check if player already exists
    const existing = await prisma.player.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Add new player
    await prisma.player.create({
      data: {
        name: name,
        mlbId: stat.mlbId ? parseInt(stat.mlbId) : null,
        posPrimary: 'UT', posList: 'UT',
      }
    });
    added++;
    
    if (added % 20 === 0) {
      console.log(`  Added ${added} players...`);
    }
  }

  console.log(`\n✅ Done! Added ${added} new players, skipped ${skipped} (duplicates/empty)`);
  
  const total = await prisma.player.count();
  console.log(`Total players in database: ${total}\n`);
}

async function main() {
  try {
    await populatePlayersFromArchive();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
