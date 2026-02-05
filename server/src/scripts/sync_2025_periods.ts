
import { prisma } from '../db/prisma.js';

async function sync2025() {
  const NL_TEAMS = new Set(['ARI', 'AZ', 'ATL', 'CHC', 'CIN', 'COL', 'LAD', 'MIA', 'MIL', 'NYM', 'PHI', 'PIT', 'SD', 'SF', 'STL', 'WSH']);
  
  console.log('--- Syncing 2025 Data Across Periods ---');
  
  const allStats = await prisma.historicalPlayerStat.findMany({ 
    where: { period: { season: { year: 2025 } } },
    include: { period: true }
  });

  const bestData = new Map<string, { mlbId?: string, fullName?: string, mlbTeam?: string, position?: string, isPitcher?: boolean }>();

  // Pass 1: Collect best data from any period (preferring those with mlbId)
  allStats.forEach(s => {
    if (s.mlbId) {
      const existing = bestData.get(s.playerName);
      if (!existing || (!existing.mlbId)) {
        bestData.set(s.playerName, {
          mlbId: s.mlbId,
          fullName: s.fullName || s.playerName,
          mlbTeam: s.mlbTeam !== 'UNK' ? s.mlbTeam : existing?.mlbTeam,
          position: s.position,
          isPitcher: s.isPitcher
        });
      }
    }
  });

  console.log(`Collected best data for ${bestData.size} players.`);

  // Pass 2: Update records missing data
  let updatedCount = 0;
  const alPlayers = new Set<string>();

  for (const s of allStats) {
    const best = bestData.get(s.playerName);
    if (best) {
      let needsUpdate = false;
      const updateData: any = {};

      if (!s.mlbId && best.mlbId) {
        updateData.mlbId = best.mlbId;
        needsUpdate = true;
      }
      if ((!s.fullName || s.fullName === s.playerName) && best.fullName && best.fullName !== s.playerName) {
        updateData.fullName = best.fullName;
        needsUpdate = true;
      }
      if ((!s.mlbTeam || s.mlbTeam === 'UNK') && best.mlbTeam && best.mlbTeam !== 'UNK') {
        updateData.mlbTeam = best.mlbTeam;
        needsUpdate = true;
      }
      if (!s.position && best.position) {
        updateData.position = best.position;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await prisma.historicalPlayerStat.update({
          where: { id: s.id },
          data: updateData
        });
        updatedCount++;
      }

      // Check NL status
      const team = updateData.mlbTeam || s.mlbTeam;
      if (team && team !== 'UNK' && team !== 'FA' && !NL_TEAMS.has(team)) {
        alPlayers.add(`${s.playerName} (${team})`);
      }
    }
  }

  console.log(`✅ Updated ${updatedCount} records with consistent MLB IDs/Names.`);
  console.log(`⚠️ Found ${alPlayers.size} non-NL players in the 2025 pool:`);
  if (alPlayers.size > 0) {
    const list = Array.from(alPlayers).sort();
    console.log(list.join(', '));
  }
}

sync2025().catch(console.error).finally(() => prisma.$disconnect());
