
const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting Keeper Selection Verification...");
  
  // 1. Setup Test Data (League + Team + Players + Roster)
  // We'll reuse 'mock-league-2026' if it exists, or create new.
  
  const leagueName = "Verification League 2026";
  const teamName = "Verification Team";
  
  // Clean up previous run
  const existingLeague = await prisma.league.findFirst({ where: { name: leagueName } });
  if (existingLeague) {
    console.log("Cleaning up previous test league...");
    console.log("Cleaning up previous test league...");
    // Find all teams in this league
    const teams = await prisma.team.findMany({ where: { leagueId: existingLeague.id }, select: { id: true } });
    const teamIds = teams.map(t => t.id);
    
    // Delete Rosters
    if (teamIds.length > 0) {
        await prisma.roster.deleteMany({ where: { teamId: { in: teamIds } } });
        // Delete Teams
        await prisma.team.deleteMany({ where: { leagueId: existingLeague.id } });
    }
    
    // Now delete League
    await prisma.league.delete({ where: { id: existingLeague.id } });
  }
  
  console.log("Creating League...");
  const league = await prisma.league.create({
      data: {
          name: leagueName,
          season: 2026,
          draftMode: 'AUCTION',
          isPublic: false
      }
  });
  
  console.log("Creating Team...");
  const team = await prisma.team.create({
      data: {
          leagueId: league.id,
          name: teamName,
          budget: 260
      }
  });

  console.log("Creating Players...");
  // Create 3 players
  const p1 = await prisma.player.create({ data: { name: "Player One", posPrimary: "OF", posList: "OF" } });
  const p2 = await prisma.player.create({ data: { name: "Player Two", posPrimary: "SS", posList: "SS" } });
  const p3 = await prisma.player.create({ data: { name: "Player Three", posPrimary: "P", posList: "P" } });
  
  console.log("Creating Roster (Pre-Selection)...");
  // Add to roster with costs
  const r1 = await prisma.roster.create({ 
      data: { teamId: team.id, playerId: p1.id, price: 10, source: 'draft', isKeeper: false } 
  });
  const r2 = await prisma.roster.create({ 
      data: { teamId: team.id, playerId: p2.id, price: 20, source: 'draft', isKeeper: false } 
  });
  const r3 = await prisma.roster.create({ 
      data: { teamId: team.id, playerId: p3.id, price: 5, source: 'draft', isKeeper: false } 
  });
  
  // 2. Verify Initial State
  const initialKeepers = await prisma.roster.count({ where: { teamId: team.id, isKeeper: true } });
  console.log(`Initial Keepers Count: ${initialKeepers} (Expected: 0)`);
  if (initialKeepers !== 0) throw new Error("Initial state incorrect");

  // 3. Simulate "Save Keepers" Logic (mimic API endpoint)
  // Valid ids: r1.id and r3.id
  const keeperIds = [r1.id, r3.id];
  console.log(`Selecting Keepers: ${keeperIds.join(', ')}...`);

  await prisma.$transaction(async (tx) => {
      // Reset
      await tx.roster.updateMany({
          where: { teamId: team.id },
          data: { isKeeper: false }
      });
      // Set
      await tx.roster.updateMany({
          where: { id: { in: keeperIds } },
          data: { isKeeper: true }
      });
  });

  // 4. Verify Final State
  const finalRosters = await prisma.roster.findMany({ where: { teamId: team.id }, orderBy: { price: 'asc' } });
  
  console.log("\nFinal Roster State:");
  finalRosters.forEach(r => {
      const isExpected = keeperIds.includes(r.id);
      console.log(`- Player ID ${r.playerId} ($${r.price}): isKeeper=${r.isKeeper} [Expected=${isExpected}]`);
      if (r.isKeeper !== isExpected) throw new Error(`Mismatch for Roster ID ${r.id}`);
  });

  console.log("\nVerification Successful!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
