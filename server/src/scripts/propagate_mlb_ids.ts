import 'dotenv/config';
import { prisma } from '../db/prisma';

/**
 * Propagate MLB IDs across all periods for the same player within each year.
 * If a player has an MLB ID in any period, copy it to all their other periods.
 */
async function propagateMlbIds(year: number) {
  console.log(`\n🔄 Propagating MLB IDs for ${year}...\n`);
  
  // Get all players with MLB IDs for this year
  const playersWithIds = await prisma.historicalPlayerStat.findMany({
    where: {
      period: { season: { year } },
      mlbId: { not: null }
    },
    select: {
      playerName: true,
      mlbId: true,
      fullName: true,
      teamCode: true,
    },
    distinct: ['playerName', 'teamCode'],
  });
  
  console.log(`Found ${playersWithIds.length} player-team combinations with MLB IDs`);
  
  // Build lookup map: playerName_teamCode -> mlbId and fullName
  const lookup = new Map<string, { mlbId: string; fullName: string | null }>();
  for (const p of playersWithIds) {
    const key = `${p.playerName.toLowerCase()}_${p.teamCode}`;
    lookup.set(key, { mlbId: p.mlbId!, fullName: p.fullName });
  }
  
  // Get all periods for this year
  const periods = await prisma.historicalPeriod.findMany({
    where: { season: { year } },
    select: { id: true, periodNumber: true },
    orderBy: { periodNumber: 'asc' },
  });
  
  console.log(`Processing ${periods.length} periods...\n`);
  
  let totalUpdated = 0;
  
  for (const period of periods) {
    // Get all players in this period without MLB IDs
    const playersWithoutIds = await prisma.historicalPlayerStat.findMany({
      where: {
        periodId: period.id,
        OR: [
          { mlbId: null },
          { mlbId: '' },
        ]
      },
      select: {
        id: true,
        playerName: true,
        teamCode: true,
      },
    });
    
    let periodUpdated = 0;
    
    for (const player of playersWithoutIds) {
      const key = `${player.playerName.toLowerCase()}_${player.teamCode}`;
      const match = lookup.get(key);
      
      if (match) {
        await prisma.historicalPlayerStat.update({
          where: { id: player.id },
          data: {
            mlbId: match.mlbId,
            fullName: match.fullName,
          },
        });
        periodUpdated++;
        totalUpdated++;
      }
    }
    
    if (periodUpdated > 0) {
      console.log(`  Period ${period.periodNumber}: Updated ${periodUpdated} players`);
    }
  }
  
  console.log(`\n✅ Total updated for ${year}: ${totalUpdated} player records`);
  
  // Verify final count
  const finalCount = await prisma.historicalPlayerStat.count({
    where: {
      period: { season: { year } },
      mlbId: { not: null },
    },
  });
  
  console.log(`📊 Final count: ${finalCount} records with MLB IDs\n`);
}

async function main() {
  console.log('=== MLB ID Propagation ===');
  
  await propagateMlbIds(2024);
  await propagateMlbIds(2025);
  
  console.log('🎉 Done!\n');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
