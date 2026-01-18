import { prisma } from '../db/prisma';

prisma.leagueMembership.updateMany({
  where: { user: { OR: [{ email: { contains: 'jameschang' } }, { name: { contains: 'James Chang' } }] } },
  data: { isCommissioner: true }
}).then(r => {
  console.log(`✅ Updated ${r.count} membership(s)`);
  prisma.$disconnect();
}).catch(e => {
  console.error('Error:', e);
  prisma.$disconnect();
  process.exit(1);
});
