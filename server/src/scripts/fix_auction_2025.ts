
import { prisma } from '../db/prisma.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCEL_PATH = path.join(__dirname, '../data/Auction 2025.xlsx');
const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';

async function run() {
    console.log(`Reading ${EXCEL_PATH}...`);
    
    // Load Teams Map (Name/Code -> ID)
    const teams = await prisma.team.findMany();
    const teamNameMap = new Map<string, number>();
    
    teams.forEach(t => {
        teamNameMap.set(t.name.trim().toLowerCase(), t.id);
        if (t.code) teamNameMap.set(t.code.toUpperCase(), t.id);
        
        // Custom Aliases
        if (t.code === 'RSR') {
            teamNameMap.set('raging sluggers', t.id);
            teamNameMap.set('rging sluggers', t.id);
            teamNameMap.set('rsr', t.id);
        }
        if (t.code === 'RGS') { // legacy check
             const real = teams.find(tm => tm.code === 'RSR');
             if (real) teamNameMap.set('rgs', real.id);
        }
    });

    const workbook = xlsx.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames[0];
    const rows: any[] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`Processing ${rows.length} rows...`);

    let updatedRosters = 0;
    
    // Load all players for in-memory matching
    const allPlayers = await prisma.player.findMany();

    for (const row of rows) {
        // Headers: Team, POS, Abbreviated Name, Auction Value, Keeper Y/N
        const teamName = row['Team'];
        const pos = row['POS'];
        const shortName = row['Abbreviated Name'];
        const price = parseFloat(row['Auction Value'] || row['Value'] || 0);
        const isKeeper = row['Keeper Y/N'] === 'Y';

        if (!shortName) continue;

        // 1. Resolve Team ID
        let teamId = teamNameMap.get(teamName?.trim().toLowerCase());
        
        // Handle "Raging Sluggers" special case if file still says "Raging"
        if (!teamId && teamName?.toLowerCase().includes('raging')) {
             teamId = teamNameMap.get('raging sluggers') || teamNameMap.get('rsr');
        }

        if (!teamId && teamName) {
            console.warn(`Skipping ${shortName}: Unknown Team Name '${teamName}'`);
            continue;
        }

        // 2. Find Player by Short Name
        // "J. Naylor" -> split "J", "Naylor"
        // Database "Josh Naylor"
        
        let p = allPlayers.find(pl => {
            if (pl.name === shortName) return true;
            
            // "Shohei Ohtani" vs "S. Ohtani"
            if (shortName === 'S. Ohtani' && pl.name === 'Shohei Ohtani') return true;
            if (shortName === 'CJ. Abrams' && pl.name === 'CJ Abrams') return true;
            
            // Manual Overrides
            if (shortName === 'E. De La Cruz' && pl.name === 'Elly De La Cruz') return true;
            if (shortName === 'F. Tatis Jr.' && pl.name === 'Fernando Tatis Jr.') return true;
            if (shortName === 'R. Acuna Jr.' && pl.name === 'Ronald Acuña Jr.') return true; // check tilde
            if (shortName === 'R. Acuna Jr.' && pl.name === 'Ronald Acuna Jr.') return true; 
            if (shortName === 'N,. Castellanos' && pl.name === 'Nick Castellanos') return true;
            if (shortName === 'L. Gurriel Jr.' && pl.name === 'Lourdes Gurriel Jr.') return true;
            if (shortName === 'E. Diaz' && pl.name === 'Edwin Díaz') return true; // Mets
            if (shortName === 'E. Diaz' && pl.name === 'Edwin Diaz') return true;
            if (shortName === 'M. Harris II' && pl.name === 'Michael Harris II') return true;
            
            // Generic Short Name Check
            // Handle "J. Naylor" OR "J.Naylor"
            const cleanShort = shortName.replace('.', '. '); // Ensure space after dot
            const parts = cleanShort.split('. ').filter(s => s.trim().length > 0);
            
            if (parts.length >= 2) {
                const initial = parts[0].trim();
                const last = parts[parts.length - 1].trim();
                
                // Must start with Initial, End with Last name
                if (pl.name.toLowerCase().startsWith(initial.toLowerCase()) && 
                    pl.name.toLowerCase().endsWith(last.toLowerCase())) {
                    // Safety check: Does it end with last name exactly?
                    const nameParts = pl.name.split(' ');
                    const plLast = nameParts[nameParts.length - 1];
                    if (plLast.toLowerCase() === last.toLowerCase()) return true;
                }
            }
            return false;
        });

        if (!p) {
             // Try MLB Search API to Create Player
             console.log(`Searching MLB API for ${shortName}...`);
             
             let searchName = shortName;
             if (shortName === 'E. Diaz') {
                 if (pos?.includes('C')) searchName = 'Elias Díaz';
                 else searchName = 'Edwin Díaz';
             }
             // ... other cases ...
             switch(shortName) {
                 case 'L. Garcia': searchName = 'Luis Garcia'; break; // Could be Luis Garcia (P) or Luis Garcia (2B)
                 case 'L. Garcia Jr.': searchName = 'Luis Garcia Jr.'; break;
                 case 'R. Lopez': searchName = 'Reynaldo López'; break; // Accent
                 case 'M. Harris II': searchName = 'Michael Harris II'; break;
             }

             if (searchName) {
                 try {
                     const searchRes = await fetch(`${MLB_API_BASE}/people/search?names=${encodeURIComponent(searchName)}`);
                     const searchData = await searchRes.json() as any;
                     const person = searchData.people?.[0]; // Take first match
                     
                     if (person) {
                         console.log(`Found MLB Match: ${person.fullName} (${person.id})`);
                         
                         // Check collision
                         p = await prisma.player.findUnique({ where: { mlbId: person.id } });
                         if (!p) {
                             // Create Player
                             p = await prisma.player.create({
                                 data: {
                                     mlbId: person.id,
                                     name: person.fullName,
                                     posPrimary: person.primaryPosition?.abbreviation || 'UT',
                                     posList: person.primaryPosition?.abbreviation || 'UT',
                                     mlbTeam: 'UNK'
                                 }
                             });
                             // Add to cache
                             allPlayers.push(p);
                         } else {
                             console.log(`Player ID ${person.id} already exists as ${p.name}. Using existing.`);
                         }
                     }
                 } catch (e) {
                     console.error("Error searching MLB:", e);
                 }
             }
        }

        if (p) {
             // 3. Update Roster
             if (teamId) {
                 const roster = await prisma.roster.findFirst({
                     where: { playerId: p.id, teamId, releasedAt: null }
                 });

                 // Update Price
                 if (roster && roster.price !== Math.round(price)) {
                     console.log(`Updating ${shortName} ($${roster.price} -> $${price})`);
                     await prisma.roster.update({
                         where: { id: roster.id },
                         data: { 
                             price: Math.round(price),
                             isKeeper: isKeeper || roster.isKeeper 
                         }
                     });
                     updatedRosters++;
                 } 
                 // Create Missing
                 else if (!roster) {
                     console.log(`Creating roster for ${shortName} -> ${teamName} ($${price})`);
                     await prisma.roster.create({
                         data: {
                             playerId: p.id,
                             teamId,
                             price: Math.round(price),
                             source: 'FIX_XLSX',
                             assignedPosition: pos || p.posPrimary || 'UT',
                             isKeeper: isKeeper,
                             acquiredAt: new Date('2025-03-24')
                         }
                     });
                     updatedRosters++;
                 }
             }
        } else {
             console.log(`Player Not Found: ${shortName}`);
        }
        
        // Rate limit
        await new Promise(r => setTimeout(r, 50));
    }

    console.log(`Done. Updated/Created ${updatedRosters} Rosters.`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
