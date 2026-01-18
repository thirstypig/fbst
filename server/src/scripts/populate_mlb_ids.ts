// Script to populate MLB IDs for all players using MLB Stats API
import { prisma } from '../db/prisma';

const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';

interface MLBSearchResult {
  people?: Array<{
    id: number;
    fullName: string;
    primaryPosition?: { abbreviation: string };
    currentTeam?: { name: string };
  }>;
}

async function searchMLBPlayer(name: string): Promise<{ mlbId: number; team?: string } | null> {
  try {
    // Search MLB API for player by name
    const url = `${MLB_API_BASE}/people/search?names=${encodeURIComponent(name)}&sportId=1&active=true`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`  ⚠️ API error for "${name}": ${response.status}`);
      return null;
    }

    const data: MLBSearchResult = await response.json();
    
    if (!data.people || data.people.length === 0) {
      // Try searching inactive players too
      const inactiveUrl = `${MLB_API_BASE}/people/search?names=${encodeURIComponent(name)}&sportId=1`;
      const inactiveResponse = await fetch(inactiveUrl);
      const inactiveData: MLBSearchResult = await inactiveResponse.json();
      
      if (!inactiveData.people || inactiveData.people.length === 0) {
        return null;
      }
      
      // Find best match
      const match = inactiveData.people.find(p => 
        p.fullName.toLowerCase() === name.toLowerCase()
      ) || inactiveData.people[0];
      
      return { 
        mlbId: match.id, 
        team: match.currentTeam?.name 
      };
    }

    // Find exact match or take first result
    const exactMatch = data.people.find(p => 
      p.fullName.toLowerCase() === name.toLowerCase()
    ) || data.people[0];

    return { 
      mlbId: exactMatch.id, 
      team: exactMatch.currentTeam?.name 
    };
  } catch (error) {
    console.log(`  ❌ Error searching "${name}":`, error);
    return null;
  }
}

async function populateMLBIds() {
  console.log('\n🔍 Populating MLB IDs for all players...\n');

  // Get all players without MLB IDs
  const players = await prisma.player.findMany({
    where: { mlbId: null },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  console.log(`Found ${players.length} players without MLB IDs\n`);

  let updated = 0;
  let notFound = 0;
  const notFoundList: string[] = [];

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    
    // Rate limit: wait 100ms between requests
    if (i > 0) await new Promise(r => setTimeout(r, 100));

    const result = await searchMLBPlayer(player.name);

    if (result) {
      await prisma.player.update({
        where: { id: player.id },
        data: { mlbId: result.mlbId },
      });
      updated++;
      console.log(`✅ ${player.name} → MLB ID: ${result.mlbId}${result.team ? ` (${result.team})` : ''}`);
    } else {
      notFound++;
      notFoundList.push(player.name);
      console.log(`❓ ${player.name} → Not found`);
    }

    // Progress indicator every 50 players
    if ((i + 1) % 50 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${players.length} ---\n`);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Updated: ${updated} players`);
  console.log(`❓ Not found: ${notFound} players`);
  
  if (notFoundList.length > 0 && notFoundList.length <= 20) {
    console.log(`\nPlayers not found:`);
    notFoundList.forEach(name => console.log(`  - ${name}`));
  }
  
  console.log('');
}

async function main() {
  try {
    await populateMLBIds();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
