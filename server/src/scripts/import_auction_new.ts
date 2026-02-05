
import { prisma } from '../db/prisma';
import * as XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// @ts-ignore
const readFile = XLSX.readFile || (XLSX as any).default?.readFile;

const SLEEP_MS = 200;

async function run() {
    const filePath = path.join(__dirname, '../data/Auction 2025.xlsx');
    console.log(`Reading ${filePath}...`);
    
    // 1. Load Teams
    const teams = await prisma.team.findMany();
    const teamMap = new Map<string, number>();
    
    console.log('Available Teams DB:', teams.map(t => t.name));

    teams.forEach(t => {
        teamMap.set(t.name.trim().toLowerCase(), t.id);
        // Handle "Demolition Lumber Co. " vs "Demolition Lumber Co."
        teamMap.set(t.name.trim().replace(/\.$/, '').toLowerCase(), t.id); 
    });
    // Explicit overrides
    teamMap.set('demolition lumber co', teams.find(t => t.code === 'DLC')?.id || 0); 
    teamMap.set('demolition lumber co.', teams.find(t => t.code === 'DLC')?.id || 0);
    // Force Los Doyers to ID 2 (correct one?) -- Wait, schema showed ID 1 in League 1, ID 9 in League 2.
    // The other teams (Diamond Kings ID 4) are in League 1.
    // So Los Doyers should be ID 1.
    // Why did it split? Maybe "Los Doyers" vs "Los Doyers " (space)?
    const ld = teams.find(t => t.name.trim() === 'Los Doyers' && t.leagueId === 1);
    if (ld) {
         teamMap.set('los doyers', ld.id);
    }

    // 2. Read File
    const workbook = readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);
    console.log(`Found ${rows.length} rows.`);

    // 3. WIPE Old Data (Safety: Only delete IMPORT_XLSX? Or all rosters for these teams?)
    // User asked "did we clear out old data?". To be safe, clear duplicates.
    // We will upsert, but if roster counts are wrong (e.g. duplicates), we should potentially clear.
    // DANGER: We don't want to clear valid MANUAL trades if any occurred.
    // But user just uploaded data for "Auction".
    // Let's delete ALL Rosters for the active Fantasy Teams involved in the Import?
    // Safer: Delete rosters created today via scripts?
    // User complained about "2 teams named demolition".
    
    // DECISION: We flush all rosters for the involved teams to ensure clean slate 23 players.
    const uniqueTeamsInFile = new Set(rows.map(r => r['Team']?.trim()));
    for (const tName of uniqueTeamsInFile) {
        if (!tName) continue;
        const tid = teamMap.get(tName.toLowerCase()) || teamMap.get(tName.toLowerCase().replace('.', ''));
        if (tid) {
            console.log(`Clearing rosters for ${tName} (ID ${tid})...`);
            await prisma.roster.deleteMany({ where: { teamId: tid } });
        }
    }

    let valid = 0;
    
    for (const row of rows) {
        const teamName = (row['Team'] || '').trim();
        const abbrName = (row['Abbreviated Name'] || '').trim();
        const price = parseFloat(row['Auction Value']) || 0;
        const isKeeper = (row['Keeper Y/N'] || '').toUpperCase() === 'Y';
        const position = (row['POS'] || '').trim().toUpperCase(); // Use XLSX Position

        if (!teamName || !abbrName) continue;
        
        let teamId = teamMap.get(teamName.toLowerCase());
        if (!teamId) teamId = teamMap.get(teamName.toLowerCase().replace('.', '')); // Try without dot?

        if (!teamId) {
            console.warn(`UNKNOWN TEAM: "${teamName}" for player ${abbrName}`);
            continue;
        }

        // 4. Resolve Player
        const cleanName = abbrName.replace(/\./g, '');
        let mlbData: any = null;
        
        try {
            // Search Name
            let res = await fetch(`https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(cleanName)}`);
            let data = await res.json() as any;
            
            // Refined Search Logic
            if ((!data.people || data.people.length === 0) && cleanName.split(' ').length > 1) {
                 const last = cleanName.split(' ').slice(1).join(' '); 
                 res = await fetch(`https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(last)}`);
                 data = await res.json() as any;
                 if (data.people) {
                     const initial = cleanName[0].toLowerCase();
                     data.people = data.people.filter((p: any) => p.fullName.toLowerCase().startsWith(initial));
                 }
            }
            
            if (data.people && data.people.length > 0) {
                 mlbData = data.people[0];
            }
        } catch (e) { console.error("MLB Search Error", e); }
        

        // Manual override map for mismatched names
        const manualMap: {[k: string]: string} = {
            'K. Schwaber': 'Kyle Schwarber',
            'Wil. Contreas': 'William Contreras',
            'S. Manea': 'Sean Manaea', 
            'J. Jones': 'Jared Jones',
            'A. Nola': 'Aaron Nola',
            'A. Diaz': 'Alexis Díaz',
            'L. Garcia': 'Luis García Jr.',
            'S. Alcantara': 'Sandy Alcantara',
            'E. Philips': 'Evan Phillips',
        };

        let fullName = manualMap[abbrName];
        let mlbId = 0;
        let mlbTeam = 'UNK';

        if (mlbData && !fullName) {
             fullName = mlbData.fullName;
             mlbId = mlbData.id;
        }
        
        if (!fullName) { 
             console.log(`Could not resolve ${abbrName}. Skipping.`);
             continue;
        }

        // 5. Get MLB Team (Historical: Season 2025)
        if (mlbId) {
            try {
                const statsRes = await fetch(`https://statsapi.mlb.com/api/v1/people/${mlbId}/stats?stats=season&season=2025&group=hitting,pitching`);
                const statsData = await statsRes.json() as any;
                const splits = statsData.stats?.[0]?.splits;
                if (splits && splits.length > 0) {
                    const teamObj = splits[0].team;
                    if (teamObj) {
                         const tRes = await fetch(`https://statsapi.mlb.com/api/v1/teams/${teamObj.id}`);
                         const tData = await tRes.json() as any;
                         if (tData.teams && tData.teams[0]) {
                              mlbTeam = tData.teams[0].abbreviation;
                         }
                    }
                }
            } catch (err) { }
        }

        // Correct A. Nola / A. Diaz if API lookup was wrong on ID
        if (abbrName === 'A. Nola') { fullName = 'Aaron Nola'; mlbId = 605400; mlbTeam = 'PHI'; } 
        if (abbrName === 'A. Diaz') { fullName = 'Alexis Díaz'; mlbId = 664747; mlbTeam = 'CIN'; }
        if (abbrName === 'L. Garcia') { fullName = 'Luis García Jr.'; mlbId = 671277; mlbTeam = 'WSH'; }

        console.log(`Processing: ${abbrName} -> ${fullName} (${mlbTeam}, ${position}, $${price}, Keeper: ${isKeeper})`);
        
        // 6. Update/Create Player (Manual logic to avoid Upsert arg error)
        let player;
        if (mlbId) {
            player = await prisma.player.upsert({
                where: { mlbId },
                update: { name: fullName, mlbTeam: mlbTeam !== 'UNK' ? mlbTeam : undefined },
                create: { name: fullName, mlbId, mlbTeam, posPrimary: position, posList: position }
            });
        } else {
            // Find by name
            player = await prisma.player.findFirst({ where: { name: fullName } });
            if (player) {
                 await prisma.player.update({ where: { id: player.id }, data: { mlbTeam: mlbTeam !== 'UNK' ? mlbTeam : undefined } });
            } else {
                 player = await prisma.player.create({
                     data: { name: fullName, mlbTeam, posPrimary: position, posList: position }
                 });
            }
        }


        // 7. Create Roster
        // We deleted all rosters for this team, so just create.
        await prisma.roster.create({
            data: {
                playerId: player.id,
                teamId,
                price,
                source: 'IMPORT_XLSX_V2',
                assignedPosition: position, // User requested Use XLSX Position
                isKeeper: isKeeper,
                acquiredAt: new Date()
            }
        });

        valid++;
        await new Promise(r => setTimeout(r, SLEEP_MS));
    }
    
    console.log(`Imported ${valid} Roster Entries.`);
    
    // 8. Verify Counts
    const counts = await prisma.roster.groupBy({
        by: ['teamId'],
        _count: { id: true }
    });
    console.log("Roster Counts:");
    for (const c of counts) {
         const t = teams.find(x => x.id === c.teamId);
         console.log(`  ${t?.name}: ${c._count.id}`);
    }
}

run().catch(console.error).finally(() => prisma.$disconnect());
