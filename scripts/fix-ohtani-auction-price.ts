/**
 * Fix Ohtani (Pitcher) keeper price in Skunk Dogs auction state
 * Commissioner corrected roster price from $20 → $15, but the
 * auction session state still has the old price, causing -$5 budget.
 *
 * Run: npx tsx scripts/fix-ohtani-auction-price.ts
 */

import { prisma } from "../server/src/db/prisma.js";

async function main() {
  const session = await prisma.auctionSession.findFirst({
    where: { leagueId: 20 },
    orderBy: { createdAt: "desc" },
  });

  if (!session) {
    console.log("No auction session found for league 20");
    return;
  }

  console.log("Session id:", session.id);
  const state = session.state as any;
  const teams: any[] = state.teams || [];

  let fixed = false;

  for (const t of teams) {
    if (!t.name?.toLowerCase().includes("skunk")) continue;

    console.log("\nSkunk Dogs BEFORE:");
    console.log("  budget:", t.budget);
    console.log("  keeperSpend:", t.keeperSpend);
    console.log("  auctionSpend:", t.auctionSpend);
    console.log("  dbBudget:", t.dbBudget);

    // Fix Ohtani price in roster
    for (const p of t.roster || []) {
      if (
        p.playerName?.toLowerCase().includes("ohtani") &&
        p.posPrimary === "P" &&
        p.price === 20
      ) {
        console.log(`\n  Fixing Ohtani (Pitcher) roster price: $20 → $15`);
        p.price = 15;
        fixed = true;
      }
    }

    // Recalculate keeper spend from roster
    const newKeeperSpend = (t.roster || [])
      .filter((p: any) => p.source === "prior_season")
      .reduce((sum: number, p: any) => sum + (p.price || 0), 0);

    const newBudget = t.dbBudget - newKeeperSpend - t.auctionSpend;

    t.keeperSpend = newKeeperSpend;
    t.budget = newBudget;
    t.maxBid = Math.max(0, newBudget - ((t.spotsLeft || 1) - 1));

    console.log("\nSkunk Dogs AFTER:");
    console.log("  budget:", t.budget);
    console.log("  keeperSpend:", t.keeperSpend);
    console.log("  maxBid:", t.maxBid);
  }

  // Fix log entries
  for (const entry of state.log || []) {
    if (
      entry.playerName?.toLowerCase().includes("ohtani") &&
      entry.posPrimary === "P" &&
      entry.price === 20 &&
      entry.teamName?.toLowerCase().includes("skunk")
    ) {
      entry.price = 15;
      console.log("\nFixed auction log entry: $20 → $15");
    }
  }

  if (fixed) {
    await prisma.auctionSession.update({
      where: { id: session.id },
      data: { state: state },
    });
    console.log("\n✓ Saved to database. Restart server to reload auction state.");
  } else {
    console.log("\nOhtani at $20 not found — may already be fixed.");
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
