// server/src/scripts/fullMatchAllSeasons.ts
// Runs MLB API matching for ALL seasons/periods
// Matches: full names, MLB IDs, AND MLB teams (based on period date)
// Run: npx tsx src/scripts/fullMatchAllSeasons.ts [--dry-run]

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MLBPerson {
  id: number;
  fullName: string;
  firstName: string;
  lastName: string;
  primaryPosition?: { abbreviation: string };
}

const OPENING_DAYS: Record<number, string> = {
  2008: '2008-03-25',
  2009: '2009-04-05',
  2010: '2010-04-04',
  2011: '2011-03-31',
  2012: '2012-03-28',
  2013: '2013-03-31',
  2014: '2014-03-22',
  2015: '2015-04-05',
  2016: '2016-04-03',
  2017: '2017-04-02',
  2018: '2018-03-29',
  2019: '2019-03-20',
  2020: '2020-07-23',
  2021: '2021-04-01',
  2022: '2022-04-07',
  2023: '2023-03-30',
  2024: '2024-03-20',
  2025: '2025-03-18',
};

function parseAbbreviatedName(name: string): { firstInitial: string; lastName: string } | null {
  const match = name.match(/^([A-Za-z]+)\.?\s+(.+)$/);
  if (!match) return null;
  return { firstInitial: match[1].charAt(0).toUpperCase(), lastName: match[2].trim() };
}

async function searchMLBPlayer(lastName: string, season: number): Promise<MLBPerson[]> {
  try {
    const url = `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(lastName)}&sportIds=1&seasons=${season}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json() as any;
    return data.people || [];
  } catch {
    return [];
  }
}

async function getMLBTeamOnDate(mlbId: string, date: string): Promise<string | null> {
  try {
    const url = `https://statsapi.mlb.com/api/v1/people/${mlbId}?hydrate=currentTeam&date=${date}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json() as any;
    const person = data.people?.[0];
    return person?.currentTeam?.abbreviation || null;
  } catch {
    return null;
  }
}

async function processYear(year: number, dryRun: boolean) {
  console.log(`\n=== Processing ${year} ===`);
  
  // Get all periods for this year
  const periods = await prisma.historicalPeriod.findMany({
    where: { season: { year } },
    orderBy: { periodNumber: 'asc' },
    select: {
      id: true,
      periodNumber: true,
      startDate: true,
    }
  });

  console.log(`  Found ${periods.length} periods`);

  const nameCache = new Map<string, MLBPerson[]>();
  let totalMatched = 0;
  let totalTeamsUpdated = 0;

  for (const period of periods) {
    // Get date to use for team lookup
    const dateForTeam = period.periodNumber === 1 
      ? (OPENING_DAYS[year] || `${year}-04-01`)
      : period.startDate?.toISOString().split('T')[0] || OPENING_DAYS[year] || `${year}-04-01`;

    console.log(`\n  Period ${period.periodNumber} (date: ${dateForTeam})`);

    // Get players in this period without mlbId
    const playersWithoutId = await prisma.historicalPlayerStat.findMany({
      where: {
        periodId: period.id,
        OR: [{ mlbId: null }, { mlbId: '' }]
      },
      select: { id: true, playerName: true, isPitcher: true, position: true }
    });

    // Get players with mlbId but no mlbTeam
    const playersWithoutTeam = await prisma.historicalPlayerStat.findMany({
      where: {
        periodId: period.id,
        mlbId: { not: null },
        OR: [{ mlbTeam: null }, { mlbTeam: '' }]
      },
      select: { id: true, playerName: true, mlbId: true }
    });

    console.log(`    - ${playersWithoutId.length} need name match, ${playersWithoutTeam.length} need team lookup`);

    // Match names
    for (const player of playersWithoutId) {
      const parsed = parseAbbreviatedName(player.playerName);
      if (!parsed) continue;

      let candidates = nameCache.get(parsed.lastName);
      if (!candidates) {
        candidates = await searchMLBPlayer(parsed.lastName, year);
        nameCache.set(parsed.lastName, candidates);
        await new Promise(r => setTimeout(r, 50));
      }

      // Filter by first initial
      let matches = candidates.filter(c => c.firstName?.charAt(0).toUpperCase() === parsed.firstInitial);

      // Filter by pitcher status
      if (matches.length > 1 && player.isPitcher !== null) {
        const pitcherCodes = ['P', 'SP', 'RP', 'TWP'];
        const pitcherMatches = matches.filter(c => {
          const isPitcher = pitcherCodes.includes(c.primaryPosition?.abbreviation?.toUpperCase() || '');
          return isPitcher === player.isPitcher;
        });
        if (pitcherMatches.length > 0) matches = pitcherMatches;
      }

      if (matches.length === 1) {
        const m = matches[0];
        const mlbId = String(m.id);
        
        // Also get team for this player on this date
        const mlbTeam = await getMLBTeamOnDate(mlbId, dateForTeam);
        await new Promise(r => setTimeout(r, 30));
        
        if (!dryRun) {
          await prisma.historicalPlayerStat.update({
            where: { id: player.id },
            data: { fullName: m.fullName, mlbId, mlbTeam: mlbTeam || undefined }
          });
        }
        console.log(`      ✓ ${player.playerName} → ${m.fullName} (${mlbId}) [${mlbTeam || '?'}]`);
        totalMatched++;
        if (mlbTeam) totalTeamsUpdated++;
      }
    }

    // Update teams for players who have mlbId but no team
    for (const player of playersWithoutTeam) {
      if (!player.mlbId) continue;
      
      const mlbTeam = await getMLBTeamOnDate(player.mlbId, dateForTeam);
      await new Promise(r => setTimeout(r, 30));
      
      if (mlbTeam) {
        if (!dryRun) {
          await prisma.historicalPlayerStat.update({
            where: { id: player.id },
            data: { mlbTeam }
          });
        }
        console.log(`      ⟳ ${player.playerName} → [${mlbTeam}]`);
        totalTeamsUpdated++;
      }
    }
  }

  return { matched: totalMatched, teamsUpdated: totalTeamsUpdated };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) console.log('DRY-RUN MODE - no changes will be made\n');

  // Get all years
  const seasons = await prisma.historicalSeason.findMany({
    select: { year: true },
    orderBy: { year: 'asc' }
  });

  console.log(`Processing ${seasons.length} seasons: ${seasons.map(s => s.year).join(', ')}`);

  let grandTotalMatched = 0;
  let grandTotalTeams = 0;

  for (const season of seasons) {
    const result = await processYear(season.year, dryRun);
    grandTotalMatched += result.matched;
    grandTotalTeams += result.teamsUpdated;
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Total Names Matched: ${grandTotalMatched}`);
  console.log(`Total Teams Updated: ${grandTotalTeams}`);

  await prisma.$disconnect();
}

main().catch(console.error);
