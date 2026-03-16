/**
 * Fix missing league memberships for admin user (ID 1).
 * Usage: npx tsx scripts/fix-memberships.ts
 */
import { PrismaClient } from "../server/node_modules/.prisma/client/index.js";
const prisma = new PrismaClient();

async function main() {
  const leagues = await prisma.league.findMany({ select: { id: true, name: true, season: true } });
  console.log("Leagues:", leagues.map(l => `${l.name} ${l.season} (ID ${l.id})`).join(", "));

  for (const league of leagues) {
    const existing = await prisma.leagueMembership.findFirst({
      where: { leagueId: league.id, userId: 1 },
    });
    if (existing) {
      console.log(`  User 1 already has membership in league ${league.id} (${existing.role})`);
    } else {
      await prisma.leagueMembership.create({
        data: { leagueId: league.id, userId: 1, role: "COMMISSIONER" },
      });
      console.log(`  Created COMMISSIONER membership for user 1 in league ${league.id} (${league.name} ${league.season})`);
    }
  }

  console.log("\nDone.");
  await prisma.$disconnect();
}
main();
