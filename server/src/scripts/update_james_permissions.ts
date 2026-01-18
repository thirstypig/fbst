// Temporary script to update James Chang's permissions
import { prisma } from '../db/prisma';

async function updateJamesChang() {
  console.log('\n🔧 Updating James Chang permissions...\n');

  // Find James Chang
  const user = await prisma.user.findFirst({
    where: { 
      OR: [
        { email: { contains: 'jameschang', mode: 'insensitive' } },
        { name: { contains: 'James Chang', mode: 'insensitive' } }
      ]
    }
  });

  if (!user) {
    console.error('❌ James Chang user not found');
    return;
  }

  console.log(`Found user: ${user.name} (${user.email})`);

  // Get first team or create one
  let team = await prisma.team.findFirst();
  
  if (!team) {
    console.log('No teams found, creating a demo team...');
    team = await prisma.team.create({
      data: {
        name: 'Demo Team',
        shortCode: 'DEMO'
      }
    });
  }

  // Update user to be Admin + Commissioner + Team Owner
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      isAdmin: true,
      isCommissioner: true,
      teamId: team.id,
    }
  });

  console.log(`\n✅ Updated ${updated.name}:`);
  console.log(`   - Admin: ${updated.isAdmin}`);
  console.log(`   - Commissioner: ${updated.isCommissioner}`);
  console.log(`   - Team: ${team.name} (ID: ${team.id})`);
  console.log('');
}

async function main() {
  try {
    await updateJamesChang();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
