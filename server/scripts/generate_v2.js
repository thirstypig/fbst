
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = path.join(__dirname, '../src/data/ogba_player_season_totals_2025_with_meta.csv');
const outputFile = path.join(__dirname, '../src/data/ogba_player_season_totals_2025_with_meta_v2.csv');

try {
  const content = fs.readFileSync(inputFile, 'utf-8');
  const lines = content.split('\n');
  const headers = lines[0];
  const rows = lines.slice(1).filter(l => l.trim().length > 0);

  const newRows = rows.map((line, index) => {
    // Keep header
    if (index < 0) return line;
    
    // Parse enough to get team code column (3rd column, index 2)
    // Simple split by comma (assuming no commas in fields for first 3 cols, which holds for this file)
    // Actually, let's just replace the team code if we decide to free this player.
    // Strategy: Every 3rd player is free (Available).
    
    if (index % 3 === 0) {
      // Find the team code. 
      // csv format: mlb_id,player_name,ogba_team_code,positions,...
      // We want to replace the text between the 2nd and 3rd comma.
      
      const parts = line.split(',');
      if (parts.length > 3) {
        // Clear ogba_team_code (index 2)
        parts[2] = ''; 
        return parts.join(',');
      }
    }
    return line;
  });

  const outputContent = [headers, ...newRows].join('\n');
  fs.writeFileSync(outputFile, outputContent, 'utf-8');
  console.log(`Successfully created V2 CSV at ${outputFile} with ${newRows.length} rows.`);
  
} catch (err) {
  console.error('Error generating V2 CSV:', err);
}
