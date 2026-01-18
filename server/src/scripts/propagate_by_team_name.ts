// Propagate MLB ID and fullName to same player on same team across all periods
// Rule: Same abbreviated name + same team code = same player
import { prisma } from '../db/prisma';

async function propagateByTeamAndName() {
  console.log('\n🔄 Propagating MLB ID/fullName by team + abbreviated name...\n');

  // Get all stats with MLB ID (source of truth)
  const linkedStats = await prisma.historicalPlayerStat.findMany({
    where: {
      mlbId: { not: null },
      fullName: { not: null },
    },
    select: {
      playerName: true, // abbreviated name
      teamCode: true,
      mlbId: true,
      fullName: true,
    },
    distinct: ['playerName', 'teamCode'],
  });

  console.log(`Found ${linkedStats.length} unique linked player+team combinations\n`);

  // Create lookup map: playerName_teamCode -> { mlbId, fullName }
  const lookupMap = new Map<string, { mlbId: string; fullName: string }>();
  for (const stat of linkedStats) {
    const key = `${stat.playerName.toLowerCase().trim()}_${stat.teamCode}`;
    lookupMap.set(key, { mlbId: stat.mlbId!, fullName: stat.fullName! });
  }

  // Find all unlinked stats
  const unlinkedStats = await prisma.historicalPlayerStat.findMany({
    where: {
      OR: [
        { mlbId: null },
        { fullName: null },
      ],
    },
    select: {
      id: true,
      playerName: true,
      teamCode: true,
      period: {
        select: { periodNumber: true },
      },
    },
  });

  console.log(`Found ${unlinkedStats.length} unlinked stats to check\n`);

  let updated = 0;
  for (const stat of unlinkedStats) {
    const key = `${stat.playerName.toLowerCase().trim()}_${stat.teamCode}`;
    const match = lookupMap.get(key);

    if (match) {
      await prisma.historicalPlayerStat.update({
        where: { id: stat.id },
        data: {
          mlbId: match.mlbId,
          fullName: match.fullName,
        },
      });
      updated++;
      console.log(`✅ P${stat.period.periodNumber} ${stat.teamCode}: ${stat.playerName} → ${match.fullName} (#${match.mlbId})`);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Updated ${updated} player stats`);

  // Show remaining unlinked
  const stillUnlinked = await prisma.historicalPlayerStat.count({
    where: { mlbId: null },
  });
  console.log(`❓ Still unlinked: ${stillUnlinked} players\n`);
}

async function main() {
  try {
    await propagateByTeamAndName();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
