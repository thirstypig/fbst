import prisma from "./prisma";

async function main() {
  console.log("🌱 Seeding OGBA teams, period, stats, and sample roster...");

  // --- 1. Upsert OGBA teams ---
  const teamsData = [
    { name: "Dodger Dawgs", owner: null },
    { name: "Demolition Lumber Co", owner: null },
    { name: "RGing Sluggers", owner: null },
    { name: "Los Doyers", owner: "James Chang" },
    { name: "The Show", owner: null },
    { name: "Skunk Dogs", owner: null },
    { name: "Diamond Kings", owner: null },
    { name: "Devil Dawgs", owner: null },
  ];

  const teams = [];
  for (const data of teamsData) {
    const team = await prisma.team.upsert({
      where: { name: data.name },
      update: {
        owner: data.owner ?? null,
      },
      create: {
        name: data.name,
        owner: data.owner ?? null,
        budget: 400,
      },
    });
    teams.push(team);
  }
  console.log(`✅ Created/updated ${teams.length} teams.`);

  // --- 2. Ensure a test active period exists ---
  const periodName = "2025 Period 1";
  const period = await prisma.period.upsert({
    where: { id: 1 },
    update: {
      name: periodName,
      status: "active",
    },
    create: {
      name: periodName,
      startDate: new Date("2025-03-30T00:00:00.000Z"),
      endDate: new Date("2025-04-27T00:00:00.000Z"),
      status: "active",
    },
  });

  console.log(`✅ Period ready: ${period.name}`);

  // --- 3. Upsert some fake period stats for standings/categories ---
  // These are just illustrative numbers
  const periodStatsData = [
    {
      teamName: "Dodger Dawgs",
      R: 120,
      HR: 28,
      RBI: 100,
      SB: 12,
      AVG: 0.276,
      W: 9,
      S: 4,
      ERA: 3.4,
      WHIP: 1.18,
      K: 105,
      gamesPlayed: 110,
    },
    {
      teamName: "Demolition Lumber Co",
      R: 140,
      HR: 34,
      RBI: 112,
      SB: 8,
      AVG: 0.265,
      W: 7,
      S: 6,
      ERA: 3.9,
      WHIP: 1.2,
      K: 98,
      gamesPlayed: 112,
    },
    {
      teamName: "RGing Sluggers",
      R: 115,
      HR: 22,
      RBI: 90,
      SB: 16,
      AVG: 0.29,
      W: 10,
      S: 2,
      ERA: 3.28,
      WHIP: 1.12,
      K: 130,
      gamesPlayed: 108,
    },
    {
      teamName: "Los Doyers",
      R: 108,
      HR: 18,
      RBI: 88,
      SB: 10,
      AVG: 0.25,
      W: 8,
      S: 5,
      ERA: 4.05,
      WHIP: 1.33,
      K: 85,
      gamesPlayed: 109,
    },
    {
      teamName: "The Show",
      R: 130,
      HR: 31,
      RBI: 110,
      SB: 9,
      AVG: 0.27,
      W: 6,
      S: 3,
      ERA: 4.22,
      WHIP: 1.25,
      K: 92,
      gamesPlayed: 111,
    },
    {
      teamName: "Skunk Dogs",
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
      gamesPlayed: 107,
    },
    {
      teamName: "Diamond Kings",
      R: 122,
      HR: 29,
      RBI: 115,
      SB: 14,
      AVG: 0.284,
      W: 11,
      S: 1,
      ERA: 3.6,
      WHIP: 1.19,
      K: 140,
      gamesPlayed: 113,
    },
    {
      teamName: "Devil Dawgs",
      R: 102,
      HR: 24,
      RBI: 91,
      SB: 7,
      AVG: 0.26,
      W: 4,
      S: 8,
      ERA: 4.1,
      WHIP: 1.28,
      K: 89,
      gamesPlayed: 106,
    },
  ];

  for (const data of periodStatsData) {
    const team = teams.find((t) => t.name === data.teamName);
    if (!team) continue;
  
    await prisma.teamStatsPeriod.upsert({
      where: {
        teamId_periodId: {
          teamId: team.id,
          periodId: period.id,
        },
      },
      update: {
        R: data.R,
        HR: data.HR,
        RBI: data.RBI,
        SB: data.SB,
        AVG: data.AVG,
        W: data.W,
        S: data.S,          // <-- changed from SV to S
        ERA: data.ERA,
        WHIP: data.WHIP,
        K: data.K,
        gamesPlayed: data.gamesPlayed,
      },
      create: {
        teamId: team.id,
        periodId: period.id,
        R: data.R,
        HR: data.HR,
        RBI: data.RBI,
        SB: data.SB,
        AVG: data.AVG,
        W: data.W,
        S: data.S,          // <-- changed from SV to S
        ERA: data.ERA,
        WHIP: data.WHIP,
        K: data.K,
        gamesPlayed: data.gamesPlayed,
      },
    });
  }
  

  console.log("✅ Period stats upserted for all teams.");

// --- 4. Seed season stats as YTD = current period (for now) ---
for (const team of teams) {
  const p = periodStatsData.find((d) => d.teamName === team.name);

  const base = p ?? {
    R: 0,
    HR: 0,
    RBI: 0,
    SB: 0,
    AVG: 0,
    W: 0,
    S: 0,
    ERA: 0,
    WHIP: 0,
    K: 0,
    gamesPlayed: 0,
  };

  await prisma.teamStatsSeason.upsert({
    where: { teamId: team.id },
    update: {
      R: base.R,
      HR: base.HR,
      RBI: base.RBI,
      SB: base.SB,
      AVG: base.AVG,
      W: base.W,
      S: base.S,
      ERA: base.ERA,
      WHIP: base.WHIP,
      K: base.K,
      gamesPlayed: base.gamesPlayed,
    },
    create: {
      teamId: team.id,
      R: base.R,
      HR: base.HR,
      RBI: base.RBI,
      SB: base.SB,
      AVG: base.AVG,
      W: base.W,
      S: base.S,
      ERA: base.ERA,
      WHIP: base.WHIP,
      K: base.K,
      gamesPlayed: base.gamesPlayed,
    },
  });
}

console.log("✅ Season stats rows ensured for all teams (YTD = current period).");





  console.log("✅ Season stats rows ensured for all teams (initialized to 0).");

  // --- 5. Seed sample players + roster for Dodger Dawgs ---

  // Clear existing roster & players to keep it simple while iterating
  await prisma.roster.deleteMany();
  await prisma.player.deleteMany();
  console.log("✅ Cleared existing players and roster.");

  const playersData = [
    {
      name: "Mookie Betts",
      mlbId: 1,
      posPrimary: "2B",
      posList: "2B,OF",
    },
    {
      name: "Freddie Freeman",
      mlbId: 2,
      posPrimary: "1B",
      posList: "1B",
    },
    {
      name: "Will Smith",
      mlbId: 3,
      posPrimary: "C",
      posList: "C",
    },
    {
      name: "Teoscar Hernández",
      mlbId: 4,
      posPrimary: "OF",
      posList: "OF",
    },
    {
      name: "Bryce Harper",
      mlbId: 5,
      posPrimary: "1B",
      posList: "1B,OF",
    },
    {
      name: "Juan Soto",
      mlbId: 6,
      posPrimary: "OF",
      posList: "OF",
    },
    {
      name: "Zack Wheeler",
      mlbId: 7,
      posPrimary: "SP",
      posList: "SP",
    },
    {
      name: "Devin Williams",
      mlbId: 8,
      posPrimary: "RP",
      posList: "RP",
    },
  ];

  const players = [];
  for (const p of playersData) {
    const player = await prisma.player.create({
      data: {
        name: p.name,
        mlbId: p.mlbId,
        posPrimary: p.posPrimary,
        posList: p.posList,
      },
    });
    players.push(player);
  }

  console.log(`✅ Seeded ${players.length} players.`);

  const dodgerDawgs = teams.find((t) => t.name === "Dodger Dawgs");
  if (!dodgerDawgs) {
    throw new Error("Dodger Dawgs team not found – cannot seed roster");
  }

  const baseDate = new Date("2025-03-30T00:00:00.000Z");

  let price = 25;
  for (const player of players) {
    await prisma.roster.create({
      data: {
        teamId: dodgerDawgs.id,
        playerId: player.id,
        acquiredAt: baseDate,
        price,
        source: "auction",
        releasedAt: null,
      },
    });
    price -= 2;
    if (price < 5) price = 5;
  }

  console.log(
    `✅ Seeded current roster for Dodger Dawgs with ${players.length} players.`
  );

  console.log("🌱 Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
