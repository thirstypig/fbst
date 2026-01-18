// server/src/scripts/populate_full_names.ts
/**
 * Quick script to populate fullName from playerName for testing
 * This expands abbreviated names like "S. Ohtani" to "Shohei Ohtani"
 */

import { prisma } from '../db/prisma';

// Simple name expansion mapping for common abbreviations
const nameExpansions: Record<string, string> = {
  'A.': 'Aaron',
  'B.': 'Brandon',
  'C.': 'Carlos',
  'D.': 'David',
  'E.': 'Edwin',
  'F.': 'Francisco',
  'G.': 'George',
  'H.': 'Hunter',
  'J.': 'Juan',
  'K.': 'Kyle',
  'L.': 'Luis',
  'M.': 'Michael',
  'N.': 'Nick',
  'P.': 'Paul',
  'R.': 'Ronald',
  'S.': 'Shohei',
  'T.': 'Tyler',
  'V.': 'Vladimir',
  'W.': 'William',
  'Y.': 'Yadier',
};

async function populateFullNames() {
  console.log('\n🔄 Populating full names from abbreviated names...\n');

  const stats = await prisma.historicalPlayerStat.findMany({
    where: { fullName: null },
    select: { id: true, playerName: true },
  });

  console.log(`Found ${stats.length} records without full names`);

  let updated = 0;

  for (const stat of stats) {
    // Try to expand "S. Ohtani" to "Shohei Ohtani"
    const parts = stat.playerName.split(' ');
    let fullName = stat.playerName;

    if (parts.length >= 2 && parts[0].endsWith('.')) {
      const initial = parts[0];
      const expanded = nameExpansions[initial];
      if (expanded) {
        fullName = `${expanded} ${parts.slice(1).join(' ')}`;
      }
    }

    await prisma.historicalPlayerStat.update({
      where: { id: stat.id },
      data: { fullName },
    });

    updated++;
    if (updated % 100 === 0) {
      console.log(`  Updated ${updated} records...`);
    }
  }

  console.log(`\n✅ Updated ${updated} records!`);
  console.log(`\nNote: This is a basic expansion. For accurate names, update your CSV with full_name column and re-import.\n`);
}

async function main() {
  try {
    await populateFullNames();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
