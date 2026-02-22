import { prisma } from './db/prisma.js';

async function main() {
  console.log('⚾ Seeding fake stats for OGBA Period 1...');

  const period = await prisma.period.findFirst({
    where: { status: 'active' },
  });

  if (!period) {
    console.error('❌ No active period found.');
    return;
  }

  const fakeStats = [
    {
      teamName: 'Dodger Dawgs',
      R: 120,
      HR: 28,
      RBI: 100,
      SB: 12,
      AVG: 0.276,
      W: 9,
      S: 4,
      ERA: 3.40,
      WHIP: 1.18,
      K: 105,
      gamesPlayed: 110
    },
    {
      teamName: 'Demolition Lumber Co',
      R: 140,
      HR: 34,
      RBI: 112,
      SB: 8,
      AVG: 0.265,
      W: 7,
      S: 6,
      ERA: 3.90,
      WHIP: 1.20,
      K: 98,
      gamesPlayed: 108
    },
    {
      teamName: 'RGing Sluggers',
      R: 115,
      HR: 22,
      RBI: 90,
      SB: 16,
      AVG: 0.290,
      W: 10,
      S: 2,
      ERA: 3.28,
      WHIP: 1.12,
      K: 130,
      gamesPlayed: 112
    },
    {
      teamName: 'Los Doyers',
      R: 108,
      HR: 18,
      RBI: 88,
      SB: 10,
      AVG: 0.250,
      W: 8,
      S: 5,
      ERA: 4.05,
      WHIP: 1.33,
      K: 85,
      gamesPlayed: 109
    },
    {
      teamName: 'The Show',
      R: 130,
      HR: 31,
      RBI: 110,
      SB: 9,
      AVG: 0.270,
      W: 6,
      S: 3,
      ERA: 4.22,
      WHIP: 1.25,
      K: 92,
      gamesPlayed: 111
    },
    {
      teamName: 'Skunk Dogs',
      R: 98,
      HR: 15,
      RBI: 76,
      SB: 20,
      AVG: 0.242,
      W: 5,
      S: 7,
      ERA: 3.88,
      WHIP: 1.16,
      K: 101,
      gamesPlayed: 105
    },
    {
      teamName: 'Diamond Kings',
      R: 122,
      HR: 29,
      RBI: 115,
      SB: 14,
      AVG: 0.284,
      W: 11,
      S: 1,
      ERA: 3.60,
      WHIP: 1.19,
      K: 140,
      gamesPlayed: 110
    },
    {
      teamName: 'Devil Dawgs',
      R: 102,
      HR: 24,
      RBI: 91,
      SB: 7,
      AVG: 0.260,
      W: 4,
      S: 8,
      ERA: 4.10,
      WHIP: 1.28,
      K: 89,
      gamesPlayed: 104
    }
  ];

  for (const teamData of fakeStats) {
    const team = await prisma.team.findFirst({
      where: { name: teamData.teamName },
    });

    if (!team) {
      console.warn(`⚠️ Team not found: ${teamData.teamName}`);
      continue;
    }

    await prisma.teamStatsPeriod.updateMany({
      where: {
        teamId: team.id,
        periodId: period.id,
      },
      data: {
        R: teamData.R,
        HR: teamData.HR,
        RBI: teamData.RBI,
        SB: teamData.SB,
        AVG: teamData.AVG,
        W: teamData.W,
        S: teamData.S,
        ERA: teamData.ERA,
        WHIP: teamData.WHIP,
        K: teamData.K,
        gamesPlayed: teamData.gamesPlayed,
      },
    });

    console.log(`✔ Updated stats for ${teamData.teamName}`);
  }

  console.log('🎉 Fake stats seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
