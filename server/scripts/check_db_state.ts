
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const teamCount = await prisma.team.count();
  const leagueCount = await prisma.league.count();
  const userCount = await prisma.user.count();

  console.log('--- DB State ---');
  console.log(`Teams: ${teamCount}`);
  console.log(`Leagues: ${leagueCount}`);
  console.log(`Users: ${userCount}`);
  
  if (leagueCount > 0) {
      const league = await prisma.league.findFirst({ include: { teams: true } });
      console.log('First League:', league?.name);
      console.log('League Teams:', league?.teams.length);
  } else {
      console.log('No leagues found.');
  }

  if (userCount > 0) {
      const user = await prisma.user.findFirst();
      console.log('First User:', user?.email);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
