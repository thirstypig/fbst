
import { prisma } from '../db/prisma.js';

async function verify() {
  const NL_TEAMS = new Set(['ARI', 'ATL', 'CHC', 'CIN', 'COL', 'LAD', 'MIA', 'MIL', 'NYM', 'PHI', 'PIT', 'SD', 'SF', 'STL', 'WSH']);
  
  console.log('--- Verifying 2025 Data Consistency ---');
  
  const stats = await prisma.historicalPlayerStat.findMany({ 
    where: { period: { season: { year: 2025 } } },
    include: { period: true }
  });

  const playerMlbIdMap = new Map<string, string>(); 
  const playerMlbTeamMap = new Map<string, string>(); 
  const playerFullNameMap = new Map<string, string>();

  // Collect all known mappings from any period
  stats.forEach(s => {
    if (s.mlbId) playerMlbIdMap.set(s.playerName, s.mlbId);
    if (s.mlbTeam && s.mlbTeam !== 'UNK') playerMlbTeamMap.set(s.playerName, s.mlbTeam);
    if (s.fullName && s.fullName !== s.playerName) playerFullNameMap.set(s.playerName, s.fullName);
  });

  const updates = [];
  const nonNlPlayers = new Set();

  for (const s of stats) {
    let needsUpdate = false;
    const updateData: any = {};

    if (!s.mlbId && playerMlbIdMap.has(s.playerName)) {
      updateData.mlbId = playerMlbIdMap.get(s.playerName);
      needsUpdate = true;
    }
    if ((!s.mlbTeam || s.mlbTeam === 'UNK') && playerMlbTeamMap.has(s.playerName)) {
      updateData.mlbTeam = playerMlbTeamMap.get(s.playerName);
      needsUpdate = true;
    }
    if (s.fullName === s.playerName && playerFullNameMap.has(s.playerName)) {
      updateData.fullName = playerFullNameMap.get(s.playerName);
      needsUpdate = true;
    }

    if (needsUpdate) {
      updates.push({ id: s.id, playerName: s.playerName, period: s.period.periodNumber, data: updateData });
    }

    const team = s.mlbTeam || playerMlbTeamMap.get(s.playerName);
    if (team && team !== 'UNK' && !NL_TEAMS.has(team)) {
      nonNlPlayers.add(\`\${s.playerName} (\${team})\`);
    }
  }

  console.log(\`Found \${updates.length} records needing internal sync (name/ID/team from other periods).\`);
  if (updates.length > 0) {
    console.log('Sample updates:', JSON.stringify(updates.slice(0, 5), null, 2));
  }

  console.log(\`Found \${nonNlPlayers.size} non-NL players in the 2025 pool.\`);
  if (nonNlPlayers.size > 0) {
    console.log('Sample non-NL:', Array.from(nonNlPlayers).slice(0, 10));
  }
}

verify().catch(console.error).finally(() => prisma.$disconnect());
