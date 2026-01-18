import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import { prisma } from '../db/prisma.js';
import { parse } from 'csv-parse/sync';

// Fix for XLSX in ESM environments where readFile might be on .default or not exported correctly
// @ts-ignore
const readFile = XLSX.readFile || (XLSX as any).default?.readFile;
// @ts-ignore
const utils = XLSX.utils || (XLSX as any).default?.utils;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to get Opening Day for a given year (approximate start of Period 1)
function getOpeningDay(year: number): string {
  const dates: Record<number, string> = {
    2019: '2019-03-28',
    2020: '2020-07-23', // Shortened season
    2021: '2021-04-01',
    2022: '2022-04-07',
    2023: '2023-03-30',
    2024: '2024-03-28',
    2025: '2025-03-27' // Estimated
  };
  return dates[year] || `${year}-03-28`;
}

interface PeriodDefinition {
  p: number;
  start: Date;
  end: Date;
  tabName: string;
}

export class ArchiveImportService {
  private year: number;
  private archiveDir: string;

  constructor(year: number) {
    this.year = year;
    this.archiveDir = path.join(__dirname, `../data/archive/${year}`);
  }

  /**
   * Main entry point: Process Excel file and import data into DB
   */
  async processAndImport(filePath: string): Promise<{ success: boolean; messages: string[] }> {
    const logs: string[] = [];
    const log = (msg: string) => { console.log(msg); logs.push(msg); };

    try {
      log(`Starting import for year ${this.year}...`);
      
      // Ensure directory exists
      if (!fs.existsSync(this.archiveDir)) {
        fs.mkdirSync(this.archiveDir, { recursive: true });
        log(`Created directory: ${this.archiveDir}`);
      }

      // 1. Read Excel File
      const workbook = readFile(filePath);
      const sheetNames = workbook.SheetNames;
      log(`Found sheets: ${sheetNames.join(', ')}`);

      // 2. Identify Sheets
      const draftSheet = sheetNames.find(s => s.toLowerCase().includes('draft'));
      const standingsSheet = sheetNames.find(s => s.toLowerCase().includes('standing'));
      
      // Period sheets: usually dates like "Apr 21", "May 19", "End of Season", "Final"
      // We look for sheets that constitute the periods.
      // Heuristic: Sheets that are NOT draft or standings are periods? 
      // Or sheets that parse as dates.
      
      // For FBST specifically, period tabs are usually named by the END date of the period (e.g. "Apr 21")
      // We need to order them chronologically.
      
      const potentialPeriodSheets = sheetNames.filter(s => s !== draftSheet && s !== standingsSheet && !s.toLowerCase().includes('transactions') && !s.toLowerCase().includes('info'));
      
      const periods: PeriodDefinition[] = [];
      let previousEnd = new Date(getOpeningDay(this.year));
      // Adjust start date: Period 1 starts on Opening Day.
      // Ideally, we start P1 on Opening Day.
      
      // Sort sheets? No, trust user order? Best to parse dates and sort.
      const parsedSheets = potentialPeriodSheets.map(name => {
        let dateStr = name;
        // Handle "End of Season" or "Final" -> usually implies late Sep/early Oct
        if (name.toLowerCase().includes('final') || name.toLowerCase().includes('season')) {
          dateStr = `Oct 1 ${this.year}`; 
        } else {
          dateStr = `${name} ${this.year}`;
        }
        
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        return { name, date };
      }).filter(x => x !== null) as { name: string, date: Date }[];

      parsedSheets.sort((a, b) => a.date.getTime() - b.date.getTime());

      // If 2020 (shortened), maybe logic differs, but general flow:
      // P1 start = Opening Day
      // P1 end = parsedSheet[0].date
      // P2 start = P1 end + 1 day
      
      parsedSheets.forEach((sheet, idx) => {
        const startDate = idx === 0 ? new Date(getOpeningDay(this.year)) : new Date(periods[idx-1].end);
        if (idx > 0) startDate.setDate(startDate.getDate() + 1);

        periods.push({
          p: idx + 1,
          start: startDate,
          end: sheet.date,
          tabName: sheet.name
        });
      });

      log(`Identified ${periods.length} periods from tabs.`);

      // 3. Build Team Name map for lookup (CRITICAL: must be before Draft/Period parsing)
      const teamNameToCode = new Map<string, string>();
      // Helper to identify a team from a string
      const identifyTeam = (val: string): string | null => {
          const v = val.trim().toLowerCase();
          if (!v) return null;
          
          // Prioritize more specific names first
          const known: { [name: string]: string } = {
              "dodger dawgs": "DDG", "dodger": "DDG",
              "devil dawgs": "DEV", "devil": "DEV",
              "diamond kings": "DKG", "diamond": "DKG", "kings": "DKG",
              "demolition lumber": "DMK", "demolition": "DMK", "lumber": "DMK",
              "skunk dogs": "SKD", "skunk": "SKD",
              "rging sluggers": "RGS", "rging": "RGS", "sluggers": "RGS",
              "los doyers": "LDY", "doyers": "LDY",
              "the show": "SHO", "show": "SHO"
          };
          
          // Exact match first
          if (known[v]) return known[v];

          // Partial match with priority for longer keys
          const sortedKeys = Object.keys(known).sort((a, b) => b.length - a.length);
          for (const name of sortedKeys) {
              if (v.includes(name)) return known[name];
          }
          return null;
      };

      const standingsWs = standingsSheet ? workbook.Sheets[standingsSheet] : workbook.Sheets[sheetNames[0]];
      if (standingsWs) {
          const sRows = utils.sheet_to_json(standingsWs, { header: 1 }) as any[][];
          log("Building Team Name -> Code map...");
          sRows.forEach(row => {
              row.forEach(cell => {
                  const code = identifyTeam(String(cell || ''));
                  if (code) {
                      // We don't have the full name here easily but we map part -> code
                      // we'll rely on the identifyTeam helper during parsing too
                  }
              });
          });
      }

      // 4. Generate CSVs
      
      // Draft
      if (draftSheet) {
        try {
          const sheet = workbook.Sheets[draftSheet];
          log(`[Draft] Analyzing layout...`);
          const rows = utils.sheet_to_json(sheet, { header: 1 }) as any[][];
          
          let teamRowIdx = -1;
          let colToTeam = new Map<number, string>();
          for (let i = 0; i < Math.min(10, rows.length); i++) {
              const row = rows[i];
              let teamsFound = 0;
              row.forEach((cell, idx) => {
                  const val = String(cell || '').trim();
                  if (val) {
                     const code = identifyTeam(val);
                     if (code) {
                         colToTeam.set(idx, code);
                         teamsFound++;
                     }
                  }
              });
              if (teamsFound >= 2) { teamRowIdx = i; break; }
          }

          if (teamRowIdx !== -1 && colToTeam.size >= 2) {
              log(`  Unrolling Draft Grid (${colToTeam.size} teams)...`);
              const standardizedRows: any[] = [];
                  const positions = new Set(['OF', 'P', '1B', '2B', '3B', 'SS', 'C', 'CM', 'MI', 'DH', 'IL1', 'IL2', 'DL', 'R']);

                  for (let i = teamRowIdx + 1; i < rows.length; i++) {
                      const row = rows[i];
                      if (!row || row.length === 0) continue;

                      // Stop sentinel for Draft
                      const rowStr = row.join(' ').toLowerCase();
                      if (rowStr.includes('salary cap')) break;

                      let currentPos = '';
                      const posColIdx = row.findIndex(c => positions.has(String(c || '').trim().toUpperCase()));
                      if (posColIdx !== -1) currentPos = String(row[posColIdx]).trim().toUpperCase();

                      colToTeam.forEach((teamCode, colIdx) => {
                          const pName = String(row[colIdx] || '').trim();
                          const pValue = row[colIdx + 1]; // Assume value is next column
                          
                          const isNoise = positions.has(pName.toUpperCase()) || 
                                          identifyTeam(pName) !== null ||
                                          pName.length <= 2 || 
                                          !isNaN(Number(pName));

                          if (pName && !isNoise) {
                              standardizedRows.push({
                                  player_name: pName,
                                  team_code: teamCode,
                                  position: currentPos || '?',
                                  is_pitcher: currentPos === 'P',
                                  draft_dollars: parseInt(String(pValue || '0')) || 0
                              });
                          }
                      });
                  }
              const ws = utils.json_to_sheet(standardizedRows);
              const csv = utils.sheet_to_csv(ws);
              fs.writeFileSync(path.join(this.archiveDir, `draft_${this.year}_auction.csv`), csv);
              log(`  Generated draft_${this.year}_auction.csv (${standardizedRows.length} draft picks)`);
          } else {
              const csv = utils.sheet_to_csv(sheet);
              fs.writeFileSync(path.join(this.archiveDir, `draft_${this.year}_auction.csv`), csv);
              log(`  Generated draft_${this.year}_auction.csv (standard export)`);
          }
        } catch (err: any) {
          log(`  Error parsing Draft sheet: ${err.message}. Fallback to standard.`);
          const csv = utils.sheet_to_csv(workbook.Sheets[draftSheet]);
          fs.writeFileSync(path.join(this.archiveDir, `draft_${this.year}_auction.csv`), csv);
        }
      }

      // Standings
      if (standingsSheet) {
        const csv = utils.sheet_to_csv(workbook.Sheets[standingsSheet]);
        fs.writeFileSync(path.join(this.archiveDir, `season_standings_${this.year}.csv`), csv);
        log(`Generated season_standings_${this.year}.csv`);
      }

      // (Cleaned up redundant teamNameToCode block)

      // Periods
      for (const p of periods) {
        const sheet = workbook.Sheets[p.tabName];
        if (sheet) {
          try {
             log(`[Period ${p.p}] Analyzing layout...`);
             const rows = utils.sheet_to_json(sheet, { header: 1 }) as any[][];
             if (!rows || rows.length === 0) continue;

             // Detect Layout: "Grid" vs "Vertical"
             // Roster Grid has multiple columns with names under team headers
             
             // 1. Find Team Header Row (usually row 0, 1, or 2)
             let teamRowIdx = -1;
             let colToTeam = new Map<number, string>();

             for (let i = 0; i < Math.min(10, rows.length); i++) {
                 const row = rows[i];
                 let teamsFound = 0;
                 row.forEach((cell, idx) => {
                     const val = String(cell || '').trim();
                     if (val) {
                        const code = identifyTeam(val);
                        if (code) {
                            colToTeam.set(idx, code);
                            teamsFound++;
                        }
                     }
                 });
                 if (teamsFound >= 2) {
                     teamRowIdx = i;
                     log(`  Found Team Headers at Row ${i} (Teams: ${Array.from(colToTeam.values()).join(', ')})`);
                     break;
                 }
             }

              if (teamRowIdx !== -1 && colToTeam.size >= 2) {
                  // ROSTER GRID MODE
                  log(`  Entering Roster Grid Parsing Mode for Period ${p.p}`);
                  const standardizedRows: any[] = [];
                  const teamCounts = new Map<string, number>();
                  
                  // Find data start (first row with a position like OF, P, 1B, R)
                  // Pre-2023: 13 pos, 9 pit, 1 rook = 23 total.
                  const positions = new Set(['OF', 'P', '1B', '2B', '3B', 'SS', 'C', 'CM', 'MI', 'DH', 'IL1', 'IL2', 'DL', 'R']);
                  const maxPlayers = this.year <= 2022 ? 23 : 30; // 23 limit for older years
                  
                  for (let i = teamRowIdx + 1; i < rows.length; i++) {
                      const row = rows[i];
                      if (!row || row.length === 0) continue;

                      // Check for "STOP" sentinel
                      const rowStr = row.join(' ').toLowerCase();
                      if (rowStr.includes('total') || rowStr.includes('standings') || rowStr.includes('salary cap')) {
                          log(`  Stop sentinel found at row ${i}`);
                          break;
                      }

                      // Determine current position for this row
                      let currentPos = '';
                      const posColIdx = row.findIndex(c => positions.has(String(c || '').trim().toUpperCase()));
                      if (posColIdx !== -1) {
                          currentPos = String(row[posColIdx]).trim().toUpperCase();
                      }

                      // Map players in this row
                      colToTeam.forEach((teamCode, colIdx) => {
                          const pName = String(row[colIdx] || '').trim();
                          const count = teamCounts.get(teamCode) || 0;
                          
                          if (count >= maxPlayers) return;

                          // Filter out noise: positions, team name fragments, stats
                          const isNoise = 
                             positions.has(pName.toUpperCase()) || 
                             identifyTeam(pName) !== null || // Fragment of team name
                             pName.length <= 2 || 
                             pName.includes('/') || 
                             !isNaN(Number(pName));

                          if (pName && !isNoise) {
                              standardizedRows.push({
                                  player_name: pName,
                                  team_code: teamCode,
                                  position: currentPos || (teamCode ? '??' : ''),
                                  is_pitcher: currentPos === 'P'
                              });
                              teamCounts.set(teamCode, count + 1);
                          }
                      });
                  }

                 const ws = utils.json_to_sheet(standardizedRows);
                 const csv = utils.sheet_to_csv(ws);
                 fs.writeFileSync(path.join(this.archiveDir, `period_${p.p}.csv`), csv);
                 log(`  Generated period_${p.p}.csv (${standardizedRows.length} players unrolled)`);

             } else {
                 // VERTICAL / STANDARD MODE (Existing Logic Enhanced)
                 log(`  Falling back to Standard/Unroll Mode for Period ${p.p}`);
                 // ... (Rest of existing logic for "Player" / "Team" headers)
                 // This handles sheets that are already vertical lists
                 
                 // (Copied and cleaned up from previous implementation)
                 let headerRowIdx = -1;
                 for (let i = 0; i < Math.min(50, rows.length); i++) {
                   const rowStr = (rows[i] || []).join(' ').toLowerCase();
                   if (rowStr.includes('player') || rowStr.includes('team')) {
                     headerRowIdx = i;
                     break;
                   }
                 }

                 if (headerRowIdx === -1) {
                    const csv = utils.sheet_to_csv(sheet);
                    fs.writeFileSync(path.join(this.archiveDir, `period_${p.p}.csv`), csv);
                    continue;
                 }
                 
                 const headerRow = (rows[headerRowIdx] || []).map(h => String(h || '').trim());
                 const tableStarts: number[] = [];
                 headerRow.forEach((h, idx) => {
                    if (h.toLowerCase().includes('player') || h.toLowerCase() === 'name') {
                       if (tableStarts.length === 0 || idx > tableStarts[tableStarts.length - 1] + 2) tableStarts.push(idx);
                    }
                 });

                 const standardizedRows: any[] = [];
                 const standardHeaders = headerRow.slice(tableStarts[0], tableStarts.length > 1 ? tableStarts[1] : undefined).filter(h => h);

                 for (let i = headerRowIdx + 1; i < rows.length; i++) {
                    const row = rows[i] || [];
                    tableStarts.forEach((startCol, loopIdx) => {
                       const nextStart = tableStarts[loopIdx + 1] || row.length;
                       if (startCol >= row.length) return;
                       const chunk = row.slice(startCol, nextStart);
                       if (chunk.length > 0 && chunk[0]) {
                            const rowObj: any = {};
                            standardHeaders.forEach((h, hIdx) => { if (hIdx < chunk.length) rowObj[h] = chunk[hIdx]; });
                            standardizedRows.push(rowObj);
                       }
                    });
                 }

                 const ws = utils.json_to_sheet(standardizedRows, { header: standardHeaders });
                 const csv = utils.sheet_to_csv(ws);
                 fs.writeFileSync(path.join(this.archiveDir, `period_${p.p}.csv`), csv);
                 log(`  Generated period_${p.p}.csv (unrolled ${standardizedRows.length} rows)`);
             }

          } catch (unrollErr: any) {
              console.error(`ERROR unrolling Period ${p.p}:`, unrollErr);
              log(`ERROR unrolling Period ${p.p}: ${unrollErr.message}. Falling back to standard CSV.`);
              const csv = utils.sheet_to_csv(sheet);
              fs.writeFileSync(path.join(this.archiveDir, `period_${p.p}.csv`), csv);
          }
        }
      }


      // 4. Import Data into DB
      await this.importToDatabase(periods, log);

      log('Import complete successfully.');
      return { success: true, messages: logs };

    } catch (err: any) {
      console.error('Import failed (Critical):', err);
      log(`CRITICAL ERROR: ${err.message}`);
      return { success: false, messages: logs };
    }
  }

  /**
   * Imports the generated CSV data into Postgres
   */
  private async importToDatabase(periods: PeriodDefinition[], log: (msg: string) => void) {
    const leagueId = 1;

    // Build EXTENDED Player Lookup
    // We fetch ALL historical stats to build a knowledge base of names
    // This allows us to fuzzy match "J. Verlander" -> "Justin Verlander"
    log('Building player knowledge base from existing database...');
    const allStats = await prisma.historicalPlayerStat.findMany({
      select: { playerName: true, fullName: true, mlbId: true, position: true, mlbTeam: true, isPitcher: true },
      distinct: ['playerName'] 
    });
    
    // Create lookup maps
    const exactLookup = new Map<string, any>();
    const fuzzyLookup: { last: string; firstInitial: string; isPitcher: boolean; full: any }[] = [];

    allStats.forEach(s => {
      // 1. Exact Match
      if (!exactLookup.has(s.playerName)) exactLookup.set(s.playerName, s);
      
      // 2. Prepare for Fuzzy Match
      // Parse "Justin Verlander" -> "Verlander", "J"
      const parts = (s.fullName || '').trim().split(' ');
      if (parts.length >= 2) {
        const last = parts[parts.length - 1].toLowerCase();
        const first = parts[0].toLowerCase();
        fuzzyLookup.push({
          last,
          firstInitial: first[0],
          isPitcher: s.isPitcher,
          full: s
        });
      }
    });
    log(`Knowledge base loaded: ${exactLookup.size} unique players.`);

    // Helper to find best match
    const findMatch = (rawName: string, isPitcherGuess: boolean): { match: any; note?: string } => {
      // 1. Exact Match
      if (exactLookup.has(rawName)) return { match: exactLookup.get(rawName) };

      // 2. Fuzzy Match (Abbreviated Names)
      // Attempt to parse rawName: "J. Verlander", "Verlander, J", "J Verlander"
      let last = '';
      let firstInit = '';

      const cleanName = rawName.toLowerCase().replace('.', '').replace(',', '');
      const parts = cleanName.split(' ');
      
      if (parts.length >= 2) {
        // Heuristic: usually "First Last" or "Last First"
        // If "Verlander J" (Last First)
        if (parts[1].length === 1) {
            last = parts[0];
            firstInit = parts[1];
        } 
        // If "J Verlander" (First Last)
        else if (parts[0].length === 1) {
            firstInit = parts[0];
            last = parts[parts.length - 1]; // Take last part as last name
        }
        else {
            // Assume First Last
            firstInit = parts[0][0];
            last = parts[parts.length - 1];
        }
      }

      if (last && firstInit) {
        // Find candidates
        const candidates = fuzzyLookup.filter(p => 
            p.last === last && 
            p.firstInitial === firstInit &&
            p.isPitcher === isPitcherGuess // Strict on position type to differentiate common names
        );

        if (candidates.length === 1) {
            return { match: candidates[0].full, note: `Fuzzy matched "${rawName}" to "${candidates[0].full.fullName}"` };
        }
        if (candidates.length > 1) {
            // Ambiguous
             const names = candidates.map(c => c.full.fullName).join(', ');
             return { match: null, note: `AMBIGUOUS: "${rawName}" matches multiple: ${names}` };
        }
      }

      return { match: null };
    };

    // Create/Get Season
    const season = await prisma.historicalSeason.upsert({
      where: { year_leagueId: { year: this.year, leagueId } },
      create: { year: this.year, leagueId },
      update: {},
    });

    // Process Periods
    for (const p of periods) {
      const fileName = `period_${p.p}.csv`;
      const csvPath = path.join(this.archiveDir, fileName);
      if (!fs.existsSync(csvPath)) continue;

      log(`Importing Period ${p.p}...`);

      const fileContent = fs.readFileSync(csvPath, 'utf-8');
      // Detect if we need to skip BOM
      const records = parse(fileContent.replace(/^\uFEFF/, ''), {
        columns: (header) => header.map((h: string) => h.toLowerCase().trim()), // Standardize headers
        skip_empty_lines: true,
        relax_column_count: true
      });

      // Upsert Period
      const period = await prisma.historicalPeriod.upsert({
        where: { seasonId_periodNumber: { seasonId: season.id, periodNumber: p.p } },
        create: {
          seasonId: season.id,
          periodNumber: p.p,
          startDate: p.start,
          endDate: p.end,
        },
        update: {
          startDate: p.start,
          endDate: p.end,
        }
      });

      // Clear old stats
      await prisma.historicalPlayerStat.deleteMany({ where: { periodId: period.id } });

      let count = 0;
      for (const rowItem of records) {
        const row = rowItem as any;
        // Map common variations
        const pName = row.player_name || row.player || row.name || row['player name'];
        const team = row.team_code || row.team || row.user || row['fantasy team'];
        
        if (!pName || !team) continue; // Skip bad rows
        
        // Hitting Stats
        const ab = this.toNum(row.ab);
        const h = this.toNum(row.h);
        const r = this.toNum(row.r);
        const hr = this.toNum(row.hr);
        const rbi = this.toNum(row.rbi);
        const sb = this.toNum(row.sb);
        
        // Pitching Stats
        const w = this.toNum(row.w || row.wins);
        const sv = this.toNum(row.sv || row.saves);
        const k = this.toNum(row.k || row.so || row.strikeouts);
        const ip = parseFloat(row.ip || '0') || 0;
        const er = this.toNum(row.er);
        // ERA/WHIP/AVG are computed from aggregates, but we store raw if available
        const avg = parseFloat(row.avg || row.ba || '0');
        const era = parseFloat(row.era || '0');
        const whip = parseFloat(row.whip || '0');

        const isPitcher = (row.is_pitcher === 'true' || row.is_pitcher === true) || 
                          ((w + sv + ip) > 0);
        const position = row.position || (isPitcher ? 'P' : null);

        // MATCHING LOGIC
        const { match, note } = findMatch(pName, isPitcher);
        if (note) {
             // Only log significant events to avoid spam, but ambiguous ones are important
             if (note.startsWith('AMBIGUOUS') || note.startsWith('Fuzzy')) {
                 log(`[Match] ${note}`);
             }
        }

        await prisma.historicalPlayerStat.create({
          data: {
            periodId: period.id,
            playerName: pName, // Always keep original name for tracing
            fullName: match?.fullName || pName, // Use canonical full name if found
            mlbId: match?.mlbId || null,
            teamCode: team.toUpperCase(),
            isPitcher,
            position: match?.position || position,
            mlbTeam: match?.mlbTeam || null,
            
            AB: ab, H: h, R: r, HR: hr, RBI: rbi, SB: sb, AVG: avg,
            W: w, SV: sv, K: k, IP: ip, ER: er, ERA: era, WHIP: whip
          }
        });
        count++;
      }
      log(`  - Imported ${count} records`);
    }
  }

  private toNum(val: any): number {
    return parseInt(val) || 0;
  }
}
