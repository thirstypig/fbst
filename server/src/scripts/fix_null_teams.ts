// Fix players with null MLB teams - use parent team for minor leaguers
import { prisma } from '../db/prisma';

const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';

// MLB team ID to abbreviation
const TEAM_ABBREVS: Record<number, string> = {
  108: 'LAA', 109: 'ARI', 110: 'BAL', 111: 'BOS', 112: 'CHC',
  113: 'CIN', 114: 'CLE', 115: 'COL', 116: 'DET', 117: 'HOU',
  118: 'KC', 119: 'LAD', 120: 'WSH', 121: 'NYM', 133: 'OAK',
  134: 'PIT', 135: 'SD', 136: 'SEA', 137: 'SF', 138: 'STL',
  139: 'TB', 140: 'TEX', 141: 'TOR', 142: 'MIN', 143: 'PHI',
  144: 'ATL', 145: 'CWS', 146: 'MIA', 147: 'NYY', 158: 'MIL',
};

interface MLBPerson {
  id: number;
  fullName: string;
  currentTeam?: {
    id: number;
    name: string;
    parentOrgId?: number;
    parentOrgName?: string;
  };
  mlbDebutDate?: string;
}

async function fetchPlayerParentTeam(mlbId: number): Promise<string | null> {
  try {
    // Get player info with currentTeam info
    const url = `${MLB_API_BASE}/people/${mlbId}?hydrate=currentTeam`;
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    const person = data.people?.[0] as MLBPerson | undefined;
    
    if (!person?.currentTeam) return null;
    
    // Check if current team is MLB team
    const teamId = person.currentTeam.id;
    if (TEAM_ABBREVS[teamId]) {
      return TEAM_ABBREVS[teamId];
    }
    
    // Not an MLB team - try to get parent org (for minor league affiliates)
    const parentOrgId = person.currentTeam.parentOrgId;
    if (parentOrgId && TEAM_ABBREVS[parentOrgId]) {
      console.log(`    ${person.fullName}: Minor league → parent ${TEAM_ABBREVS[parentOrgId]}`);
      return TEAM_ABBREVS[parentOrgId];
    }
    
    // Alternative: query person's teams endpoint for MLB team history
    const teamsUrl = `${MLB_API_BASE}/people/${mlbId}?hydrate=stats(group=[hitting,pitching],type=[career])`;
    const teamsResponse = await fetch(teamsUrl);
    if (teamsResponse.ok) {
      const teamsData = await teamsResponse.json();
      const stats = teamsData.people?.[0]?.stats;
      if (stats) {
        for (const group of stats) {
          for (const split of group.splits || []) {
            const tid = split?.team?.id;
            if (tid && TEAM_ABBREVS[tid]) {
              console.log(`    ${person.fullName}: Using career team ${TEAM_ABBREVS[tid]}`);
              return TEAM_ABBREVS[tid];
            }
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

async function fixNullTeams() {
  console.log('\n🔧 Fixing players with null MLB teams...\n');

  // Get all stats with null mlbTeam but have mlbId
  const stats = await prisma.historicalPlayerStat.findMany({
    where: {
      mlbTeam: null,
      mlbId: { not: null },
    },
    select: {
      id: true,
      mlbId: true,
      fullName: true,
      playerName: true,
      teamCode: true,
      period: {
        select: { periodNumber: true },
      },
    },
  });

  console.log(`Found ${stats.length} players with null MLB teams\n`);

  // Group by mlbId to avoid duplicate API calls
  const mlbIdMap = new Map<string, typeof stats>();
  for (const stat of stats) {
    const existing = mlbIdMap.get(stat.mlbId!) || [];
    existing.push(stat);
    mlbIdMap.set(stat.mlbId!, existing);
  }

  let fixed = 0;
  let idx = 0;
  for (const [mlbId, playerStats] of mlbIdMap) {
    idx++;
    if (idx > 1) await new Promise(r => setTimeout(r, 200)); // Rate limit

    const team = await fetchPlayerParentTeam(parseInt(mlbId));
    
    if (team) {
      for (const stat of playerStats) {
        await prisma.historicalPlayerStat.update({
          where: { id: stat.id },
          data: { mlbTeam: team },
        });
        fixed++;
      }
      console.log(`✅ P${playerStats[0].period.periodNumber} ${playerStats[0].fullName || playerStats[0].playerName}: ${team}`);
    } else {
      console.log(`❌ Could not find team for ${playerStats[0].fullName || playerStats[0].playerName}`);
    }

    if (idx % 20 === 0) {
      console.log(`  --- Progress: ${idx}/${mlbIdMap.size} ---`);
    }
  }

  console.log(`\n✅ Fixed ${fixed} player entries\n`);
}

async function main() {
  try {
    await fixNullTeams();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
