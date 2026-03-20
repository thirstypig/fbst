
import { prisma } from '../src/db/prisma.js';

async function resetRosters() {
  console.log("Resetting Rosters and Auction Data...");
  
  // Clear Auction Lots (Active/History)
  await prisma.auctionBid.deleteMany({});
  await prisma.auctionLot.deleteMany({});
  
  // Clear Rosters (Keepers/Prior Drafts)
  await prisma.roster.deleteMany({});
  
  console.log("✅ Rosters and Auction Data cleared.");
}

resetRosters()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
