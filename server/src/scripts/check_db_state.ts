
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    // @ts-ignore - TradeProposal might not exist in client types if regenerated, but trying anyway
    // If it fails, we catch it.
    const tradeCount = await prisma.tradeProposal.count();
    console.log(`TradeProposal count: ${tradeCount}`);
  } catch (e) {
    console.log("Could not count TradeProposal (model might not exist in client):", e.message);
  }

  try {
    const txns = await prisma.transactionEvent.groupBy({
      by: ['rowHash'],
      _count: {
        rowHash: true
      },
      having: {
        rowHash: {
          _count: {
            gt: 1
          }
        }
      }
    });
    console.log(`Duplicate TransactionEvent rowHashes: ${txns.length}`);
  } catch (e) {
    console.log("Could not check duplicate transactions:", e.message);
  }

  await prisma.$disconnect();
}

main();
