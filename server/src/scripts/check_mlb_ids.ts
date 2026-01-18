import 'dotenv/config';
import { prisma } from '../db/prisma';

async function checkMlbIds() {
  console.log('Checking MLB ID status in database...\n');
  
  // Check 2024
  const stats2024 = await prisma.historicalPlayerStat.findMany({
    where: {
      period: { season: { year: 2024 } },
      mlbId: { not: null }
    },
    select: {
      playerName: true,
      mlbId: true,
      teamCode: true,
    },
    distinct: ['playerName'],
  });
  
  console.log(`2024: ${stats2024.length} unique players with MLB IDs`);
  
  // Check 2025
  const stats2025 = await prisma.historicalPlayerStat.findMany({
    where: {
      period: { season: { year: 2025 } },
      mlbId: { not: null }
    },
    select: {
      playerName: true,
      mlbId: true,
      teamCode: true,
    },
    distinct: ['playerName'],
  });
  
  console.log(`2025: ${stats2025.length} unique players with MLB IDs\n`);
  
  // Show sample if few
  if (stats2024.length > 0 && stats2024.length < 10) {
    console.log('Sample 2024 players with MLB IDs:');
    stats2024.forEach(s => console.log(`  - ${s.playerName} (${s.mlbId}) [${s.teamCode}]`));
  }
  
  await prisma.$disconnect();
}

checkMlbIds().catch(console.error);
