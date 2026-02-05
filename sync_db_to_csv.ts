
import { prisma } from './server/src/db/prisma';
import fs from 'fs';
import path from 'path';

// DB Team Code -> CSV Code
// In DB we used codes like LDY, TSH, DVD. 
// CSV uses LDY, SHO, DEV... 
// We should standardize on DB codes if possible, OR map back.
// "Live" DB codes: LDY, TSH, DVD, DMK, DLC, DDG, SKD, RGS
// "Original" CSV codes from user file: LDY, SHO, DEV, DMK, DLC, DDG, SKD, RGS
// The frontend might expect the CSV codes for logos? 
// Actually, `ArchivePage` likely uses the team code to display logos. 
// If we switch to DB codes (TSH, DVD), we need to ensure logos exist for TSH/DVD or the mapper handles it.
// Let's assume we can write the DB codes (e.g. TSH) and if the UI breaks we fix the UI mapper.
// But wait, the user's `draft_2025_auction.csv` had `SHO` and `DEV`.
// If I write `TSH` and `DVD` back to CSV, the Archive page will show `TSH` and `DVD`.
// Does the frontend support TSH/DVD?
// The Live site uses TSH/DVD. Archive page might likely share the same Logo lookup.
// So writing DB codes is probably safer for consistency.

const DRAFT_PATH = path.join(__dirname, 'server/src/data/archive/2025/draft_2025_auction.csv');
const PERIOD_1_PATH = path.join(__dirname, 'server/src/data/archive/2025/period_1.csv');
const EOS_PATH = path.join(__dirname, 'server/src/data/archive/2025/end_of_season.csv');

async function sync() {
    console.log("Syncing DB Rosters to CSVs...");
    
    const rosters = await prisma.roster.findMany({
        where: { releasedAt: null },
        include: {
            player: true,
            team: true
        }
    });

    // DRAFT & PERIOD 1 Header
    // player_name,team_code,mlb_team,position,is_pitcher,is_keeper,draft_dollars
    const headerDraft = "player_name,team_code,mlb_team,position,is_pitcher,is_keeper,draft_dollars";
    const draftLines = [headerDraft];

    // EOS Header
    // player_name,mlb_id,team_code,is_pitcher,AB,H,R,HR,RBI,SB,AVG,W,SV,K,IP,ER,ERA,WHIP
    const headerEOS = "player_name,mlb_id,team_code,is_pitcher,AB,H,R,HR,RBI,SB,AVG,W,SV,K,IP,ER,ERA,WHIP";
    const eosLines = [headerEOS];


    // Cache for MLB Teams
    const teamCache = new Map<number, string>(); // mlbId -> 'LAD'

    for (const r of rosters) {
        if (r.teamId !== 1 && r.teamId !== 2 && r.teamId !== 3 && r.teamId !== 4 && r.teamId !== 5 && r.teamId !== 6 && r.teamId !== 7 && r.teamId !== 8) {
             if (r.team.leagueId !== 1) continue; 
        }

        const isPitcher = r.player.posPrimary === 'P' || r.player.posList.includes('P') || r.assignedPosition === 'P';
        let pos = r.assignedPosition || r.player.posPrimary || (isPitcher ? 'P' : 'UT');
        
        // Remove Ohtani Overrides - Trust DB assignedPosition from XLSX
        
        const name = r.player.name.includes(',') ? `"${r.player.name}"` : r.player.name;
        
        // Resolve Historical MLB Team
        let mlbTeam = r.player.mlbTeam || '';
        // If FA/UNK/Empty, try to fetch 2025 team
        if (r.player.mlbId && (!mlbTeam || mlbTeam === 'FA' || mlbTeam === 'UNK')) {
            if (teamCache.has(r.player.mlbId)) {
                mlbTeam = teamCache.get(r.player.mlbId)!;
            } else {
                try {
                    // Fetch 2025 stats to find team
                    // Use hydrate=currentTeam is unreliable. Use stats endpoint.
                    const res = await fetch(`https://statsapi.mlb.com/api/v1/people/${r.player.mlbId}/stats?stats=season&season=2025&group=hitting,pitching`);
                    const data = await res.json() as any;
                    const splits = data.stats?.[0]?.splits;
                    
                    if (splits && splits.length > 0) {
                         // Find the split with the team (exclude 'Total' stats which often have no team or just league)
                         // Sort by games played to find the "main" team if traded
                         // Filter out splits with no team info
                         const teamSplits = splits.filter((s: any) => s.team);
                         if (teamSplits.length > 0) {
                             const mainSplit = teamSplits.sort((a: any, b: any) => (b.stat.gamesPlayed || 0) - (a.stat.gamesPlayed || 0))[0];
                             const t = mainSplit.team;
                             if (t && t.id) {
                                  const tRes = await fetch(`https://statsapi.mlb.com/api/v1/teams/${t.id}`);
                                  const tData = await tRes.json() as any;
                                  if (tData.teams && tData.teams[0]) {
                                       mlbTeam = tData.teams[0].abbreviation;
                                       teamCache.set(r.player.mlbId, mlbTeam);
                                  }
                             }
                         }
                    }
                } catch (e) { console.error(`Failed to fetch team for ${name}`); }
            }
        }

        // Draft Line
        const draftLine = [
            name,
            r.team.code,
            mlbTeam,
            pos,
            (pos === 'P' || pos === 'SP' || pos === 'RP') ? 'TRUE' : 'FALSE', 
            r.isKeeper ? 'TRUE' : 'FALSE', 
            r.price || 0
        ].join(',');
        draftLines.push(draftLine);


        // EOS Line
        // Stats are empty (0)
        const eosLine = [
            name,
            r.player.mlbId || '',
            r.team.code,
            (pos === 'P' || pos === 'SP' || pos === 'RP') ? 'true' : 'false',
            0,0,0,0,0,0,'0.000',0,0,0,0,0,'0.00','0.00'
        ].join(',');
        eosLines.push(eosLine);
    }

    fs.writeFileSync(DRAFT_PATH, draftLines.join('\n'));
    console.log(`Wrote ${draftLines.length} lines to ${DRAFT_PATH}`);

    fs.writeFileSync(PERIOD_1_PATH, draftLines.join('\n'));
    console.log(`Wrote ${draftLines.length} lines to ${PERIOD_1_PATH}`);

    fs.writeFileSync(EOS_PATH, eosLines.join('\n'));
    console.log(`Wrote ${eosLines.length} lines to ${EOS_PATH}`);
}

sync().catch(console.error).finally(() => prisma.$disconnect());
