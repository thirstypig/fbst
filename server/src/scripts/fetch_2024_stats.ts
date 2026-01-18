
import { prisma } from '../db/prisma';

const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';

interface HittingStats {
  runs?: number;
  homeRuns?: number;
  rbi?: number;
  stolenBases?: number;
  avg?: string;
  atBats?: number;
  hits?: number;
}

interface PitchingStats {
  wins?: number;
  saves?: number;
  strikeOuts?: number;
  era?: string;
  whip?: string;
  inningsPitched?: string;
  earnedRuns?: number;
}

async function fetchPlayerStats(
  mlbId: number,
  startDate: string,
  endDate: string,
  isPitcher: boolean
): Promise<{ hitting?: HittingStats; pitching?: PitchingStats } | null> {
  try {
    const group = isPitcher ? 'pitching' : 'hitting';
    const url = `${MLB_API_BASE}/people/${mlbId}/stats?stats=byDateRange&group=${group}&startDate=${startDate}&endDate=${endDate}&sportId=1`;
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    const stats = data.stats?.[0]?.splits?.[0]?.stat;
    
    if (!stats) return null;
    
    if (isPitcher) {
      return {
        pitching: {
          wins: stats.wins,
          saves: stats.saves,
          strikeOuts: stats.strikeOuts,
          era: stats.era,
          whip: stats.whip,
          inningsPitched: stats.inningsPitched,
          earnedRuns: stats.earnedRuns,
        }
      };
    } else {
      return {
        hitting: {
          runs: stats.runs,
          homeRuns: stats.homeRuns,
          rbi: stats.rbi,
          stolenBases: stats.stolenBases,
          avg: stats.avg,
          atBats: stats.atBats,
          hits: stats.hits,
        }
      };
    }
  } catch (error) {
    return null;
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function fetch2024Stats() {
  console.log('\n⚾ Fetching 2024 player stats from MLB API...\n');

  // Get all periods for 2024
  const periods = await prisma.historicalPeriod.findMany({
    where: {
      season: { year: 2024 },
      startDate: { not: null },
      endDate: { not: null },
    },
    include: {
      stats: {
        where: { mlbId: { not: null } },
        select: {
          id: true,
          mlbId: true,
          isPitcher: true,
          fullName: true,
        },
      },
    },
    orderBy: { periodNumber: 'asc' },
  });

  console.log(`Found ${periods.length} periods for 2024\n`);

  for (const period of periods) {
    const startDate = formatDate(period.startDate!);
    const endDate = formatDate(period.endDate!);
    
    console.log(`\n📅 Period ${period.periodNumber}: ${startDate} to ${endDate}`);
    console.log(`   ${period.stats.length} players with MLB IDs\n`);

    let updated = 0;
    let noStats = 0;

    for (let i = 0; i < period.stats.length; i++) {
      const stat = period.stats[i];
      const mlbId = parseInt(stat.mlbId!);

      // Rate limit: 50ms between requests (MLB API is usually generous but let's be safe)
      if (i > 0) await new Promise(r => setTimeout(r, 50));

      const result = await fetchPlayerStats(mlbId, startDate, endDate, stat.isPitcher);

      if (result) {
        if (stat.isPitcher && result.pitching) {
          const p = result.pitching;
          await prisma.historicalPlayerStat.update({
            where: { id: stat.id },
            data: {
              W: p.wins ?? 0,
              SV: p.saves ?? 0,
              K: p.strikeOuts ?? 0,
              ERA: p.era ? parseFloat(p.era) : 0,
              WHIP: p.whip ? parseFloat(p.whip) : 0,
              IP: p.inningsPitched ? parseFloat(p.inningsPitched) : 0,
              ER: p.earnedRuns ?? 0,
            },
          });
          updated++;
        } else if (!stat.isPitcher && result.hitting) {
          const h = result.hitting;
          await prisma.historicalPlayerStat.update({
            where: { id: stat.id },
            data: {
              R: h.runs ?? 0,
              HR: h.homeRuns ?? 0,
              RBI: h.rbi ?? 0,
              SB: h.stolenBases ?? 0,
              AVG: h.avg ? parseFloat(h.avg) : 0,
              AB: h.atBats ?? 0,
              H: h.hits ?? 0,
            },
          });
          updated++;
        }
      } else {
        noStats++;
      }

      // Progress every 50
      if ((i + 1) % 50 === 0) {
        console.log(`  --- Progress: ${i + 1}/${period.stats.length} ---`);
      }
    }

    console.log(`\n  📊 Period ${period.periodNumber} complete: ${updated} updated, ${noStats} no stats found`);
  }

  console.log('\n✅ All 2024 periods processed!\n');
}

fetch2024Stats()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
