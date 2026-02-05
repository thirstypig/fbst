
import { prisma } from '../db/prisma.js';
import fetch from 'node-fetch';

async function hydrate() {
  const year = 2025;
  const openingDay = '2025-03-18';
  
  console.log(`--- Hydrating Stats for ${year} (Fixed byDateRange) ---`);
  
  const season = await prisma.historicalSeason.findFirst({ where: { year } });
  if (!season) {
    console.error('Season 2025 not found');
    return;
  }

  const periods = await prisma.historicalPeriod.findMany({ 
    where: { seasonId: season.id },
    include: { stats: { where: { mlbId: { not: null } } } },
    orderBy: { periodNumber: 'asc' }
  });

  for (const period of periods) {
    const start = period.startDate?.toISOString().split('T')[0] || openingDay;
    const end = period.endDate?.toISOString().split('T')[0] || start;
    console.log(`Processing Period ${period.periodNumber}: ${start} to ${end} (${period.stats.length} players)`);

    for (const s of period.stats) {
      if (!s.mlbId) continue;
      
      try {
        const group = s.isPitcher ? 'pitching' : 'hitting';
        const url = `https://statsapi.mlb.com/api/v1/people/${s.mlbId}/stats?stats=byDateRange&group=${group}&startDate=${start}&endDate=${end}&season=${year}`;
        const response = await fetch(url);
        const data = await response.json() as any;
        const stat = data.stats?.[0]?.splits?.[0]?.stat;
        
        if (stat) {
          const updateData: any = {};
          if (group === 'hitting') {
            updateData.AB = stat.atBats || 0;
            updateData.H = stat.hits || 0;
            updateData.R = stat.runs || 0;
            updateData.HR = stat.homeRuns || 0;
            updateData.RBI = stat.rbi || 0;
            updateData.SB = stat.stolenBases || 0;
            updateData.AVG = stat.avg ? parseFloat(stat.avg) : 0;
            updateData.GS = stat.grandSlams || 0;
          } else {
            updateData.W = stat.wins || 0;
            updateData.SV = stat.saves || 0;
            updateData.K = stat.strikeOuts || 0;
            updateData.IP = stat.inningsPitched ? parseFloat(stat.inningsPitched) : 0;
            updateData.ER = stat.earnedRuns || 0;
            updateData.ERA = stat.era ? parseFloat(stat.era) : 0;
            updateData.WHIP = stat.whip ? parseFloat(stat.whip) : 0;
            updateData.SO = stat.shutouts || 0;
          }

          await prisma.historicalPlayerStat.update({
            where: { id: s.id },
            data: updateData
          });
        }
      } catch (err) {
        console.error(`Error for ${s.playerName} (${s.mlbId}):`, err);
      }
      await new Promise(r => setTimeout(r, 15)); // Rate limit
    }
  }
}

hydrate().catch(console.error).finally(() => prisma.$disconnect());
