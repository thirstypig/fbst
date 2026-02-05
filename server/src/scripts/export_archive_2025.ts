
import { prisma } from '../db/prisma.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const year = 2025;
  const outputDir = path.join(__dirname, `../data/archive/${year}`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const season = await prisma.historicalSeason.findFirst({ where: { year } });
  if (!season) {
    console.error(`No season found for ${year}`);
    return;
  }

  const periods = await prisma.historicalPeriod.findMany({
    where: { seasonId: season.id },
    orderBy: { periodNumber: 'asc' },
    include: { stats: true }
  });

  console.log(`Found ${periods.length} periods for ${year}. Exporting...`);

  // Define headers for period stats
  const periodHeaders = [
    'player_name',
    'team_code',
    'mlb_team',
    'position',
    'is_pitcher',
    'is_keeper',
    'draft_dollars',
    'R', 'HR', 'RBI', 'SB', 'AVG', 'GS',
    'W', 'SV', 'K', 'ERA', 'WHIP', 'SO'
  ];

  for (const period of periods) {
    const csvLines = [periodHeaders.join(',')];

    period.stats.forEach(s => {
      const row = [
        `"${s.playerName}"`,
        s.teamCode,
        s.mlbTeam || '',
        s.position || '',
        s.isPitcher ? 'TRUE' : 'FALSE',
        s.isKeeper ? 'TRUE' : 'FALSE',
        s.draftDollars || 0,
        s.R ?? 0,
        s.HR ?? 0,
        s.RBI ?? 0,
        s.SB ?? 0,
        (s.AVG || 0).toFixed(3).replace(/^0/, ''),
        s.GS ?? 0,
        s.W ?? 0,
        s.SV ?? 0,
        s.K ?? 0,
        (s.ERA || 0).toFixed(2),
        (s.WHIP || 0).toFixed(2),
        s.SO ?? 0
      ];
      csvLines.push(row.join(','));
    });

    const periodFile = path.join(outputDir, `period_${period.periodNumber}.csv`);
    fs.writeFileSync(periodFile, csvLines.join('\n'));
    console.log(`✅ Saved ${periodFile} (${period.stats.length} players)`);

    // If it's the first period, we also update the draft results
    if (period.periodNumber === 1) {
      const draftFile = path.join(outputDir, `draft_${year}_auction.csv`);
      // Draft results usually just need Name, Team, MLB Team, POS, Price, Keeper
      const draftHeaders = ['player_name', 'team_code', 'mlb_team', 'position', 'is_pitcher', 'is_keeper', 'draft_dollars'];
      const draftLines = [draftHeaders.join(',')];
      
      period.stats.forEach(s => {
        const row = [
            `"${s.playerName}"`,
            s.teamCode,
            s.mlbTeam || '',
            s.position || '',
            s.isPitcher ? 'TRUE' : 'FALSE',
            s.isKeeper ? 'TRUE' : 'FALSE',
            s.draftDollars || 0
        ];
        draftLines.push(row.join(','));
      });

      fs.writeFileSync(draftFile, draftLines.join('\n'));
      console.log(`✅ Saved ${draftFile} (Draft Results)`);
    }
  }

  // Also export period dates to period_dates_2025.csv
  const dateLines = ['period,start_date,end_date'];
  periods.forEach(p => {
    dateLines.push(`${p.periodNumber},${p.startDate.toISOString().split('T')[0]},${p.endDate.toISOString().split('T')[0]}`);
  });
  const dateFile = path.join(outputDir, `period_dates_${year}.csv`);
  fs.writeFileSync(dateFile, dateLines.join('\n'));
  console.log(`✅ Saved ${dateFile}`);

  console.log(`\n--- EXPORT COMPLETE ---`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
