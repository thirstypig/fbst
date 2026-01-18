// Fetch correct MLB team for each player during their specific period dates
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

interface MLBTeamResponse {
  stats?: Array<{
    splits?: Array<{
      team?: { id: number; name: string };
    }>;
  }>;
}

async function fetchTeamDuringDateRange(mlbId: number, startDate: string, endDate: string): Promise<string | null> {
  try {
    // Use MLB stats API with date range to get the team the player was on
    const url = `${MLB_API_BASE}/people/${mlbId}/stats?stats=byDateRange&startDate=${startDate}&endDate=${endDate}&group=hitting,pitching`;
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = (await response.json()) as MLBTeamResponse;
    
    // Look for the team in the stats response
    if (data.stats) {
      for (const group of data.stats) {
        for (const split of group.splits || []) {
          const teamId = split?.team?.id;
          if (teamId && TEAM_ABBREVS[teamId]) {
            return TEAM_ABBREVS[teamId];
          }
        }
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

async function fetchAllTeamsForPeriods() {
  console.log('\n⚾ Fetching correct MLB teams for each period...\n');

  // Get all periods with dates
  const periods = await prisma.historicalPeriod.findMany({
    where: {
      season: { year: 2025 },
      startDate: { not: null },
      endDate: { not: null },
    },
    include: {
      stats: {
        where: { mlbId: { not: null } },
        select: {
          id: true,
          mlbId: true,
          fullName: true,
          playerName: true,
          mlbTeam: true,
        },
      },
    },
    orderBy: { periodNumber: 'asc' },
  });

  for (const period of periods) {
    const startDate = period.startDate!.toISOString().split('T')[0];
    const endDate = period.endDate!.toISOString().split('T')[0];
    
    console.log(`\n📅 Period ${period.periodNumber} (${startDate} to ${endDate}): ${period.stats.length} players`);

    // Track unique MLB IDs to avoid duplicate API calls
    const mlbIdMap = new Map<string, number[]>();
    for (const stat of period.stats) {
      const ids = mlbIdMap.get(stat.mlbId!) || [];
      ids.push(stat.id);
      mlbIdMap.set(stat.mlbId!, ids);
    }

    let updated = 0;
    let idx = 0;
    for (const [mlbId, statIds] of mlbIdMap) {
      idx++;
      if (idx > 1) await new Promise(r => setTimeout(r, 100)); // Rate limit

      const team = await fetchTeamDuringDateRange(parseInt(mlbId), startDate, endDate);
      
      if (team) {
        for (const id of statIds) {
          await prisma.historicalPlayerStat.update({
            where: { id },
            data: { mlbTeam: team },
          });
        }
        updated++;
        const playerName = period.stats.find(s => s.mlbId === mlbId)?.fullName || 
                          period.stats.find(s => s.mlbId === mlbId)?.playerName;
        console.log(`  ✅ ${playerName}: ${team}`);
      } else {
        const playerName = period.stats.find(s => s.mlbId === mlbId)?.fullName || 
                          period.stats.find(s => s.mlbId === mlbId)?.playerName;
        console.log(`  ❌ ${playerName}: No stats in period`);
      }

      if (idx % 25 === 0) {
        console.log(`  --- Progress: ${idx}/${mlbIdMap.size} ---`);
      }
    }

    console.log(`  📊 Updated ${updated} players`);
  }

  console.log('\n✅ Done!\n');
}

async function main() {
  try {
    await fetchAllTeamsForPeriods();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
