// server/src/scripts/link_historical_players.ts
/**
 * Link historical player stats to current Player records via MLB ID
 * 
 * Usage: tsx src/scripts/link_historical_players.ts
 * 
 * This script:
 * 1. Finds all HistoricalPlayerStat records with mlbId but no playerId
 * 2. Looks up matching Player records by mlbId
 * 3. Updates the playerId field to link them
 * 
 * This allows the archive to display canonical player names from the Player table
 */

import { prisma } from '../db/prisma';

async function linkHistoricalPlayers() {
  console.log('\n🔗 Starting historical player linking process...\n');

  try {
    // Find all historical stats with MLB ID but no player link
    const unlinkedStats = await prisma.historicalPlayerStat.findMany({
      where: {
        mlbId: { not: null },
        playerId: null,
      },
      select: {
        id: true,
        mlbId: true,
        playerName: true,
      },
    });

    console.log(`Found ${unlinkedStats.length} unlinked historical player records\n`);

    if (unlinkedStats.length === 0) {
      console.log('✅ All historical players are already linked!');
      return;
    }

    // Group by MLB ID to avoid duplicate lookups
    const mlbIdGroups = unlinkedStats.reduce((acc, stat) => {
      if (!stat.mlbId) return acc;
      if (!acc[stat.mlbId]) {
        acc[stat.mlbId] = [];
      }
      acc[stat.mlbId].push(stat);
      return acc;
    }, {} as Record<string, typeof unlinkedStats>);

    const uniqueMlbIds = Object.keys(mlbIdGroups);
    console.log(`Processing ${uniqueMlbIds.length} unique MLB IDs...\n`);

    let linkedCount = 0;
    let notFoundCount = 0;

    for (const mlbId of uniqueMlbIds) {
      const stats = mlbIdGroups[mlbId];
      
      // Look up player by MLB ID
      const player = await prisma.player.findFirst({
        where: { mlbId: parseInt(mlbId) },
        select: { id: true, name: true, mlbId: true },
      });

      if (player) {
        // Update all historical stats for this MLB ID
        const result = await prisma.historicalPlayerStat.updateMany({
          where: {
            id: { in: stats.map(s => s.id) },
          },
          data: {
            playerId: player.id,
          },
        });

        linkedCount += result.count;
        console.log(`✓ Linked MLB ID ${mlbId} (${player.name}) - ${result.count} records updated`);
      } else {
        notFoundCount += stats.length;
        console.log(`⚠️  MLB ID ${mlbId} (${stats[0].playerName}) - No matching Player record`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Successfully linked: ${linkedCount} records`);
    console.log(`   ⚠️  Not found: ${notFoundCount} records`);
    console.log(`\n💡 Tip: Players not found may need to be added to the current season data first.`);
    console.log(`   Once they appear in current stats, run this script again to link them.`);

  } catch (error) {
    console.error('\n❌ Error during linking:', error);
    throw error;
  }
}

async function main() {
  try {
    await linkHistoricalPlayers();
    console.log('\n🎉 Linking process complete!\n');
  } catch (error) {
    console.error('\n❌ Linking failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
