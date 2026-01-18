/**
 * Script to add position data to period_1.csv from draft file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHIVE_DIR = path.join(__dirname, '../data/archive/2024');

function normalizePlayerName(name: string): string {
  return name.toLowerCase().replace(/[.\s-]/g, '');
}

async function main() {
  console.log('=== Adding Position Data to Period 1 ===\n');

  // Read draft file for position lookup
  const draftPath = path.join(ARCHIVE_DIR, 'draft_2024_period_plus.csv');
  const draftContent = fs.readFileSync(draftPath, 'utf-8');
  const draftLines = draftContent.trim().split(/\r?\n/);
  
  // Create position lookup from draft
  const positionLookup = new Map<string, string>();
  for (let i = 1; i < draftLines.length; i++) {
    const cols = draftLines[i].split(',');
    const playerName = cols[0];
    const teamCode = cols[1];
    const position = cols[4];
    const key = `${normalizePlayerName(playerName)}_${teamCode}`;
    positionLookup.set(key, position);
  }

  // Read and update period_1.csv
  const period1Path = path.join(ARCHIVE_DIR, 'period_1.csv');
  const period1Content = fs.readFileSync(period1Path, 'utf-8');
  const period1Lines = period1Content.trim().split(/\r?\n/);

  // Add position column to header
  const header = period1Lines[0];
  const headerCols = header.split(',');
  
  // Check if position already exists
  const posIdx = headerCols.indexOf('position');
  if (posIdx === -1) {
    // Insert position after is_pitcher (index 3)
    headerCols.splice(4, 0, 'position');
  }
  
  const newLines = [headerCols.join(',')];
  
  for (let i = 1; i < period1Lines.length; i++) {
    const line = period1Lines[i];
    if (!line.trim()) continue;
    
    const cols = line.split(',');
    const playerName = cols[0];
    const teamCode = cols[2];
    const key = `${normalizePlayerName(playerName)}_${teamCode}`;
    const position = positionLookup.get(key) || (cols[3] === 'true' ? 'P' : 'UT');
    
    if (posIdx === -1) {
      // Insert position after is_pitcher
      cols.splice(4, 0, position);
    } else {
      cols[posIdx] = position;
    }
    
    newLines.push(cols.join(','));
  }

  // Write updated file
  fs.writeFileSync(period1Path, newLines.join('\n'));
  console.log(`Updated ${period1Path}`);
  console.log(`Added/updated position for ${period1Lines.length - 1} players`);
}

main().catch(console.error);
