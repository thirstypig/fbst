
import { prisma } from '../db/prisma.js';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @ts-ignore
const readFile = XLSX.readFile || (XLSX as any).default?.readFile;

const SLEEP_MS = 200;
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

const NL_FANTASY_TEAMS = new Set([
  "Diamond Kings",
  "Demolition Lumber Co.",
  "Demolition Lumber Co. ",
  "Dodger Dawgs",
  "Skunk Dogs",
  "RGing Sluggers",
  "Devil Dawgs",
  "Los Doyers",
  "The Show"
]);

// Manual overrides for known players where abbreviated name is tricky
const manualMap: Record<string, { fullName: string; mlbId: string; mlbTeam: string }> = {
  'A. Nola': { fullName: 'Aaron Nola', mlbId: '605400', mlbTeam: 'PHI' },
  'A. Diaz': { fullName: 'Alexis Díaz', mlbId: '664747', mlbTeam: 'CIN' },
  'L. Garcia': { fullName: 'Luis García Jr.', mlbId: '671277', mlbTeam: 'WSH' },
  'S. Ohtani': { fullName: 'Shohei Ohtani', mlbId: '660271', mlbTeam: 'LAD' },
  'E. De La Cruz': { fullName: 'Elly De La Cruz', mlbId: '682829', mlbTeam: 'CIN' },
};

async function run() {
  const dataDir = path.join(__dirname, '../data');
  const files = fs.readdirSync(dataDir).filter(f => f.startsWith('Period') && f.endsWith('.xlsx'));
  
  console.log(`Found ${files.length} period files to process.`);

  // Load Teams to match codes
  const teams = await prisma.team.findMany();
  const teamMap = new Map<string, string>(); // Name -> Code
  teams.forEach((t: any) => {
    teamMap.set(t.name.trim().toLowerCase(), t.code);
    teamMap.set(t.name.trim().toLowerCase().replace(/\.$/, ''), t.code);
  });
  
  const teamOverrides: Record<string, string> = {
    'los doyers': 'LDL',
    'diamond kings': 'DMK',
    'demolition lumber co': 'DLC',
    'demolition lumber co.': 'DLC'
  };

  let season = await prisma.historicalSeason.findFirst({ where: { year: 2025 } });
  if (!season) {
    season = await prisma.historicalSeason.create({ data: { year: 2025 } });
  }

  for (const filename of files.sort()) {
    const regex = /Period (\d+)/i;
    const match = filename.match(regex);
    if (!match) continue;

    const periodNum = parseInt(match[1]);
    
    // We'll trust the filename for the period number, but let's get dates from the filename if possible, 
    // or just use hardcoded standard dates for 2025 if preferred.
    // The previous script had a date regex that worked.
    const dateRegex = /Period (\d+) - (.+) to (.+), (\d+)/i;
    const dateMatch = filename.match(dateRegex);
    if (!dateMatch) {
      console.warn(`Could not parse dates from filename: ${filename}`);
      continue;
    }

    const startDateStr = `${dateMatch[2]}, ${dateMatch[4]}`;
    const endDateStr = `${dateMatch[3]}, ${dateMatch[4]}`;
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    const fmtStart = startDate.toISOString().split('T')[0];
    const fmtEnd = endDate.toISOString().split('T')[0];

    console.log(`\n--- REFINED: Processing Period ${periodNum}: ${fmtStart} to ${fmtEnd} ---`);

    const period = await prisma.historicalPeriod.upsert({
      where: { seasonId_periodNumber: { seasonId: season.id, periodNumber: periodNum } },
      update: { startDate, endDate },
      create: { seasonId: season.id, periodNumber: periodNum, startDate, endDate }
    });

    // We don't delete all stats because we only want to update NL teams
    // Actually, user said "try to do a match... first use only 2025 year, use only NL teams".
    // I will delete only the stats for this period for the 8 NL teams to avoid duplicates.
    const nlTeamCodes = Array.from(NL_FANTASY_TEAMS).map(name => teamOverrides[name.toLowerCase()] || teamMap.get(name.toLowerCase()) || name).filter(Boolean);
    await prisma.historicalPlayerStat.deleteMany({
      where: {
        periodId: period.id,
        teamCode: { in: nlTeamCodes }
      }
    });

    const workbook = readFile(path.join(dataDir, filename));
    const sheetName = workbook.SheetNames[0];
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];
    
    console.log(`Processing ${rawRows.length} rows for NL teams in ${filename}...`);

    for (let i = 0; i < rawRows.length; i += 5) {
      const chunk = rawRows.slice(i, i + 5);
      await Promise.all(chunk.map(async (row) => {
        const fTeam = (row['Fantasy Team'] || row['Team'] || '').trim();
        const pos = (row['PO'] || row['POS'] || '').trim().toUpperCase();
        const abbrName = (row['Abbreviated Name'] || row['Abbreviated Player'] || '').trim();

        if (!fTeam || !abbrName) return;
        if (!NL_FANTASY_TEAMS.has(fTeam)) return;

        const teamCode = teamOverrides[fTeam.toLowerCase()] || teamMap.get(fTeam.toLowerCase()) || fTeam;

        // MATCHING LOGIC
        let resolvedPlayer: { fullName: string; mlbId: string | null; mlbTeam: string } = {
          fullName: abbrName,
          mlbId: null,
          mlbTeam: 'UNK'
        };

        if (manualMap[abbrName]) {
          resolvedPlayer = { ...manualMap[abbrName] };
        } else {
          // Parse Abbr: "J. Naylor" or "Josh Naylor" or "Naylor"
          const parts = abbrName.split(' ');
          let lastName = parts[parts.length - 1];
          let initial = parts.length > 1 ? parts[0][0].toLowerCase() : null;

          // Search DB for all matches with same last name
          let dbPlayers = await prisma.player.findMany({
            where: { name: { contains: lastName, mode: 'insensitive' } }
          });
          
          if (initial) {
            dbPlayers = dbPlayers.filter((p: any) => p.name.toLowerCase().startsWith(initial));
          }

          // Prefer match with mlbId
          const withId = dbPlayers.filter(p => p.mlbId);
          let match = null;
          if (withId.length === 1) {
            match = withId[0];
          } else if (dbPlayers.length === 1) {
            match = dbPlayers[0];
          }

          if (match) {
            resolvedPlayer = {
              fullName: match.name,
              mlbId: match.mlbId ? String(match.mlbId) : null,
              mlbTeam: match.mlbTeam || 'UNK'
            };
          } else {
            // Search MLB API
            try {
              const res = await fetch(`https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(lastName)}`);
              const data = await res.json() as any;
              let matches = data.people || [];
              if (initial) {
                matches = matches.filter((p: any) => p.fullName.toLowerCase().startsWith(initial));
              }

              if (matches.length === 1) {
                resolvedPlayer = {
                  fullName: matches[0].fullName,
                  mlbId: matches[0].id.toString(),
                  mlbTeam: matches[0].currentTeam?.abbreviation || 'UNK'
                };
              } else {
                // No definitive match found, keep abbreviated name and do not assume first name
                console.log(`  [Match] No definitive match for "${abbrName}" (${matches.length} MLB matches, ${dbPlayers.length} DB matches). Keeping abbreviated name.`);
              }
            } catch (e) {
              console.error(`MLB Search Error for ${abbrName}:`, e);
            }
          }
        }

        const isPitcher = pos === 'P' || pos === 'SP' || pos === 'RP';
        let stats: any = {};

        if (resolvedPlayer.mlbId && pos !== 'IL') {
          try {
            const statGroup = isPitcher ? 'pitching' : 'hitting';
            const url = `https://statsapi.mlb.com/api/v1/people/${resolvedPlayer.mlbId}/stats?stats=byDateRange&group=${statGroup}&startDate=${fmtStart}&endDate=${fmtEnd}`;
            const res = await fetch(url);
            const sData = await res.json() as any;
            const statObj = sData.stats?.[0]?.splits?.[0]?.stat;
            
            if (statObj) {
              if (isPitcher) {
                stats = {
                  W: statObj.wins || 0,
                  SV: statObj.saves || 0,
                  K: statObj.strikeOuts || 0,
                  ERA: statObj.era ? parseFloat(statObj.era) : 0,
                  WHIP: statObj.whip ? parseFloat(statObj.whip) : 0,
                  SO: statObj.shutouts || 0
                };
              } else {
                stats = {
                  R: statObj.runs || 0,
                  HR: statObj.homeRuns || 0,
                  RBI: statObj.rbi || 0,
                  SB: statObj.stolenBases || 0,
                  AVG: statObj.avg ? parseFloat(statObj.avg) : 0,
                  GS: statObj.grandSlams || 0
                };
              }
            }
            
            // Hydrate team if UNK
            if (resolvedPlayer.mlbTeam === 'UNK') {
               const pRes = await fetch(`https://statsapi.mlb.com/api/v1/people/${resolvedPlayer.mlbId}?hydrate=currentTeam`);
               const pData = await pRes.json() as any;
               const person = pData.people?.[0];
               if (person?.currentTeam?.abbreviation) {
                 resolvedPlayer.mlbTeam = person.currentTeam.abbreviation;
               }
            }
          } catch (e) {
            console.error(`Stats Error for ${resolvedPlayer.fullName}:`, e);
          }
        }

        await prisma.historicalPlayerStat.create({
          data: {
            periodId: period.id,
            playerName: resolvedPlayer.fullName,
            fullName: resolvedPlayer.fullName,
            teamCode: teamCode,
            position: pos,
            mlbId: resolvedPlayer.mlbId,
            mlbTeam: resolvedPlayer.mlbTeam,
            isPitcher,
            ...stats
          }
        });
      }));
      await sleep(200);
    }
    console.log(`✅ Period ${periodNum} NL refined import complete.`);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
