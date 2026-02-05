
import { prisma } from './server/src/db/prisma';

async function sync() {
    const YEAR = 2025;
    console.log(`Syncing Live Roster to RosterEntry for ${YEAR}...`);
    
    // 1. Clear existing RosterEntry for 2025
    const deleted = await prisma.rosterEntry.deleteMany({
        where: { year: YEAR }
    });
    console.log(`Deleted ${deleted.count} old entries.`);

    // 2. Fetch Live Roster
    const rosters = await prisma.roster.findMany({
        where: { releasedAt: null },
        include: {
            player: true,
            team: true
        }
    });

    console.log(`Found ${rosters.length} live roster items.`);

    // 3. Insert into RosterEntry
    let inserted = 0;
    for (const r of rosters) {
        if (r.team.code === 'DAWGS' || r.player.name.includes('integration')) continue;

        const isPitcher = r.player.posPrimary === 'P' || r.player.posList.includes('P');
        const pos = r.player.posPrimary || (isPitcher ? 'P' : 'UT');
        
        await prisma.rosterEntry.create({
            data: {
                year: YEAR,
                teamCode: r.team.code,
                playerName: r.player.name,
                position: pos,
                mlbTeam: r.player.mlbTeam || '',
                acquisitionCost: r.price || 0
            }
        });
        inserted++;
    }

    console.log(`Inserted ${inserted} entries into RosterEntry.`);
}

sync().catch(console.error).finally(() => prisma.$disconnect());
