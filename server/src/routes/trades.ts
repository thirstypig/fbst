
import { Router } from "express";
import prisma from "../prisma.js";

const router = Router();

// POST /api/trades - Propose a new trade
router.post("/", async (req, res) => {
  try {
    const { leagueId, proposerTeamId, items } = req.body;
    // items: [{ senderId, recipientId, assetType, playerId?, amount?, pickRound? }]

    // Validation ...

    const trade = await prisma.trade.create({
      data: {
        leagueId,
        proposerId: proposerTeamId,
        status: "PROPOSED",
        items: {
          create: items.map((item: any) => ({
            senderId: item.senderId,
            recipientId: item.recipientId,
            assetType: item.assetType,
            playerId: item.playerId,
            amount: item.amount,
            pickRound: item.pickRound,
          })),
        },
      },
      include: { items: true },
    });

    res.json(trade);
  } catch (e: any) {
    console.error("Error creating trade:", e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/trades - List trades for a league
router.get("/", async (req, res) => {
  const leagueId = Number(req.query.leagueId);
  if (!leagueId) return res.status(400).json({ error: "Missing leagueId" });

  const trades = await prisma.trade.findMany({
    where: { leagueId },
    include: {
      items: { include: { player: true, sender: true, recipient: true } },
      proposer: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(trades);
});

// POST /api/trades/:id/accept - Accept a trade
router.post("/:id/accept", async (req, res) => {
  const id = Number(req.params.id);
  // Logic to verify user is the recipient...
  // For now, simple implementation
  const trade = await prisma.trade.update({
    where: { id },
    data: { status: "ACCEPTED" },
  });
  res.json(trade);
});

// POST /api/trades/:id/reject - Reject a trade
router.post("/:id/reject", async (req, res) => {
  const id = Number(req.params.id);
  const trade = await prisma.trade.update({
    where: { id },
    data: { status: "REJECTED" },
  });
  res.json(trade);
});

// POST /api/trades/:id/process - Execute (Commission/Admin)
router.post("/:id/process", async (req, res) => {
  const id = Number(req.params.id);
  
  // 1. Verify status is ACCEPTED
  const trade = await prisma.trade.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!trade || trade.status !== "ACCEPTED") {
    return res.status(400).json({ error: "Trade not found or not accepted" });
  }

  // 2. Transact
  await prisma.$transaction(async (tx: any) => {
    // Process items
    for (const item of trade.items) {
      if (item.assetType === "PLAYER" && item.playerId) {
        // Move player: Update Roster
        // Find current roster entry for sender
        const rosterEntry = await tx.roster.findFirst({
          where: { teamId: item.senderId, playerId: item.playerId, releasedAt: null },
        });

        if (rosterEntry) {
           // Release from sender
           await tx.roster.update({
             where: { id: rosterEntry.id },
             data: { releasedAt: new Date(), source: "TRADE_OUT" }, // Maybe keep original source but set releasedAt?
           });
           
           // Add to recipient
           await tx.roster.create({
             data: {
               teamId: item.recipientId,
               playerId: item.playerId,
               source: "TRADE_IN",
               acquiredAt: new Date(), // Effective immediately?
               price: rosterEntry.price, // Keep price (keeper value)
               assignedPosition: null, 
             },
           });
        }
      } else if (item.assetType === "BUDGET") {
        // Transfer budget
        await tx.team.update({
          where: { id: item.senderId },
          data: { budget: { decrement: item.amount || 0 } },
        });
        await tx.team.update({
          where: { id: item.recipientId },
          data: { budget: { increment: item.amount || 0 } },
        });

        // Log finance event?
      }
    }

    // 3. Update Trade status
    await tx.trade.update({
      where: { id },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
  });

  res.json({ success: true });
});

export default router;
