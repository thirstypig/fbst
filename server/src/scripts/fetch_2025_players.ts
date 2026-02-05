
import { prisma } from '../db/prisma';

// MLB API Base
const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';

// Interfaces for MLB API Responses
interface MLBTeam {
  id: number;
  name: string;
  abbreviation: string;
  shortName: string;
}

interface MLBRosterEntry {
  person: {
    id: number;
    fullName: string;
  };
  position: {
    abbreviation: string;
  };
}

// 1. Fetch All Active MLB Teams
async function fetchMLBTeams(): Promise<MLBTeam[]> {
  console.log('Fetching MLB Teams for 2025...');
  const res = await fetch(`${MLB_API_BASE}/teams?sportId=1&season=2025`);
  const data = await res.json();
  if (!res.ok) throw new Error('Failed to fetch teams');
  
  return data.teams.map((t: any) => ({
    id: t.id,
    name: t.name,
    abbreviation: t.abbreviation,
    shortName: t.shortName,
  }));
}

// 2. Fetch Roster for a Team
async function fetchRoster(teamId: number): Promise<MLBRosterEntry[]> {
  const res = await fetch(`${MLB_API_BASE}/teams/${teamId}/roster?season=2025`);
  const data = await res.json();
  if (!res.ok) {
     console.warn(`Failed to fetch roster for team ${teamId}`);
     return [];
  }
  return data.roster || [];
}

async function main() {
  try {
    console.log('⚾ Starting 2025 Player Population...');

    const teams = await fetchMLBTeams();
    console.log(`Found ${teams.length} MLB Teams.`);

    let totalProcessed = 0;
    let totalUpdated = 0;

    for (const team of teams) {
      console.log(`\nProcessing ${team.abbreviation} (${team.name})...`);
      
      const roster = await fetchRoster(team.id);
      console.log(`  - Found ${roster.length} players.`);

      for (const entry of roster) {
        totalProcessed++;
        
        const mlbId = entry.person.id;
        const name = entry.person.fullName;
        const pos = entry.position.abbreviation;
        const mlbTeam = team.abbreviation;

        // "Smart" position list (e.g. if Pitcher, just P)
        // For positions, logic: if P -> P, else just the abbreviations
        const posList = pos; 
        
        // Upsert Player
        // Match by mlbId (most reliable) OR name (fallback)
        // Since mlbId is now unique in schema, simpler to upsert by mlbId logic using standard Prisma find/create
        
        // We'll try to find by mlbId first
        let player = await prisma.player.findFirst({
            where: { mlbId }
        });

        if (!player) {
            // Try by name (fallback legacy)
            player = await prisma.player.findFirst({
                where: { name }
            });
        }

        if (player) {
            // Update existing
            await prisma.player.update({
                where: { id: player.id },
                data: {
                    mlbId,
                    posList, // For now simplest
                    posPrimary: pos,
                    mlbTeam // NEW FIELD
                }
            });
        } else {
             // Create New
             await prisma.player.create({
                 data: {
                     name,
                     mlbId,
                     posPrimary: pos,
                     posList,
                     mlbTeam
                 }
             });
        }
        totalUpdated++;
      }
      
      // Rate limit slightly
      await new Promise(r => setTimeout(r, 100));
    }

    console.log('\n==========================================');
    console.log(`✅ Completed.`);
    console.log(`Processed: ${totalProcessed}`);
    console.log(`Upserted: ${totalUpdated}`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
