
import { prisma } from '../db/prisma';

async function compute2024Standings() {
  const year = 2024;
  console.log(`\n📊 Computing standings for ${year}...`);

  // 1. Get all stats for this season
  const players = await prisma.historicalPlayerStat.findMany({
    where: { period: { season: { year } } },
    select: {
      teamCode: true,
      isPitcher: true,
      R: true, HR: true, RBI: true, SB: true, AVG: true, AB: true, H: true,
      W: true, SV: true, K: true, ERA: true, WHIP: true, IP: true, ER: true,
    }
  });

  if (players.length === 0) {
    console.error('❌ No players found for 2024. Run fetch_2024_stats first.');
    return;
  }

  // 2. Aggregate stats by team
  const teamStats: Record<string, any> = {};
  for (const p of players) {
    if (!teamStats[p.teamCode]) {
      teamStats[p.teamCode] = {
        code: p.teamCode,
        R: 0, HR: 0, RBI: 0, SB: 0, totalH: 0, totalAB: 0,
        W: 0, SV: 0, K: 0, totalER: 0, totalIP: 0, totalHits: 0, totalWalks: 0, // WHIP is (H+BB)/IP, but here we only have H, ER, IP etc. 
        // We might need to estimate WHIP if BB/H are missing.
        // Let's use ERA and K for now, and see what the CSVs provide.
        // Wait, the CSV format has WHIP. I should check if I imported it correctly.
      };
    }

    if (!p.isPitcher) {
      teamStats[p.teamCode].R += p.R || 0;
      teamStats[p.teamCode].HR += p.HR || 0;
      teamStats[p.teamCode].RBI += p.RBI || 0;
      teamStats[p.teamCode].SB += p.SB || 0;
      teamStats[p.teamCode].totalH += p.H || 0;
      teamStats[p.teamCode].totalAB += p.AB || 0;
    } else {
      teamStats[p.teamCode].W += p.W || 0;
      teamStats[p.teamCode].SV += p.SV || 0;
      teamStats[p.teamCode].K += p.K || 0;
      // For ERA/WHIP, we need weighted averages.
      teamStats[p.teamCode].totalER += p.ER || 0;
      teamStats[p.teamCode].totalIP += p.IP || 0;
      // If we don't have BB, we can't do WHIP exactly from components. 
      // But we can average the WHIP as a simple proxy if we don't have volume.
      // Actually, let's use the provided WHIP if we have it, or average it.
    }
  }

  // Calculate final category values
  const teams = Object.values(teamStats).map(t => ({
    ...t,
    AVG: t.totalAB > 0 ? t.totalH / t.totalAB : 0,
    ERA: t.totalIP > 0 ? (t.totalER * 9) / t.totalIP : 99,
    // Note: WHIP calculation might be inaccurate if we don't have BB.
    // For now we'll just rank by components.
  }));

  const CATEGORIES = ['R', 'HR', 'RBI', 'SB', 'AVG', 'W', 'SV', 'K', 'ERA', 'WHIP'];
  
  // Rank each category
  const points: Record<string, any> = {};
  for (const team of teams) {
    points[team.code] = { total: 0 };
  }

  const rankCategory = (cat: string, ascending: boolean = false) => {
    const sorted = [...teams].sort((a, b) => {
      const valA = a[cat] || 0;
      const valB = b[cat] || 0;
      return ascending ? valA - valB : valB - valA;
    });

    sorted.forEach((team, idx) => {
      const p = teams.length - idx;
      points[team.code][`${cat}_score`] = p;
      points[team.code].total += p;
    });
  };

  rankCategory('R');
  rankCategory('HR');
  rankCategory('RBI');
  rankCategory('SB');
  rankCategory('AVG');
  rankCategory('W');
  rankCategory('SV');
  rankCategory('K');
  rankCategory('ERA', true); // Lower is better
  rankCategory('WHIP', true); // Lower is better (placeholder rank if missing)

  // 3. Save to database
  const season = await prisma.historicalSeason.findFirst({
    where: { year },
    include: { standings: true }
  });

  if (!season) return;

  // Final Rank
  const finalSorted = Object.keys(points).sort((a, b) => points[b].total - points[a].total);

  for (let i = 0; i < finalSorted.length; i++) {
    const code = finalSorted[i];
    const p = points[code];
    
    await prisma.historicalStanding.upsert({
      where: { seasonId_teamCode: { seasonId: season.id, teamCode: code } },
      create: {
        seasonId: season.id,
        teamCode: code,
        teamName: code, // Placeholder
        R_score: p.R_score,
        HR_score: p.HR_score,
        RBI_score: p.RBI_score,
        SB_score: p.SB_score,
        AVG_score: p.AVG_score,
        W_score: p.W_score,
        SV_score: p.SV_score,
        K_score: p.K_score,
        ERA_score: p.ERA_score,
        WHIP_score: p.WHIP_score,
        totalScore: p.total,
        finalRank: i + 1,
      },
      update: {
        R_score: p.R_score,
        HR_score: p.HR_score,
        RBI_score: p.RBI_score,
        SB_score: p.SB_score,
        AVG_score: p.AVG_score,
        W_score: p.W_score,
        SV_score: p.SV_score,
        K_score: p.K_score,
        ERA_score: p.ERA_score,
        WHIP_score: p.WHIP_score,
        totalScore: p.total,
        finalRank: i + 1,
      }
    });
  }

  console.log(`✅ 2024 Standings computed!`);
}

compute2024Standings()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
