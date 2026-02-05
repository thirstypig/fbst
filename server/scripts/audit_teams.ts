
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const years = [2004, 2009, 2016];
  for (const year of years) {
    console.log(`--- Year ${year} ---`);
    const stats = await prisma.historicalPlayerStat.groupBy({
      by: ['teamCode'],
      where: {
        period: {
          season: {
            year: year
          }
        }
      },
      _count: true
    });
    
    for (const team of stats) {
      if (team.teamCode.startsWith('UNK')) {
        const samples = await prisma.historicalPlayerStat.findMany({
          where: {
            teamCode: team.teamCode,
            period: { season: { year } }
          },
          take: 5,
          select: { playerName: true }
        });
        console.log(`Year ${year} Team ${team.teamCode} samples:`, samples.map(s => s.playerName).join(', '));
      }
    }
    console.log(JSON.stringify(stats, null, 2));
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
