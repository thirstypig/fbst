/**
 * Script to sync 2024 period 1 data with draft data
 * - Adds position data to period_1.csv from draft file
 * - Updates draft file to match period 1 player list
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHIVE_DIR = path.join(__dirname, '../data/archive/2024');

interface DraftPlayer {
  player_name: string;
  team_code: string;
  mlb_team: string;
  is_pitcher: string;
  position: string;
  draft_dollars: string;
}

interface Period1Player {
  player_name: string;
  mlb_id: string;
  team_code: string;
  is_pitcher: string;
  AB: string;
  H: string;
  R: string;
  HR: string;
  RBI: string;
  SB: string;
  AVG: string;
  W: string;
  SV: string;
  K: string;
  IP: string;
  ER: string;
  ERA: string;
  WHIP: string;
}

function parseCSV<T>(content: string): T[] {
  const lines = content.trim().replace(/^\uFEFF/, '').split(/\r?\n/);
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows: T[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
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
    
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row as T);
  }
  
  return rows;
}

function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.\s-]/g, '')
    .replace(/jr$/, 'jr')
    .replace(/ii$/, 'ii')
    .replace(/iii$/, 'iii');
}

async function main() {
  console.log('=== Syncing 2024 Period 1 and Draft Data ===\n');

  // Read files
  const period1Path = path.join(ARCHIVE_DIR, 'period_1.csv');
  const draftPath = path.join(ARCHIVE_DIR, 'draft_2024_period_plus.csv');

  const period1Content = fs.readFileSync(period1Path, 'utf-8');
  const draftContent = fs.readFileSync(draftPath, 'utf-8');

  const period1Players = parseCSV<Period1Player>(period1Content);
  const draftPlayers = parseCSV<DraftPlayer>(draftContent);

  console.log(`Period 1 players: ${period1Players.length}`);
  console.log(`Draft players: ${draftPlayers.length}`);

  // Create lookup map from draft by normalized name + team
  const draftLookup = new Map<string, DraftPlayer>();
  for (const p of draftPlayers) {
    const key = `${normalizePlayerName(p.player_name)}_${p.team_code}`;
    draftLookup.set(key, p);
  }

  // Count players per team
  const teamCounts: Record<string, { hitters: number; pitchers: number }> = {};
  for (const p of period1Players) {
    if (!teamCounts[p.team_code]) {
      teamCounts[p.team_code] = { hitters: 0, pitchers: 0 };
    }
    if (p.is_pitcher === 'true') {
      teamCounts[p.team_code].pitchers++;
    } else {
      teamCounts[p.team_code].hitters++;
    }
  }

  console.log('\n=== Team Roster Counts ===');
  for (const [team, counts] of Object.entries(teamCounts).sort()) {
    console.log(`${team}: ${counts.hitters} hitters, ${counts.pitchers} pitchers, total: ${counts.hitters + counts.pitchers}`);
  }

  // Check for players in period 1 but not in draft
  console.log('\n=== Players in Period 1 but NOT in Draft ===');
  const missingFromDraft: Period1Player[] = [];
  for (const p of period1Players) {
    const key = `${normalizePlayerName(p.player_name)}_${p.team_code}`;
    if (!draftLookup.has(key)) {
      console.log(`  - ${p.player_name} (${p.team_code})`);
      missingFromDraft.push(p);
    }
  }
  if (missingFromDraft.length === 0) {
    console.log('  (None)');
  }

  // Check for players in draft but not in period 1
  console.log('\n=== Players in Draft but NOT in Period 1 ===');
  const period1Lookup = new Map<string, Period1Player>();
  for (const p of period1Players) {
    const key = `${normalizePlayerName(p.player_name)}_${p.team_code}`;
    period1Lookup.set(key, p);
  }

  const missingFromPeriod1: DraftPlayer[] = [];
  for (const p of draftPlayers) {
    const key = `${normalizePlayerName(p.player_name)}_${p.team_code}`;
    if (!period1Lookup.has(key)) {
      console.log(`  - ${p.player_name} (${p.team_code}) - $${p.draft_dollars}`);
      missingFromPeriod1.push(p);
    }
  }
  if (missingFromPeriod1.length === 0) {
    console.log('  (None)');
  }

  // Create new draft file based on period 1 players
  console.log('\n=== Creating Updated Draft File ===');
  
  const newDraftPlayers: DraftPlayer[] = [];
  for (const p of period1Players) {
    const key = `${normalizePlayerName(p.player_name)}_${p.team_code}`;
    const existingDraft = draftLookup.get(key);
    
    // Determine position based on is_pitcher or existing draft position
    let position = 'UT';
    if (p.is_pitcher === 'true') {
      position = 'P';
    } else if (existingDraft) {
      position = existingDraft.position || 'UT';
    }
    
    newDraftPlayers.push({
      player_name: p.player_name,
      team_code: p.team_code,
      mlb_team: existingDraft?.mlb_team || '',
      is_pitcher: p.is_pitcher,
      position: position,
      draft_dollars: existingDraft?.draft_dollars || '1',
    });
  }

  // Write updated draft file
  const draftHeaders = 'player_name,team_code,mlb_team,is_pitcher,position,draft_dollars';
  const draftLines = [draftHeaders];
  for (const p of newDraftPlayers) {
    draftLines.push(`${p.player_name},${p.team_code},${p.mlb_team},${p.is_pitcher},${p.position},${p.draft_dollars}`);
  }

  const newDraftPath = path.join(ARCHIVE_DIR, 'draft_2024_period_plus_updated.csv');
  fs.writeFileSync(newDraftPath, draftLines.join('\n'));
  console.log(`Written to: ${newDraftPath}`);

  // Count positions in new draft
  console.log('\n=== Position Distribution (New Draft) ===');
  const posCounts: Record<string, number> = {};
  for (const p of newDraftPlayers) {
    posCounts[p.position] = (posCounts[p.position] || 0) + 1;
  }
  for (const [pos, count] of Object.entries(posCounts).sort()) {
    console.log(`  ${pos}: ${count}`);
  }

  console.log('\nDone! Review the updated file and rename if correct.');
}

main().catch(console.error);
