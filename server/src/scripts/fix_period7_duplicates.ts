// Fix duplicates in Period 7
import { prisma } from '../db/prisma';

async function fixDuplicates() {
  console.log('\n🔧 Fixing Period 7 duplicates...\n');

  const period7 = await prisma.historicalPeriod.findFirst({
    where: { season: { year: 2025 }, periodNumber: 7 },
  });
  if (!period7) {
    console.log('Period 7 not found');
    return;
  }

  const stats = await prisma.historicalPlayerStat.findMany({
    where: { periodId: period7.id },
    orderBy: { id: 'asc' },
  });

  const seen = new Map<string, number>();
  const toDelete: number[] = [];
  
  for (const stat of stats) {
    const key = `${stat.playerName.toLowerCase()}_${stat.teamCode}_${stat.isPitcher}`;
    if (seen.has(key)) {
      toDelete.push(stat.id);
      console.log(`  Deleting duplicate: ${stat.playerName} (${stat.teamCode})`);
    } else {
      seen.set(key, stat.id);
    }
  }

  if (toDelete.length > 0) {
    await prisma.historicalPlayerStat.deleteMany({
      where: { id: { in: toDelete } },
    });
    console.log(`\n✅ Deleted ${toDelete.length} duplicates\n`);
  } else {
    console.log('No duplicates found\n');
  }
}

fixDuplicates().finally(() => prisma.$disconnect());
