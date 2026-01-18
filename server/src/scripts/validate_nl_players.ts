// Validate NL-only players and flag any AL players
import { prisma } from '../db/prisma';

// National League teams
const NL_TEAMS = new Set([
  'ARI', 'ATL', 'CHC', 'CIN', 'COL', 'LAD', 'MIA', 'MIL',
  'NYM', 'PHI', 'PIT', 'SD', 'SF', 'STL', 'WSH'
]);

// American League teams
const AL_TEAMS = new Set([
  'BAL', 'BOS', 'CLE', 'DET', 'HOU', 'KC', 'LAA', 'MIN',
  'NYY', 'OAK', 'SEA', 'TB', 'TEX', 'TOR', 'CWS'
]);

async function validateNLPlayers() {
  console.log('\n⚾ Validating NL-only players...\n');

  const periods = await prisma.historicalPeriod.findMany({
    where: { season: { year: 2025 } },
    include: {
      stats: {
        where: { mlbTeam: { not: null } },
        select: {
          id: true,
          fullName: true,
          playerName: true,
          mlbTeam: true,
          teamCode: true,
          isPitcher: true,
          position: true,
        },
      },
    },
    orderBy: { periodNumber: 'asc' },
  });

  for (const period of periods) {
    console.log(`\n📅 Period ${period.periodNumber}:`);
    
    const alPlayers = period.stats.filter(s => AL_TEAMS.has(s.mlbTeam!));
    const nlPlayers = period.stats.filter(s => NL_TEAMS.has(s.mlbTeam!));
    const unknownTeam = period.stats.filter(s => !AL_TEAMS.has(s.mlbTeam!) && !NL_TEAMS.has(s.mlbTeam!));
    
    console.log(`   NL players: ${nlPlayers.length}`);
    console.log(`   AL players: ${alPlayers.length}`);
    console.log(`   Unknown: ${unknownTeam.length}`);
    
    if (alPlayers.length > 0) {
      console.log(`   ⚠️ AL players found:`);
      alPlayers.slice(0, 10).forEach(p => {
        console.log(`      - ${p.fullName || p.playerName} (${p.mlbTeam}) on ${p.teamCode}`);
      });
      if (alPlayers.length > 10) {
        console.log(`      ... and ${alPlayers.length - 10} more`);
      }
    }
    
    if (unknownTeam.length > 0) {
      console.log(`   ❓ Unknown teams:`);
      unknownTeam.forEach(p => {
        console.log(`      - ${p.fullName || p.playerName} (${p.mlbTeam})`);
      });
    }
  }
  
  console.log('\n');
}

async function showPositionEligibility() {
  console.log('📋 Position Eligibility Reference:');
  console.log('   MI (Middle Infielder): 2B, SS eligible');
  console.log('   CM (Corner Man): 1B, 3B eligible');
  console.log('   OF: LF, CF, RF, OF eligible');
  console.log('   DH: Any player');
  console.log('\n');
}

async function main() {
  try {
    await showPositionEligibility();
    await validateNLPlayers();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
