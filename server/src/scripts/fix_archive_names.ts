
import { prisma } from '../db/prisma.js';

async function run() {
    console.log('Fixing Archive Team Names...');

    // 1. Update HistoricalStanding
    // Fix teamName
    const standName = await prisma.historicalStanding.updateMany({
        where: { teamName: 'Raging Sluggers' },
        data: { teamName: 'RGing Sluggers' }
    });
    console.log(`Updated ${standName.count} HistoricalStanding names.`);
    
    // Fix teamCode if it was full name (unlikely but check)
    const standCode = await prisma.historicalStanding.updateMany({
        where: { teamCode: 'Raging Sluggers' },
        data: { teamCode: 'RSR' }
    });
    console.log(`Updated ${standCode.count} HistoricalStanding codes.`);

    // 2. Update HistoricalPlayerStat
    // Fix teamCode (HistoricalPlayerStat only has teamCode, not teamName?)
    // Schema says: teamCode String, teamName NOT present (it has fullName, playerName).
    // Wait, schema check:
    // model HistoricalPlayerStat { ... teamCode String ... }
    // It DOES NOT have teamName.
    // So distinct teamCodes need update.
    
    const statCode = await prisma.historicalPlayerStat.updateMany({
        where: { teamCode: 'Raging Sluggers' },
        data: { teamCode: 'RSR' }
    });
    console.log(`Updated ${statCode.count} HistoricalPlayerStat codes (from "Raging Sluggers").`);
    
    // Also update RGS -> RSR if we want strict uniformity?
    // Maybe keep RGS for history preservation? 
    // But if we want the NEW name to show, we mapped RSR -> "RGing Sluggers".
    // Did we map RGS -> "RGing Sluggers"? Yes in ogbaTeams.ts.
    // So RGS is fine.

    // 3. Update RosterEntry (if used)
    const rosterCode = await prisma.rosterEntry.updateMany({
        where: { teamCode: 'Raging Sluggers' },
        data: { teamCode: 'RSR' }
    });
    console.log(`Updated ${rosterCode.count} RosterEntry codes.`);

    // 4. Update AuctionBid / FinanceLedger ? No, they link to proper Team via ID.
    // Team table was checked earlier.

    console.log('Done.');
}

run().catch(console.error).finally(() => prisma.$disconnect());
