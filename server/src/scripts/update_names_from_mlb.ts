// Update display names from MLB API - the official source of truth
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

async function updateDisplayNamesFromMLB() {
  console.log('\n🔄 Updating display names from MLB API (source of truth)...\n');

  // Get all unique MLB IDs from historical stats
  const statsWithMlbId = await prisma.historicalPlayerStat.findMany({
    where: {
      mlbId: { not: null },
    },
    select: {
      id: true,
      mlbId: true,
      fullName: true,
      playerName: true,
    },
    distinct: ['mlbId'],
  });

  console.log(`Found ${statsWithMlbId.length} unique MLB IDs to look up\n`);

  // Group by MLB ID to avoid duplicate API calls
  const mlbIdToName = new Map<string, { fullName: string; position?: string; team?: string }>();
  
  let fetched = 0;
  let failed = 0;

  for (let i = 0; i < statsWithMlbId.length; i++) {
    const stat = statsWithMlbId[i];
    const mlbId = parseInt(stat.mlbId!);
    
    // Rate limit: 50ms between requests
    if (i > 0) await new Promise(r => setTimeout(r, 50));

    const info = await fetchMLBPlayerInfo(mlbId);
    
    if (info) {
      mlbIdToName.set(stat.mlbId!, {
        fullName: info.fullName,
        position: info.primaryPosition?.abbreviation,
        team: info.currentTeam?.name,
      });
      fetched++;
      console.log(`✅ ${stat.mlbId} → ${info.fullName} (${info.primaryPosition?.abbreviation || 'N/A'})`);
    } else {
      failed++;
      console.log(`❌ ${stat.mlbId} → Failed to fetch`);
    }

    // Progress every 50
    if ((i + 1) % 50 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${statsWithMlbId.length} ---\n`);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Fetched: ${fetched} | Failed: ${failed}`);
  console.log(`\nNow updating all stats with official names...\n`);

  // Update all stats with the fetched names
  let updated = 0;
  const allStats = await prisma.historicalPlayerStat.findMany({
    where: { mlbId: { not: null } },
    select: { id: true, mlbId: true },
  });

  for (const stat of allStats) {
    const info = mlbIdToName.get(stat.mlbId!);
    if (info) {
      await prisma.historicalPlayerStat.update({
        where: { id: stat.id },
        data: { fullName: info.fullName },
      });
      updated++;
    }
  }

  console.log(`✅ Updated ${updated} player stats with official MLB names\n`);
}

async function main() {
  try {
    await updateDisplayNamesFromMLB();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
