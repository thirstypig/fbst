
import { prisma } from './server/src/db/prisma';

async function correct() {
    // 1. Fix Elly De La Cruz
    const elly = await prisma.player.findFirst({ where: { name: 'Enrique Cruz' } });
    if (elly) {
        console.log("Correcting Enrique Cruz -> Elly De La Cruz");
        await prisma.player.update({ where: { id: elly.id }, data: { name: 'Elly De La Cruz' } });
        await prisma.historicalPlayerStat.updateMany({ where: { playerName: 'Enrique Cruz' }, data: { fullName: 'Elly De La Cruz', playerName: 'Elly De La Cruz' } });
    }

    // 2. Fix Acuna
    // DB Probably has "R. Acuna Jr." or "Ronald Acuna Jr."
    // CSV had "R. Acuna Jr."
    await prisma.historicalPlayerStat.updateMany({ 
        where: { playerName: 'R. Acuna Jr.' }, 
        data: { fullName: 'Ronald Acuña Jr.', playerName: 'Ronald Acuña Jr.' } 
    });
    
    // Find his roster?
    const acunaRoster = await prisma.roster.findFirst({ where: { player: { name: { contains: 'Acuna' } } } });
    if (acunaRoster) {
         console.log("Correcting Acuna Roster Name");
         await prisma.player.update({ where: { id: acunaRoster.playerId }, data: { name: 'Ronald Acuña Jr.' } });
    }
}

correct().catch(console.error).finally(() => prisma.$disconnect());
