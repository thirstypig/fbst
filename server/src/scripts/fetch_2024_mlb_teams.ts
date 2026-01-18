/**
 * Script to fetch MLB team assignments for 2024 players
 * Uses Opening Day 2024 (March 28, 2024) for draft data
 * Uses period start dates for period stats
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../db/prisma';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHIVE_DIR = path.join(__dirname, '../data/archive/2024');
const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';
const OPENING_DAY_2024 = '2024-03-28';

// Rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface PlayerInfo {
  playerName: string;
  mlbId: string | null;
  teamCode: string;
}

// Cache for team ID to abbreviation mapping
const teamAbbreviations = new Map<number, string>();

async function loadTeamAbbreviations(): Promise<void> {
  try {
    const url = `${MLB_API_BASE}/teams?sportId=1&season=2024`;
    const response = await fetch(url);
    const data = await response.json() as any;
    
    for (const team of data.teams || []) {
      teamAbbreviations.set(team.id, team.abbreviation);
    }
    console.log(`Loaded ${teamAbbreviations.size} team abbreviations`);
  } catch (error) {
    console.error('Failed to load team abbreviations:', error);
  }
}

async function fetchMlbTeamForDate(mlbId: string, date: string): Promise<string | null> {
  try {
    const url = `${MLB_API_BASE}/people/${mlbId}?hydrate=currentTeam&date=${date}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json() as any;
    const person = data.people?.[0];
    
    // Try to get team abbreviation directly
    if (person?.currentTeam?.abbreviation) {
      return person.currentTeam.abbreviation;
    }
    
    // Fall back to looking up by team ID
    if (person?.currentTeam?.id) {
      return teamAbbreviations.get(person.currentTeam.id) || null;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

async function getPlayerMlbIds(): Promise<Map<string, string>> {
  // Get mlbId mappings from HistoricalPlayerStat table
  const stats = await prisma.historicalPlayerStat.findMany({
    where: {
      period: {
        season: { year: 2024 }
      },
      mlbId: { not: null }
    },
    select: {
      playerName: true,
      mlbId: true,
      teamCode: true,
    },
    distinct: ['playerName', 'teamCode'],
  });

  const lookup = new Map<string, string>();
  for (const s of stats) {
    if (s.mlbId) {
      const key = `${s.playerName.toLowerCase()}_${s.teamCode}`;
      lookup.set(key, s.mlbId);
    }
  }

  console.log(`Found ${lookup.size} player-to-mlbId mappings from database`);
  return lookup;
}

async function searchMlbPlayerByName(name: string): Promise<{ mlbId: string; team: string } | null> {
  try {
    // Clean up name for search
    const searchName = name
      .replace(/^[A-Z]\.\s*/, '') // Remove initials like "F. "
      .replace(/Jr\.$/, 'Jr')
      .replace(/II$/, '')
      .replace(/III$/, '')
      .trim();

    const url = `${MLB_API_BASE}/people/search?names=${encodeURIComponent(searchName)}&sportId=1&season=2024`;
    const response = await fetch(url);
    
    if (!response.ok) return null;
    
    const data = await response.json() as any;
    const people = data.people || [];
    
    if (people.length === 0) return null;

    // Find best match (prefer active players)
    const active = people.find((p: any) => p.active);
    const person = active || people[0];

    return {
      mlbId: String(person.id),
      team: person.currentTeam?.abbreviation || null,
    };
  } catch (error) {
    console.error(`  [ERROR] Search failed for "${name}":`, error);
    return null;
  }
}

function parseCSV(content: string): string[][] {
  const lines = content.trim().replace(/^\uFEFF/, '').split(/\r?\n/);
  return lines.map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else current += char;
    }
    values.push(current.trim());
    return values;
  });
}

async function updateDraftFile() {
  console.log('\n=== Updating Draft File with MLB Teams ===');
  console.log(`Using date: ${OPENING_DAY_2024}`);

  const draftPath = path.join(ARCHIVE_DIR, 'draft_2024_period_plus.csv');
  const content = fs.readFileSync(draftPath, 'utf-8');
  const rows = parseCSV(content);
  
  if (rows.length === 0) {
    console.log('No data in draft file');
    return;
  }

  const headers = rows[0];
  const mlbTeamIdx = headers.indexOf('mlb_team');
  
  const mlbIdLookup = await getPlayerMlbIds();
  
  let updated = 0;
  let skipped = 0;
  let notFound = 0;
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const playerName = row[0];
    const teamCode = row[1];
    const currentMlbTeam = row[mlbTeamIdx];
    
    // Skip if already has team
    if (currentMlbTeam && currentMlbTeam.length > 0) {
      skipped++;
      continue;
    }
    
    const key = `${playerName.toLowerCase()}_${teamCode}`;
    let mlbId = mlbIdLookup.get(key);
    
    // If no mlbId in database, try searching by name
    if (!mlbId) {
      console.log(`  Searching for: ${playerName}...`);
      await delay(150); // Rate limit
      const result = await searchMlbPlayerByName(playerName);
      if (result) {
        mlbId = result.mlbId;
        // If we found a team from the search, use it
        if (result.team) {
          // Now get team for Opening Day specifically
          const openingDayTeam = await fetchMlbTeamForDate(mlbId, OPENING_DAY_2024);
          if (openingDayTeam) {
            row[mlbTeamIdx] = openingDayTeam;
            updated++;
            console.log(`    Found: ${playerName} -> ${openingDayTeam}`);
            continue;
          }
        }
      }
    }
    
    if (mlbId) {
      await delay(50); // Rate limit
      const team = await fetchMlbTeamForDate(mlbId, OPENING_DAY_2024);
      if (team) {
        row[mlbTeamIdx] = team;
        updated++;
        console.log(`  ${playerName} -> ${team}`);
      } else {
        notFound++;
        console.log(`  ${playerName} -> (no team on ${OPENING_DAY_2024})`);
      }
    } else {
      notFound++;
      console.log(`  ${playerName} -> (player not found)`);
    }
  }

  // Write updated CSV
  const newContent = rows.map(r => r.join(',')).join('\n');
  fs.writeFileSync(draftPath, newContent);
  
  console.log(`\nResults: ${updated} updated, ${skipped} skipped (already had team), ${notFound} not found`);
}

async function updatePeriodFile(periodNumber: number, periodDate: string) {
  console.log(`\n=== Updating Period ${periodNumber} with MLB Teams ===`);
  console.log(`Using date: ${periodDate}`);

  const periodPath = path.join(ARCHIVE_DIR, `period_${periodNumber}.csv`);
  
  if (!fs.existsSync(periodPath)) {
    console.log(`Period ${periodNumber} file not found`);
    return;
  }

  const content = fs.readFileSync(periodPath, 'utf-8');
  const rows = parseCSV(content);
  
  if (rows.length === 0) return;

  const headers = rows[0];
  let mlbTeamIdx = headers.indexOf('mlb_team');
  
  // Add mlb_team column if not exists
  if (mlbTeamIdx === -1) {
    // Insert after position column or at index 5
    const posIdx = headers.indexOf('position');
    mlbTeamIdx = posIdx !== -1 ? posIdx + 1 : 5;
    headers.splice(mlbTeamIdx, 0, 'mlb_team');
    for (let i = 1; i < rows.length; i++) {
      rows[i].splice(mlbTeamIdx, 0, '');
    }
  }

  const mlbIdLookup = await getPlayerMlbIds();
  
  let updated = 0;
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const playerName = row[0];
    const teamCode = row[2]; // team_code is third column
    const currentMlbTeam = row[mlbTeamIdx];
    
    if (currentMlbTeam) continue;
    
    const key = `${playerName.toLowerCase()}_${teamCode}`;
    const mlbId = mlbIdLookup.get(key);
    
    if (mlbId) {
      await delay(50);
      const team = await fetchMlbTeamForDate(mlbId, periodDate);
      if (team) {
        row[mlbTeamIdx] = team;
        updated++;
      }
    }
  }

  const newContent = rows.map(r => r.join(',')).join('\n');
  fs.writeFileSync(periodPath, newContent);
  
  console.log(`Updated ${updated} players in period ${periodNumber}`);
}

async function main() {
  console.log('=== Fetching MLB Teams for 2024 Archive ===\n');

  // Get period dates from database
  const periods = await prisma.historicalPeriod.findMany({
    where: { season: { year: 2024 } },
    orderBy: { periodNumber: 'asc' },
    select: { periodNumber: true, startDate: true },
  });

  console.log('Period dates:');
  for (const p of periods) {
    console.log(`  Period ${p.periodNumber}: ${p.startDate?.toISOString().split('T')[0] || 'unknown'}`);
  }

  // Load team abbreviations for lookup
  await loadTeamAbbreviations();

  // Update draft file with Opening Day teams
  await updateDraftFile();

  // Update period files
  for (const period of periods) {
    const dateStr = period.startDate?.toISOString().split('T')[0] || OPENING_DAY_2024;
    await updatePeriodFile(period.periodNumber, dateStr);
  }

  console.log('\n=== Done ===');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
