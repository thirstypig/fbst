import { prisma } from './server/src/db/prisma';
import fs from 'fs';
import path from 'path';
import { parse } from './server/node_modules/csv-parse/dist/cjs/sync.cjs';

/*
 * This script repairs the Roster and HistoricalPlayerStat tables.
 * 1. Reads period_1.csv (Clean Abbreviated Names, Correct Teams).
 * 2. Matches Roster entries (Correct Prices, Bad Names) to CSV entries.
 * 3. Resolves Abbreviated Names to Full Names using MLB Search.
 * 4. Updates Roster and HistoricalPlayerStat.
 */

async function fix() {
    const csvPath = path.join(__dirname, 'server/src/data/archive/2025/period_1.csv');
    const content = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(content, { columns: true, skip_empty_lines: true });

    console.log(`Loaded ${records.length} records from period_1.csv`);

    // 1. Build Team Mapping (CSV Team -> DB Team)
    const rosters = await prisma.roster.findMany({ where: { releasedAt: null }, include: { player: true, team: true } });
    
    // Group records by CSV Team
    const csvTeams: {[code: string]: string[]} = {}; // Code -> LastNames[]
    records.forEach((r: any) => {
        const team = r.team_code || r.team || '';
        const name = r.player_name || r.player || '';
        if (!team || !name) return;
        const last = name.split(' ').pop()?.replace(/[^a-zA-Z]/g, '').toLowerCase();
        if (last) {
            csvTeams[team] = csvTeams[team] || [];
            csvTeams[team].push(last);
        }
    });

    // Group Rosters by DB Team
    const dbTeams: {[code: string]: string[]} = {};
    rosters.forEach(r => {
        const last = r.player.name.split(' ').pop()?.replace(/[^a-zA-Z]/g, '').toLowerCase();
        if (last) {
            dbTeams[r.team.code] = dbTeams[r.team.code] || [];
            dbTeams[r.team.code].push(last);
        }
    });

    // Compute Mapping
    const mapping: {[csvCode: string]: string} = {};
    for (const cCode in csvTeams) {
        let bestMatch = '';
        let maxOverlap = 0;
        
        for (const dCode in dbTeams) {
            const overlap = csvTeams[cCode].filter(l => dbTeams[dCode].includes(l)).length;
            if (overlap > maxOverlap) {
                maxOverlap = overlap;
                bestMatch = dCode;
            }
        }
        if (bestMatch) {
            console.log(`Mapped CSV Team ${cCode} -> DB Team ${bestMatch} (Overlap: ${maxOverlap})`);
            mapping[cCode] = bestMatch;
        } else {
            console.log(`Could not map CSV Team ${cCode}`);
        }
    }

    // 2. Resolve Names
    let updatedCount = 0;
    
    for (const row of records) {
        const pName = row.player_name || row.player || '';
        const csvTeam = row.team_code || row.team || '';
        if (!pName || !mapping[csvTeam]) continue;

        const dbTeam = mapping[csvTeam];
        const parts = pName.split(' ');
        const abbrLast = parts.pop()?.replace(/[^a-zA-Z]/g, '').toLowerCase();
        // Handle "J. Naylor" -> Last "Naylor"
        
        if (pName.includes('Ohtani')) {
            console.log(`DEBUG Ohtani: CSV Code ${csvTeam} -> Mapped DB Code ${dbTeam}. Roster Search Pattern: ${abbrLast}`);
        }

        // 1. Try Strict Match (Team + Last Name)
        let rosterEntry = rosters.find(r => {
            return r.team.code === dbTeam && r.player.name.toLowerCase().includes(abbrLast || '___');
        });

        // 2. Try Global Match (Last Name Only - if unique)
        if (!rosterEntry) {
             const potentialMatches = rosters.filter(r => r.player.name.toLowerCase().includes(abbrLast || '___'));
             if (potentialMatches.length === 1) {
                 rosterEntry = potentialMatches[0];
                 console.log(`  Fuzzy Global Match for ${pName}: Found ${rosterEntry.player.name} (${rosterEntry.team.code})`);
             }
        }

        // 3. Resolve Full Name via MLB (Crucial for Archive Display)
        const cleanName = pName.replace(/\./g, ''); // "S Steer"
        let resolvedFull = '';
        let mlbId = 0;
        let mlbTeam = '';
        
        const searchMLB = async (q: string) => {
             try {
                const res = await fetch(`https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(q)}`);
                const data = await res.json() as any;
                return (data.people || []) as any[];
             } catch { return []; }
        };

        let people = await searchMLB(cleanName);
        
        // Fallback: Search Last Name Only if initial fails
        if (people.length === 0) {
             const lastName = cleanName.split(' ').pop();
             if (lastName && lastName.length > 2) {
                 people = await searchMLB(lastName);
                 // Filter by first initial matching
                 const firstInit = cleanName[0].toLowerCase();
                 people = people.filter((p: any) => p.fullName.toLowerCase().startsWith(firstInit));
             }
        }
        // Fallback 2: Search "First Last" if we can fuzzy match from DB roster?
        // Actually, if we found a roster match above, use THAT name to search MLB?
        if (people.length === 0 && rosterEntry) {
             people = await searchMLB(rosterEntry.player.name);
        }

        if (people.length > 0) {
             resolvedFull = people[0].fullName;
             mlbId = people[0].id;
             mlbTeam = people[0].currentTeam?.id ? 'UNK' : '';
        }

        if (resolvedFull) {
            // ALWAYS Update HistoricalPlayerStat (Fix display)
            await prisma.historicalPlayerStat.updateMany({
                where: { playerName: pName }, 
                data: { fullName: resolvedFull, playerName: resolvedFull }
            });
            console.log(`  Updated HistoricalStat: ${pName} -> ${resolvedFull}`);
            updatedCount++;

            // If we have a roster match, update it too
            if (rosterEntry && rosterEntry.player.name !== resolvedFull) {
                 // Check collision
                 const existingPlayer = await prisma.player.findUnique({ where: { mlbId: mlbId } });
                 if (existingPlayer && existingPlayer.id !== rosterEntry.player.id) {
                     console.log(`    Target player exists (ID ${existingPlayer.id}). Switching Roster Link.`);
                     await prisma.roster.update({
                         where: { id: rosterEntry.id },
                         data: { playerId: existingPlayer.id }
                     });
                 } else {
                     await prisma.player.update({
                         where: { id: rosterEntry.player.id },
                         data: { name: resolvedFull, mlbId, mlbTeam: mlbTeam || rosterEntry.player.mlbTeam } 
                     });
                 }
            }
        } else {
            console.log(`Could not resolve MLB name for ${pName}`);
        }
    }
    console.log(`Updated ${updatedCount} players.`);
}

fix().catch(console.error).finally(() => prisma.$disconnect());
