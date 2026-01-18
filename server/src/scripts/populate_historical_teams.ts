// Fetch historical MLB team for each player during period dates
import { prisma } from '../db/prisma';

const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';

// MLB team abbreviations
const TEAM_ABBREVS: Record<number, string> = {
  108: 'LAA', 109: 'ARI', 110: 'BAL', 111: 'BOS', 112: 'CHC',
  113: 'CIN', 114: 'CLE', 115: 'COL', 116: 'DET', 117: 'HOU',
  118: 'KC', 119: 'LAD', 120: 'WSH', 121: 'NYM', 133: 'OAK',
  134: 'PIT', 135: 'SD', 136: 'SEA', 137: 'SF', 138: 'STL',
  139: 'TB', 140: 'TEX', 141: 'TOR', 142: 'MIN', 143: 'PHI',
  144: 'ATL', 145: 'CWS', 146: 'MIA', 147: 'NYY', 158: 'MIL',
};

interface MLBTeamInfo {
  id: number;
  name: string;
}

async function fetchPlayerTeamAtDate(mlbId: number, date: string): Promise<string | null> {
  try {
    // Use MLB roster API to find team at specific date
    const url = `${MLB_API_BASE}/people/${mlbId}?hydrate=currentTeam,stats(group=[hitting,pitching],type=[byDateRange],startDate=${date},endDate=${date})`;
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    const person = data.people?.[0];
    
    // Try to get team from stats for that date
    const stats = person?.stats;
    if (stats) {
      for (const stat of stats) {
        const split = stat.splits?.[0];
        if (split?.team?.id) {
          return TEAM_ABBREVS[split.team.id] || split.team.name;
        }
      }
    }
    
    // Fallback to current team
    const teamId = person?.currentTeam?.id;
    return teamId ? (TEAM_ABBREVS[teamId] || person.currentTeam.name) : 'FA';
  } catch {
    return null;
  }
}

async function populateHistoricalTeams() {
  console.log('\n🏟️ Fetching historical MLB teams for period dates...\n');

  // Get all periods with dates
  const periods = await prisma.historicalPeriod.findMany({
    where: {
      season: { year: 2025 },
      startDate: { not: null },
    },
    include: {
      stats: {
        where: { mlbId: { not: null } },
        select: {
          id: true,
          mlbId: true,
          fullName: true,
          mlbTeam: true,
        },
      },
    },
    orderBy: { periodNumber: 'asc' },
  });

  for (const period of periods) {
    const midDate = period.startDate!;
    const dateStr = midDate.toISOString().split('T')[0];
    
    console.log(`\n📅 Period ${period.periodNumber} (${dateStr}): ${period.stats.length} players`);

    // Batch by unique MLB ID
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
      if (idx > 1) await new Promise(r => setTimeout(r, 100));

      const team = await fetchPlayerTeamAtDate(parseInt(mlbId), dateStr);
      if (team && team !== 'FA') {
        for (const id of statIds) {
          await prisma.historicalPlayerStat.update({
            where: { id },
            data: { mlbTeam: team },
          });
        }
        updated += statIds.length;
        console.log(`  ✅ ${period.stats.find(s => s.mlbId === mlbId)?.fullName}: ${team}`);
      }

      if (idx % 25 === 0) {
        console.log(`  --- Progress: ${idx}/${mlbIdMap.size} ---`);
      }
    }

    console.log(`  📊 Updated ${updated} stats`);
  }

  console.log('\n✅ Done!\n');
}

async function main() {
  try {
    await populateHistoricalTeams();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
