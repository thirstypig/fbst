// Populate position and MLB team from MLB API
import { prisma } from '../db/prisma';

const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';

interface MLBPlayerInfo {
  id: number;
  fullName: string;
  primaryPosition?: { abbreviation: string };
  currentTeam?: { name: string };
}

async function fetchMLBPlayerInfo(mlbId: number): Promise<MLBPlayerInfo | null> {
  try {
    const url = `${MLB_API_BASE}/people/${mlbId}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data.people?.[0] || null;
  } catch {
    return null;
  }
}

async function populatePositionAndTeam() {
  console.log('\n📋 Populating position and MLB team from MLB API...\n');

  // Get unique MLB IDs
  const uniqueStats = await prisma.historicalPlayerStat.findMany({
    where: {
      mlbId: { not: null },
      OR: [
        { position: null },
        { mlbTeam: null },
      ],
    },
    select: {
      mlbId: true,
    },
    distinct: ['mlbId'],
  });

  console.log(`Found ${uniqueStats.length} unique MLB IDs to look up\n`);

  // Build lookup map
  const infoMap = new Map<string, { position: string; mlbTeam: string }>();

  for (let i = 0; i < uniqueStats.length; i++) {
    const mlbId = parseInt(uniqueStats[i].mlbId!);
    
    // Rate limit
    if (i > 0) await new Promise(r => setTimeout(r, 50));

    const info = await fetchMLBPlayerInfo(mlbId);
    if (info) {
      infoMap.set(uniqueStats[i].mlbId!, {
        position: info.primaryPosition?.abbreviation || 'UT',
        mlbTeam: info.currentTeam?.name || 'Free Agent',
      });
      console.log(`✅ ${info.fullName}: ${info.primaryPosition?.abbreviation || 'UT'} - ${info.currentTeam?.name || 'FA'}`);
    }

    if ((i + 1) % 50 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${uniqueStats.length} ---\n`);
    }
  }

  console.log(`\nFetched info for ${infoMap.size} players. Now updating database...\n`);

  // Update all stats with position and team
  let updated = 0;
  const allStats = await prisma.historicalPlayerStat.findMany({
    where: { mlbId: { not: null } },
    select: { id: true, mlbId: true },
  });

  for (const stat of allStats) {
    const info = infoMap.get(stat.mlbId!);
    if (info) {
      await prisma.historicalPlayerStat.update({
        where: { id: stat.id },
        data: {
          position: info.position,
          mlbTeam: info.mlbTeam,
        },
      });
      updated++;
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Updated ${updated} player stats with position and MLB team\n`);
}

async function main() {
  try {
    await populatePositionAndTeam();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
