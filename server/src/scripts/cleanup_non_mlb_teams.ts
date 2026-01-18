// Clean up non-MLB team names to null
import { prisma } from '../db/prisma';

const MLB_ABBREVS = new Set([
  'LAA', 'ARI', 'BAL', 'BOS', 'CHC', 'CIN', 'CLE', 'COL', 'DET', 'HOU',
  'KC', 'LAD', 'WSH', 'NYM', 'OAK', 'PIT', 'SD', 'SEA', 'SF', 'STL',
  'TB', 'TEX', 'TOR', 'MIN', 'PHI', 'ATL', 'CWS', 'MIA', 'NYY', 'MIL'
]);

async function cleanup() {
  const stats = await prisma.historicalPlayerStat.findMany({
    where: { mlbTeam: { not: null } },
    select: { id: true, mlbTeam: true, fullName: true },
  });
  
  let cleaned = 0;
  for (const stat of stats) {
    if (stat.mlbTeam && !MLB_ABBREVS.has(stat.mlbTeam)) {
      console.log(`  Cleaning: ${stat.fullName} was "${stat.mlbTeam}" → null`);
      await prisma.historicalPlayerStat.update({
        where: { id: stat.id },
        data: { mlbTeam: null },
      });
      cleaned++;
    }
  }
  console.log(`\n✅ Cleaned ${cleaned} non-MLB team entries\n`);
}

cleanup().finally(() => prisma.$disconnect());
