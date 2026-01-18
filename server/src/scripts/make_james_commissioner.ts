// Update James Chang to be commissioner via LeagueMembership
import { prisma } from '../db/prisma';

async function makeJamesCommissioner() {
  console.log('\n🔧 Making James Chang a commissioner...\n');

  // Find James Chang  
  const user = await prisma.user.findFirst({
    where: { 
      OR: [
        { email: { contains: 'jameschang', mode: 'insensitive' } },
        { name: { contains: 'James Chang', mode: 'insensitive' } }
      ]
    },
    include: {
      memberships: {
        include: {
          league: true,
          team: true,
        }
      }
    }
  });

  if (!user) {
    console.error('❌ James Chang not found');
    return;
  }

  console.log(`Found: ${user.name} (${user.email})`);
  console.log(`Memberships: ${user.memberships.length}`);

  if (user.memberships.length === 0) {
    console.log('⚠️  No league memberships found. User needs to be added to a league first.');
    return;
  }

  // Update all memberships to be commissioner
  for (const membership of user.memberships) {
    await prisma.leagueMembership.update({
      where: { id: membership.id },
      data: { isCommissioner: true },
    });
    console.log(`✅ Set as commissioner in: ${membership.league.name}`);
  }

  console.log(`\n✅ ${user.name} is now a commissioner!\n`);
}

async function main() {
  try {
    await makeJamesCommissioner();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
