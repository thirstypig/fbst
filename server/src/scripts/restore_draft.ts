
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { prisma } from '../db/prisma.js';

// Hardcoded Keepers from ArchivePage.tsx
const KEEPER_MAP_2025: Record<string, string[]> = {
    'DKD': ['E. De La Cruz', 'F. Tatis Jr.', 'D. Crews'],
    'DLC': ['C. Carroll', 'R. Acuna Jr.', 'S. Ohtani', 'P. Skenes'],
    'DDD': ['F. Lindor', 'J. Chourio', 'J. Wood', 'C.J. Abrams', 'CJ. Abrams'],
    'SDS': ['M. Olson', 'T. Turner', 'C. Sale', 'S. Ohtani'],
    'RSR': ['F. Freeman', 'O. Cruz', 'Wilm. Contreras', 'Y. Yamamoto'],
    'DD2': ['A. Riley', 'J. Merrill', 'S. Suzuki', 'M. Vientos'],
    'LDL': ['M. Betts', 'M. Muncy', 'T. Hernandez', 'W. Smith'],
    'TST': ['P. Alonso', 'M. Machado', 'B. Harper', 'B. Snell']
};

async function restore() {
  const year = 2025;
  const auctionCsvPath = path.join(process.cwd(), 'src/data/ogba_auction_values_2025.csv');
  
  console.log(`--- Restoring 2025 Data (Run 2 - Better Keeper Match) ---`);
  
  // 1. Restore Auction Values (Same as before, verify success)
  let updatedDollars = 0;
  if (fs.existsSync(auctionCsvPath)) {
    const csvRaw = fs.readFileSync(auctionCsvPath, 'utf8');
    const records = parse(csvRaw, { columns: true, skip_empty_lines: true, trim: true }) as any[];
    
    for (const row of records) {
        const mlbId = row.mlb_id;
        let dollarValue = Math.round(parseFloat(row.dollar_value || '0'));
        if (isNaN(dollarValue)) dollarValue = 0;
        
        if (!mlbId) continue;

        // Find stats with this MLB ID in 2025 Period 1
        // Note: Some players might be cost $0, but we still want to record that if it's explicitly imported
        const stats = await prisma.historicalPlayerStat.findMany({
            where: {
                period: { season: { year }, periodNumber: 1 },
                mlbId: mlbId
            }
        });

        for (const stat of stats) {
            await prisma.historicalPlayerStat.update({
                where: { id: stat.id },
                data: { draftDollars: dollarValue }
            });
            updatedDollars++;
        }
    }
    console.log(`Updated Draft Dollars for ${updatedDollars} records.`);
  }

  // 2. Restore Keepers (Relaxed Logic)
  console.log(`Restoring Keepers...`);
  let updatedKeepers = 0;
  const allKeepers = Object.values(KEEPER_MAP_2025).flat();
  // Unique keepers just in case
  const uniqueKeepers = [...new Set(allKeepers)];

  const period1Stats = await prisma.historicalPlayerStat.findMany({
    where: { period: { season: { year }, periodNumber: 1 } }
  });

  for (const keeperName of uniqueKeepers) {
      // Normalize keeper name: "F. Tatis Jr." -> "Tatis Jr."
      // "E. De La Cruz" -> "De La Cruz"
      // "Wilm. Contreras" -> "Contreras"
      
      const parts = keeperName.split(' ');
      let searchPart = keeperName;

      // Heuristic: If starts with initial "X. " remove it
      if (/^[A-Z]\./.test(parts[0])) {
          searchPart = parts.slice(1).join(' ');
      }
      // Handle "Wilm." case
      if (parts[0].includes('.')) {
         searchPart = parts.slice(1).join(' ');
      }

      // Find match in DB
      let match = period1Stats.find(p => p.playerName.toLowerCase().includes(searchPart.toLowerCase()));

      // Fallback: Check for exact last name if searchPart is multi-word but failed
      if (!match && parts.length > 1) {
         const lastName = parts[parts.length-1];
         // careful of common last names, but for keepers usually fine
         // match = period1Stats.find(p => p.playerName.toLowerCase().endsWith(lastName.toLowerCase())); 
         // Too risky? "Smith" -> Will Smith vs ...
      }
      
      // Special Ohtani case
      if (keeperName.includes('Ohtani')) {
          // Ohtani might appear twice (P and DH). Mark both?
          const ohtanis = period1Stats.filter(p => p.playerName.includes('Ohtani'));
          for (const o of ohtanis) {
             await prisma.historicalPlayerStat.update({
                 where: { id: o.id },
                 data: { isKeeper: true }
             });
             updatedKeepers++;
             console.log(`  Restored Keeper: ${o.playerName} (Ohtani Rule)`);
          }
          continue;
      }

      if (match) {
         await prisma.historicalPlayerStat.update({
             where: { id: match.id },
             data: { isKeeper: true }
         });
         updatedKeepers++;
         console.log(`  Restored Keeper: ${match.playerName} (matched "${keeperName}")`);
      } else {
         console.warn(`  Failed to match Keeper: ${keeperName} (searched "${searchPart}")`);
      }
  }

  console.log(`Restored Keeper status for ${updatedKeepers} records.`);
}

restore().catch(console.error).finally(() => prisma.$disconnect());
