// server/src/scripts/check_player_mlbids.ts
/**
 * Quick diagnostic script to check MLB ID coverage in Player table
 */

import { prisma } from '../db/prisma';

async function checkPlayerCoverage() {
  try {
    // Get sample MLB IDs from historical data
    const historicalStats = await prisma.historicalPlayerStat.findMany({
      where: { mlbId: { not: null } },
      select: { mlbId: true, playerName: true },
      take: 10,
      distinct: ['mlbId'],
    });

    console.log('\n📊 Sample historical players with MLB IDs:');
    historicalStats.forEach(stat => {
      console.log(`  ${stat.playerName} (MLB ID: ${stat.mlbId})`);
    });

    // Check which ones exist in Player table
    const mlbIds = historicalStats
      .map(s => parseInt(s.mlbId!))
      .filter(Number.isFinite);

    const matchingPlayers = await prisma.player.findMany({
      where: { mlbId: { in: mlbIds } },
      select: { mlbId: true, name: true },
    });

    console.log(`\n✅ Found ${matchingPlayers.length} matching players in Player table:`);
    matchingPlayers.forEach(p => {
      console.log(`  ${p.name} (MLB ID: ${p.mlbId})`);
    });

    const totalPlayers = await prisma.player.count();
    const playersWithMlbId = await prisma.player.count({
      where: { mlbId: { not: null } }
    });

    console.log(`\n📈 Player table stats:`);
    console.log(`  Total players: ${totalPlayers}`);
    console.log(`  Players with MLB ID: ${playersWithMlbId}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPlayerCoverage();
