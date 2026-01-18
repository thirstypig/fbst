// Normalize positions (LF/CF/RF → OF) and assign MI/CM slots
// Also validate roster composition per team
import { prisma } from '../db/prisma';

// Position mappings
const OF_POSITIONS = ['LF', 'CF', 'RF', 'OF'];
const MI_POSITIONS = ['2B', 'SS'];
const CM_POSITIONS = ['1B', '3B'];

// Expected roster per team:
// 9 pitchers
// Hitters: 1B, 2B, SS, 3B, 5 OF, 2 C, 1 CM, 1 MI, 1 DH = 14

interface RosterSlot {
  position: string;
  count: number;
}

const EXPECTED_HITTER_SLOTS: RosterSlot[] = [
  { position: '1B', count: 1 },
  { position: '2B', count: 1 },
  { position: 'SS', count: 1 },
  { position: '3B', count: 1 },
  { position: 'OF', count: 5 },
  { position: 'C', count: 2 },
  { position: 'CM', count: 1 },
  { position: 'MI', count: 1 },
  { position: 'DH', count: 1 },
];

const EXPECTED_PITCHER_COUNT = 9;

async function normalizeAndAssignPositions() {
  console.log('\n📋 Normalizing positions and assigning MI/CM...\n');

  // First, normalize all outfield positions to OF
  const ofStats = await prisma.historicalPlayerStat.updateMany({
    where: {
      position: { in: ['LF', 'CF', 'RF'] },
      isPitcher: false,
    },
    data: { position: 'OF' },
  });
  console.log(`Normalized ${ofStats.count} outfielders to OF\n`);

  // Get all periods
  const periods = await prisma.historicalPeriod.findMany({
    where: { season: { year: 2025 } },
    include: {
      stats: {
        select: {
          id: true,
          fullName: true,
          playerName: true,
          position: true,
          isPitcher: true,
          teamCode: true,
        },
      },
    },
    orderBy: { periodNumber: 'asc' },
  });

  for (const period of periods) {
    console.log(`\n📅 Period ${period.periodNumber}:`);

    // Group by team
    const teamGroups: Record<string, typeof period.stats> = {};
    for (const stat of period.stats) {
      if (!teamGroups[stat.teamCode]) teamGroups[stat.teamCode] = [];
      teamGroups[stat.teamCode].push(stat);
    }

    for (const teamCode of Object.keys(teamGroups).sort()) {
      const teamStats = teamGroups[teamCode];
      const hitters = teamStats.filter(s => !s.isPitcher);
      const pitchers = teamStats.filter(s => s.isPitcher);

      // Count positions
      const posCounts: Record<string, number> = {};
      for (const h of hitters) {
        const pos = h.position || 'UT';
        posCounts[pos] = (posCounts[pos] || 0) + 1;
      }

      // Find MI eligibles (2B/SS extra)
      const miEligibles = hitters.filter(h => MI_POSITIONS.includes(h.position || ''));
      const cmEligibles = hitters.filter(h => CM_POSITIONS.includes(h.position || ''));

      // Assign MI slot: If we have extra 2B or SS, assign one as MI
      const has2B = (posCounts['2B'] || 0) >= 1;
      const hasSS = (posCounts['SS'] || 0) >= 1;
      
      if (miEligibles.length >= 2 && has2B && hasSS) {
        // Pick the 2nd one as MI
        const ssPlayers = hitters.filter(h => h.position === 'SS');
        const twoB_Players = hitters.filter(h => h.position === '2B');
        
        // If 2+ SS, make one MI; if 2+ 2B, make one MI
        if (ssPlayers.length >= 2) {
          await prisma.historicalPlayerStat.update({
            where: { id: ssPlayers[1].id },
            data: { position: 'MI' },
          });
          console.log(`   ${teamCode}: ${ssPlayers[1].fullName || ssPlayers[1].playerName} → MI (was SS)`);
        } else if (twoB_Players.length >= 2) {
          await prisma.historicalPlayerStat.update({
            where: { id: twoB_Players[1].id },
            data: { position: 'MI' },
          });
          console.log(`   ${teamCode}: ${twoB_Players[1].fullName || twoB_Players[1].playerName} → MI (was 2B)`);
        }
      }

      // Assign CM slot: If we have extra 1B or 3B, assign one as CM
      const has1B = (posCounts['1B'] || 0) >= 1;
      const has3B = (posCounts['3B'] || 0) >= 1;
      
      if (cmEligibles.length >= 2 && has1B && has3B) {
        const oneBPlayers = hitters.filter(h => h.position === '1B');
        const threeBPlayers = hitters.filter(h => h.position === '3B');
        
        if (oneBPlayers.length >= 2) {
          await prisma.historicalPlayerStat.update({
            where: { id: oneBPlayers[1].id },
            data: { position: 'CM' },
          });
          console.log(`   ${teamCode}: ${oneBPlayers[1].fullName || oneBPlayers[1].playerName} → CM (was 1B)`);
        } else if (threeBPlayers.length >= 2) {
          await prisma.historicalPlayerStat.update({
            where: { id: threeBPlayers[1].id },
            data: { position: 'CM' },
          });
          console.log(`   ${teamCode}: ${threeBPlayers[1].fullName || threeBPlayers[1].playerName} → CM (was 3B)`);
        }
      }
    }
  }

  console.log('\n');
}

async function validateRosters() {
  console.log('\n🔍 Validating roster composition...\n');

  const periods = await prisma.historicalPeriod.findMany({
    where: { season: { year: 2025 } },
    include: {
      stats: {
        select: {
          id: true,
          fullName: true,
          playerName: true,
          position: true,
          isPitcher: true,
          teamCode: true,
        },
      },
    },
    orderBy: { periodNumber: 'asc' },
  });

  for (const period of periods) {
    console.log(`\n📅 Period ${period.periodNumber}:`);

    const teamGroups: Record<string, typeof period.stats> = {};
    for (const stat of period.stats) {
      if (!teamGroups[stat.teamCode]) teamGroups[stat.teamCode] = [];
      teamGroups[stat.teamCode].push(stat);
    }

    for (const teamCode of Object.keys(teamGroups).sort()) {
      const teamStats = teamGroups[teamCode];
      const hitters = teamStats.filter(s => !s.isPitcher);
      const pitchers = teamStats.filter(s => s.isPitcher);
      const warnings: string[] = [];

      // Check pitcher count
      if (pitchers.length !== EXPECTED_PITCHER_COUNT) {
        warnings.push(`Pitchers: ${pitchers.length} (expected ${EXPECTED_PITCHER_COUNT})`);
      }

      // Count hitter positions
      const posCounts: Record<string, number> = {};
      for (const h of hitters) {
        const pos = h.position || 'UT';
        posCounts[pos] = (posCounts[pos] || 0) + 1;
      }

      // Check each expected slot
      for (const slot of EXPECTED_HITTER_SLOTS) {
        const actual = posCounts[slot.position] || 0;
        if (actual < slot.count) {
          warnings.push(`${slot.position}: ${actual} (need ${slot.count})`);
        }
      }

      // Check total hitters
      if (hitters.length !== 14) {
        warnings.push(`Total hitters: ${hitters.length} (expected 14)`);
      }

      if (warnings.length > 0) {
        console.log(`   ⚠️ ${teamCode}:`);
        warnings.forEach(w => console.log(`      - ${w}`));
      } else {
        console.log(`   ✅ ${teamCode}: Valid roster`);
      }
    }
  }

  console.log('\n');
}

async function main() {
  try {
    await normalizeAndAssignPositions();
    await validateRosters();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
