// Populate MLB IDs for Period 1 players using smart last-name matching
import { prisma } from '../db/prisma';

const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';

interface MLBPlayer {
  id: number;
  fullName: string;
  primaryPosition?: { abbreviation: string };
  currentTeam?: { name: string };
  active?: boolean;
}

// Extract last name from abbreviated name like "J. Smith" or "Juan Soto"
function extractLastName(name: string): string {
  const parts = name.trim().split(/[\s.]+/).filter(Boolean);
  return parts[parts.length - 1] || name;
}

async function searchMLBByLastName(lastName: string): Promise<MLBPlayer[]> {
  try {
    const url = `${MLB_API_BASE}/people/search?names=${encodeURIComponent(lastName)}&sportId=1`;
    const response = await fetch(url);
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.people || [];
  } catch (error) {
    return [];
  }
}

async function populatePeriod1MlbIds() {
  console.log('\n🔍 Populating MLB IDs for Period 1 players...\n');

  // Get all Period 1 stats missing MLB ID
  const stats = await prisma.historicalPlayerStat.findMany({
    where: {
      mlbId: null,
      period: {
        periodNumber: 1,
        season: { year: 2025 },
      },
    },
    select: {
      id: true,
      playerName: true,
      fullName: true,
      teamCode: true,
    },
  });

  console.log(`Found ${stats.length} players missing MLB IDs\n`);

  let updated = 0;
  let notFound = 0;
  const notFoundList: string[] = [];

  for (let i = 0; i < stats.length; i++) {
    const stat = stats[i];
    const displayName = stat.fullName || stat.playerName;
    const lastName = extractLastName(displayName);

    // Rate limit
    if (i > 0) await new Promise(r => setTimeout(r, 100));

    const players = await searchMLBByLastName(lastName);

    if (players.length === 0) {
      notFound++;
      notFoundList.push(`${displayName} (${stat.teamCode})`);
      console.log(`❓ ${displayName} → No results for "${lastName}"`);
      continue;
    }

    // Try to find exact match first
    let match = players.find(p => 
      p.fullName.toLowerCase() === displayName.toLowerCase()
    );

    // If no exact match, try to find by last name + first initial
    if (!match && displayName.includes('.')) {
      const firstInitial = displayName.split('.')[0].trim().toLowerCase();
      match = players.find(p => {
        const pFirst = p.fullName.split(' ')[0].toLowerCase();
        const pLast = p.fullName.split(' ').pop()?.toLowerCase();
        return pLast === lastName.toLowerCase() && pFirst.startsWith(firstInitial);
      });
    }

    // If still no match and only one player with that last name, use it
    if (!match && players.length === 1) {
      match = players[0];
    }

    // If still no match, take first active player with that last name
    if (!match) {
      match = players.find(p => p.active) || players[0];
    }

    if (match) {
      await prisma.historicalPlayerStat.update({
        where: { id: stat.id },
        data: {
          mlbId: String(match.id),
          fullName: stat.fullName || match.fullName, // Set full name if not already set
        },
      });
      updated++;
      console.log(`✅ ${displayName} → ${match.fullName} (MLB ID: ${match.id})`);
    } else {
      notFound++;
      notFoundList.push(`${displayName} (${stat.teamCode})`);
      console.log(`❓ ${displayName} → Could not match`);
    }

    // Progress every 25 players
    if ((i + 1) % 25 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${stats.length} ---\n`);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Updated: ${updated} players`);
  console.log(`❓ Not matched: ${notFound} players`);
  
  if (notFoundList.length > 0 && notFoundList.length <= 30) {
    console.log(`\nPlayers not matched:`);
    notFoundList.forEach(name => console.log(`  - ${name}`));
  }
  
  console.log('');
}

async function main() {
  try {
    await populatePeriod1MlbIds();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
