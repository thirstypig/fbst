import { prisma } from '../db/prisma';

async function checkPlayers() {
  const count = await prisma.player.count();
  console.log(`Total players in database: ${count}`);
  
  const sample = await prisma.player.findMany({
    take: 10,
    select: { name: true, mlbId: true }
  });
  console.log('\nSample players:');
  sample.forEach(p => console.log(`  ${p.name} (MLB ID: ${p.mlbId})`));
}

checkPlayers().finally(() => prisma.$disconnect());
