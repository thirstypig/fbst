// server/src/scripts/autoMatchPlayers.ts
// Auto-matches abbreviated player names (e.g., "A. Riley") to full names using MLB API
// Run: npx tsx src/scripts/autoMatchPlayers.ts [year]

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MLBPerson {
  id: number;
  fullName: string;
  firstName: string;
  lastName: string;
  primaryPosition?: { abbreviation: string };
  pitchHand?: { code: string };
  batSide?: { code: string };
}

interface MatchResult {
  playerName: string;
  matched: boolean;
  fullName?: string;
  mlbId?: string;
  reason?: string;
}

function parseAbbreviatedName(name: string): { firstInitial: string; lastName: string } | null {
  // Patterns: "A. Riley", "J.D. Martinez", "CJ. Abrams", "Ad. Gonzalez"
  const match = name.match(/^([A-Za-z]+)\.?\s+(.+)$/);
  if (!match) return null;
  
  const firstInitial = match[1].charAt(0).toUpperCase();
  const lastName = match[2].trim();
  
  return { firstInitial, lastName };
}

async function searchMLBPlayer(lastName: string, season: number): Promise<MLBPerson[]> {
  try {
    // Use MLB Stats API people search
    const url = `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(lastName)}&sportIds=1&seasons=${season}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const data = await response.json() as any;
    return data.people || [];
  } catch (error) {
    console.error(`Error searching MLB API for "${lastName}":`, error);
    return [];
  }
}

function isPitcherPosition(pos: string | null | undefined): boolean {
  if (!pos) return false;
  const pitcherCodes = ['P', 'SP', 'RP', 'TWP'];
  return pitcherCodes.includes(pos.toUpperCase());
}

async function autoMatchPlayersForYear(year: number, dryRun: boolean = false): Promise<MatchResult[]> {
  console.log(`\n=== Auto-Matching Players for ${year} ===`);
  
  // Get all players without mlbId for this year
  const players = await prisma.historicalPlayerStat.findMany({
    where: {
      period: { season: { year } },
      OR: [
        { mlbId: null },
        { mlbId: '' }
      ]
    },
    select: {
      id: true,
      playerName: true,
      fullName: true,
      position: true,
      isPitcher: true,
      mlbId: true,
    },
    distinct: ['playerName']
  });

  console.log(`Found ${players.length} unique players without MLB ID`);

  const results: MatchResult[] = [];
  const cache = new Map<string, MLBPerson[]>();

  for (const player of players) {
    const parsed = parseAbbreviatedName(player.playerName);
    if (!parsed) {
      results.push({
        playerName: player.playerName,
        matched: false,
        reason: 'Could not parse name format'
      });
      continue;
    }

    // Check cache first
    let candidates = cache.get(parsed.lastName);
    if (!candidates) {
      candidates = await searchMLBPlayer(parsed.lastName, year);
      cache.set(parsed.lastName, candidates);
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Filter by first initial
    let matches = candidates.filter(c => 
      c.firstName?.charAt(0).toUpperCase() === parsed.firstInitial
    );

    // Filter by pitcher status if we have that info
    if (matches.length > 1 && player.isPitcher !== null) {
      const pitcherMatches = matches.filter(c => {
        const isPitcher = isPitcherPosition(c.primaryPosition?.abbreviation);
        return isPitcher === player.isPitcher;
      });
      if (pitcherMatches.length > 0) {
        matches = pitcherMatches;
      }
    }

    // Filter by position if we have that info and still multiple matches
    if (matches.length > 1 && player.position) {
      const positionMatches = matches.filter(c => 
        c.primaryPosition?.abbreviation?.toUpperCase() === player.position?.toUpperCase()
      );
      if (positionMatches.length === 1) {
        matches = positionMatches;
      }
    }

    if (matches.length === 1) {
      const match = matches[0];
      results.push({
        playerName: player.playerName,
        matched: true,
        fullName: match.fullName,
        mlbId: String(match.id)
      });

      if (!dryRun) {
        // Update all records with this player name in this year
        await prisma.historicalPlayerStat.updateMany({
          where: {
            playerName: player.playerName,
            period: { season: { year } }
          },
          data: {
            fullName: match.fullName,
            mlbId: String(match.id)
          }
        });
        console.log(`  ✓ ${player.playerName} → ${match.fullName} (${match.id})`);
      } else {
        console.log(`  [DRY-RUN] ${player.playerName} → ${match.fullName} (${match.id})`);
      }
    } else if (matches.length === 0) {
      results.push({
        playerName: player.playerName,
        matched: false,
        reason: `No matches found for "${parsed.firstInitial}. ${parsed.lastName}"`
      });
      console.log(`  ✗ ${player.playerName} - No matches`);
    } else {
      results.push({
        playerName: player.playerName,
        matched: false,
        reason: `Multiple matches (${matches.length}): ${matches.map(m => m.fullName).join(', ')}`
      });
      console.log(`  ? ${player.playerName} - Multiple matches: ${matches.map(m => m.fullName).join(', ')}`);
    }
  }

  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const yearArg = args.find(a => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');
  
  if (dryRun) {
    console.log('Running in DRY-RUN mode (no changes will be made)\n');
  }

  let years: number[];
  if (yearArg) {
    years = [parseInt(yearArg)];
  } else {
    // Get all years from database
    const seasons = await prisma.historicalSeason.findMany({
      select: { year: true },
      orderBy: { year: 'asc' }
    });
    years = seasons.map(s => s.year);
  }

  console.log(`Processing years: ${years.join(', ')}`);

  let totalMatched = 0;
  let totalUnmatched = 0;

  for (const year of years) {
    const results = await autoMatchPlayersForYear(year, dryRun);
    const matched = results.filter(r => r.matched).length;
    const unmatched = results.filter(r => !r.matched).length;
    
    console.log(`\n${year}: ${matched} matched, ${unmatched} unmatched`);
    totalMatched += matched;
    totalUnmatched += unmatched;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total Matched: ${totalMatched}`);
  console.log(`Total Unmatched: ${totalUnmatched}`);
  console.log(`Match Rate: ${((totalMatched / (totalMatched + totalUnmatched)) * 100).toFixed(1)}%`);

  await prisma.$disconnect();
}

main().catch(console.error);
