
import { prisma } from '../db/prisma.js';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @ts-ignore
const readFile = XLSX.readFile || (XLSX as any).default?.readFile;

// Helper for MLB API rate limiting
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

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
  // Manual overrides for team names
  const teamOverrides: Record<string, string> = {
    'los doyers': 'LDL',
    'diamond kings': 'DMK',
    'demolition lumber co': 'DLC',
    'demolition lumber co.': 'DLC'
  };

  // Find or create the 2025 season
  let season = await prisma.historicalSeason.findFirst({ where: { year: 2025 } });
  if (!season) {
    season = await prisma.historicalSeason.create({ data: { year: 2025 } });
  }

  for (const filename of files.sort()) {
    // Filename: Period 1 - Mar 27 to April 19, 2025.xlsx
    const regex = /Period (\d+) - (.+) to (.+), (\d+)/i;
    const match = filename.match(regex);
    if (!match) {
      console.warn(`Could not parse filename: ${filename}`);
      continue;
    }

    const periodNum = parseInt(match[1]);
    const startDateStr = `${match[2]}, ${match[4]}`;
    const endDateStr = `${match[3]}, ${match[4]}`;

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error(`Invalid dates in filename: ${filename} -> "${startDateStr}" to "${endDateStr}"`);
      continue;
    }

    const fmtStart = startDate.toISOString().split('T')[0];
    const fmtEnd = endDate.toISOString().split('T')[0];

    console.log(`\n--- Processing Period ${periodNum}: ${fmtStart} to ${fmtEnd} ---`);

    // Create/Update Period
    const period = await prisma.historicalPeriod.upsert({
      where: {
        seasonId_periodNumber: {
          seasonId: season.id,
          periodNumber: periodNum
        }
      },
      update: {
        startDate,
        endDate
      },
      create: {
        seasonId: season.id,
        periodNumber: periodNum,
        startDate,
        endDate
      }
    });

    // Clear stats for this period to do a clean import
    await prisma.historicalPlayerStat.deleteMany({ where: { periodId: period.id } });

    // Read XLSX
    const workbook = readFile(path.join(dataDir, filename));
    const sheetName = workbook.SheetNames[0];
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];
    
    console.log(`Found ${rawRows.length} rows in ${filename}`);

    const CHUNK_SIZE = 5;
    for (let i = 0; i < rawRows.length; i += CHUNK_SIZE) {
      const chunk = rawRows.slice(i, i + CHUNK_SIZE);
      
      await Promise.all(chunk.map(async (row) => {
        const fTeam = (row['Fantasy Team'] || row['Team'] || '').trim();
        const pos = (row['PO'] || row['POS'] || '').trim().toUpperCase();
        const abbrName = (row['Abbreviated Name'] || row['Abbreviated Player'] || '').trim();

        if (!fTeam || !abbrName) {
          console.log(`  Skipping empty row: team=${fTeam}, name=${abbrName}`);
          return;
        }

        const teamCode = teamOverrides[fTeam.toLowerCase()] || teamMap.get(fTeam.toLowerCase()) || fTeam;
        
        // Match Player
        const cleanAbbr = abbrName.trim();
        let player = await prisma.player.findFirst({
          where: { name: { contains: cleanAbbr, mode: 'insensitive' } }
        });

        // Fallback: If "S. Ohtani", try matching "Ohtani" and check initial
        if (!player && cleanAbbr.includes(' ')) {
          const parts = cleanAbbr.split(' ');
          const initial = parts[0].replace('.', '').toLowerCase();
          const last = parts[parts.length - 1].toLowerCase();
          player = await prisma.player.findFirst({
            where: { name: { contains: last, mode: 'insensitive' } }
          });
          if (player && !player.name.toLowerCase().startsWith(initial)) {
            player = null;
          }
        }

        // If not found, try MLB search as fallback
        let mlbIdStr = player?.mlbId?.toString();
        let fullName = player?.name || abbrName;
        let mlbTeam = player?.mlbTeam || 'UNK';

        if (!mlbIdStr) {
          try {
            const searchRes = await fetch(`https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(abbrName)}`);
            const searchData = await searchRes.json() as any;
            if (searchData.people && searchData.people[0]) {
              mlbIdStr = searchData.people[0].id.toString();
              fullName = searchData.people[0].fullName;
            }
          } catch (e) { console.error(`MLB Search Error for ${abbrName}:`, e); }
        }

        const isPitcher = pos === 'P' || pos === 'SP' || pos === 'RP';
        const isIL = pos === 'IL';

        let stats: any = {};
        
        if (mlbIdStr && !isIL) {
          try {
            // Fetch stats for the period using byDateRange
            const statGroup = isPitcher ? 'pitching' : 'hitting';
            const url = `https://statsapi.mlb.com/api/v1/people/${mlbIdStr}/stats?stats=byDateRange&group=${statGroup}&startDate=${fmtStart}&endDate=${fmtEnd}`;
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

            // Also fetch basic person info for Full Name and current Team
            const pRes = await fetch(`https://statsapi.mlb.com/api/v1/people/${mlbIdStr}?hydrate=currentTeam`);
            const pData = await pRes.json() as any;
            const person = pData.people?.[0];
            if (person) {
              fullName = person.fullName;
              if (person.currentTeam?.abbreviation) {
                mlbTeam = person.currentTeam.abbreviation;
              }
            }
          } catch (e) {
            console.error(`Error fetching stats for ${fullName} (${mlbIdStr}):`, e);
          }
        }

        // Create HistoricalPlayerStat
        await prisma.historicalPlayerStat.create({
          data: {
            periodId: period.id,
            playerName: fullName,
            fullName: fullName,
            teamCode: teamCode,
            position: pos,
            mlbId: mlbIdStr,
            mlbTeam: mlbTeam,
            isPitcher,
            isKeeper: false, 
            draftDollars: 0,
            ...stats
          }
        });
      }));

      console.log(`  Processed ${Math.min(i + CHUNK_SIZE, rawRows.length)} / ${rawRows.length} players...`);
      await sleep(200); // 200ms gap between batches
    }
    console.log(`✅ Period ${periodNum} complete.`);
  }

  console.log('\n--- ALL PERIODS COMPLETE ---');
}

run().catch(console.error).finally(() => prisma.$disconnect());
