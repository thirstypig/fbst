
import { prisma } from '../db/prisma';
import * as XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// @ts-ignore
const readFile = XLSX.readFile || (XLSX as any).default?.readFile;

async function fix() {
    const filePath = path.join(__dirname, '../data/Auction 2025.xlsx');
    const workbook = readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    // Helpers
    const getTeamId = async (code: string) => (await prisma.team.findFirst({ where: { code } }))?.id;
    const updatePlayer = async (wrongName: string, correctName: string, teamCode: string, mlbId: number) => {
        const row = rows.find(r => r['Abbreviated Name'] === wrongName);
        if (!row) { console.log("Row not found for", wrongName); return; }
        
        const price = parseFloat(row['Auction Value']);
        const teamId = await getTeamId(teamCode);
        
        console.log(`Fixing ${correctName} (${teamCode}, $${price})...`);
        
        let player = await prisma.player.findUnique({ where: { mlbId } });
        if (!player) {
             // Create if missing
             player = await prisma.player.create({ 
                 data: { name: correctName, mlbId, mlbTeam: 'UNK', posPrimary: 'UT', posList: 'UT' } 
             });
        } else {
             await prisma.player.update({ where: { id: player.id }, data: { name: correctName }});
        }

        // Fix Roster
        // If "Scott Manea" roster exists, delete/move.
        // Actually, import_auction created "Scott Manea".
        // Use "wrongName" logic? import_auction used MLB lookup.
        // For "Scott Manea", user script created him.
        const wrongP = await prisma.player.findFirst({ where: { name: 'Scott Manea' } });
        if (wrongP) {
             await prisma.roster.deleteMany({ where: { playerId: wrongP.id } }); // Delete wrong roster
             // Maybe delete player too?
        }
        const wrongP2 = await prisma.player.findFirst({ where: { name: 'Jahmai Jones' } });
        if (wrongP2 && wrongName === 'J. Jones') {
             await prisma.roster.deleteMany({ where: { playerId: wrongP2.id } });
        }

        // Create correct roster
        await prisma.roster.create({
            data: {
                playerId: player.id,
                teamId: teamId!,
                price: price,
                source: 'MANUAL_FIX',
                acquiredAt: new Date()
            }
        });
        
        // Fix Historical
        await prisma.historicalPlayerStat.updateMany({
            where: { playerName: wrongName },
            data: { fullName: correctName, playerName: correctName }
        });
    };

    // 1. K. Schwaber -> Kyle Schwarber (656941) -> RGing Sluggers (RGS)
    await updatePlayer('K. Schwaber', 'Kyle Schwarber', 'RGS', 656941);

    // 2. Wil. Contreas -> William Contreras (661388) -> The Show (TSH)
    await updatePlayer('Wil. Contreas', 'William Contreras', 'TSH', 661388);

    // 3. S. Manea -> Sean Manaea (640455) -> The Show (TSH)
    await updatePlayer('S. Manea', 'Sean Manaea', 'TSH', 640455);
    
    // 4. J. Jones -> Jared Jones (683003) -> RGing Sluggers (RGS)
    await updatePlayer('J. Jones', 'Jared Jones', 'RGS', 683003);
}

fix().catch(console.error).finally(() => prisma.$disconnect());
