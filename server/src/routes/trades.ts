// server/src/routes/trades.ts
import { Router } from "express";
import { prisma } from "../db/prisma";

export const tradesRouter = Router();

// GET all trades for current user (either proposing or accepting team)
// OR: ?view=all for league-wide activity
tradesRouter.get("/trades", async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const view = req.query.view as string | undefined;

    // Find teams owned by this user
    const userTeams = await prisma.team.findMany({
      where: { ownerUserId: user.id },
      select: { id: true, leagueId: true },
    });
    const teamIds = userTeams.map((t) => t.id);
    const leagueIds = [...new Set(userTeams.map((t) => t.leagueId))];

    if (teamIds.length === 0) {
      return res.json({ trades: [] });
    }

    let whereClause: any;
    if (view === "all") {
      // League-wide view: all trades in user's leagues that are ACCEPTED or PROCESSED
      whereClause = {
        proposingTeam: { leagueId: { in: leagueIds } },
        status: { in: ["ACCEPTED", "PROCESSED", "VETOED", "REJECTED"] },
      };
    } else {
      // Personal view: trades I'm involved in
      whereClause = {
        OR: [{ proposingTeamId: { in: teamIds } }, { acceptingTeamId: { in: teamIds } }],
      };
    }

    const trades = await prisma.tradeProposal.findMany({
      where: whereClause,
      include: {
        proposingTeam: { select: { id: true, name: true, code: true, ownerUserId: true } },
        acceptingTeam: { select: { id: true, name: true, code: true, ownerUserId: true } },
        items: {
          include: {
            player: { select: { id: true, name: true, posPrimary: true } },
          },
        },
        votes: {
          include: {
            team: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ trades });
  } catch (e: any) {
    console.error("Error fetching trades:", e);
    return res.status(500).json({ error: String(e?.message ?? e) });
  }
});

// --- Validation Helpers ---

async function validateTradeAssets(items: any[], proposingTeamId: number, acceptingTeamId: number) {
  // 1. Group items by sender
  const proposerItems = items.filter((i) => i.senderTeamId === proposingTeamId);
  const accepterItems = items.filter((i) => i.senderTeamId === acceptingTeamId);

  // 2. Validate Proposer Assets
  await validateTeamAssets(proposingTeamId, proposerItems);
  
  // 3. Validate Accepter Assets (only if checking a response, but here we check proposal integrity)
  // For a proposal, the proposer can propose taking *any* player from the accepter? 
  // Yes, usually. But we should check if those players actually exist on the accepter's team to avoid bad data.
  await validateTeamAssets(acceptingTeamId, accepterItems);
}

async function validateTeamAssets(teamId: number, items: any[]) {
  if (items.length === 0) return;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { rosters: true },
  });
  if (!team) throw new Error(`Team ${teamId} not found`);

  // Check Budget
  const budgetItems = items.filter((i) => i.assetType === "BUDGET");
  const totalBudget = budgetItems.reduce((sum, i) => sum + (i.amount || 0), 0);
  if (totalBudget > team.budget) {
    throw new Error(`Team ${team.name} does not have enough budget ($${team.budget} < $${totalBudget})`);
  }

  // Check Players
  const playerItems = items.filter((i) => i.assetType === "PLAYER");
  const rosterIds = new Set(team.rosters.map((r) => r.playerId));
  
  for (const item of playerItems) {
    // If specific roster ID is passed, check that. If only playerId, check if they have that player.
    // Our API passes playerId.
    if (!rosterIds.has(item.playerId)) {
      throw new Error(`Team ${team.name} does not own player #${item.playerId}`);
    }
  }
}

async function validateRosterLimits(tradeId: number) {
  const trade = await prisma.tradeProposal.findUnique({
    where: { id: tradeId },
    include: { items: true },
  });
  if (!trade) throw new Error("Trade not found");

  // Calculate net player change
  // Team A gives X players, gets Y players. Net = Y - X.
  // If Net > 0, we must verify (Current + Net) <= Max.
  const ROSTER_MAX = 40; // Hardcoded rule for now

  // Proposer
  const msgA = await checkTeamLimit(trade.proposingTeamId, trade.items, ROSTER_MAX);
  if (msgA) throw new Error(msgA);

  // Accepter
  const msgB = await checkTeamLimit(trade.acceptingTeamId, trade.items, ROSTER_MAX);
  if (msgB) throw new Error(msgB);
}

async function checkTeamLimit(teamId: number, items: any[], max: number): Promise<string | null> {
  const giving = items.filter((i: any) => i.senderTeamId === teamId && i.assetType === "PLAYER").length;
  const receiving = items.filter((i: any) => i.senderTeamId !== teamId && i.assetType === "PLAYER").length; // received from other
  const net = receiving - giving;

  if (net <= 0) return null; // clearing space is always allowed

  const count = await prisma.roster.count({
    where: { teamId, releasedAt: null },
  });

  if (count + net > max) {
    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { name: true } });
    return `Team ${team?.name} would exceed roster limit (${count} + ${net} > ${max})`;
  }
  return null;
}


// POST propose trade
tradesRouter.post("/trades/propose", async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { proposingTeamId, acceptingTeamId, items } = req.body;
    // items: { senderTeamId, assetType, playerId?, amount? }[]

    if (!proposingTeamId || !acceptingTeamId || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid trade payload" });
    }

    // Verify ownership
    const team = await prisma.team.findFirst({
      where: { id: proposingTeamId, ownerUserId: user.id },
    });
    if (!team && !user.isAdmin) {
      return res.status(403).json({ error: "You do not own the proposing team" });
    }

    // Validate Assets (Ownership & Budget at time of proposal)
    try {
      await validateTradeAssets(items, proposingTeamId, acceptingTeamId);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }

    const trade = await prisma.tradeProposal.create({
      data: {
        proposingTeamId,
        acceptingTeamId,
        status: "PENDING",
        items: {
          create: items.map((i: any) => ({
            senderTeamId: i.senderTeamId,
            assetType: i.assetType,
            playerId: i.playerId,
            amount: i.amount ?? 1,
          })),
        },
      },
      include: { items: true },
    });

    return res.json({ trade });
  } catch (e: any) {
    console.error("Error proposing trade:", e);
    return res.status(500).json({ error: String(e?.message ?? e) });
  }
});

// POST respond (ACCEPT / REJECT)
tradesRouter.post("/trades/:id/response", async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const tradeId = Number(req.params.id);
    const { action } = req.body; // "ACCEPT" | "REJECT"

    const trade = await prisma.tradeProposal.findUnique({
      where: { id: tradeId },
      include: { items: true } // Need items for validation
    });
    if (!trade) return res.status(404).json({ error: "Trade not found" });

    // Verify ownership of ACCEPTING team
    const team = await prisma.team.findFirst({
      where: { id: trade.acceptingTeamId, ownerUserId: user.id },
    });
    if (!team && !user.isAdmin) {
      return res.status(403).json({ error: "You do not own the accepting team" });
    }

    if (trade.status !== "PENDING") {
      return res.status(400).json({ error: "Trade is not pending" });
    }

    if (action === "ACCEPT") {
       // Validate EVERYTHING again before accepting
       try {
         await validateTradeAssets(trade.items, trade.proposingTeamId, trade.acceptingTeamId);
         await validateRosterLimits(tradeId);
       } catch (err: any) {
         return res.status(400).json({ error: "Cannot accept: " + err.message });
       }
    }

    const newStatus = action === "ACCEPT" ? "ACCEPTED" : "REJECTED"; 

    const updated = await prisma.tradeProposal.update({
      where: { id: tradeId },
      data: { status: newStatus },
    });

    return res.json({ trade: updated });
  } catch (e: any) {
    console.error("Error responding to trade:", e);
    return res.status(500).json({ error: String(e?.message ?? e) });
  }
});

// POST cancel (Proposer only)
tradesRouter.post("/trades/:id/cancel", async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const tradeId = Number(req.params.id);

    const trade = await prisma.tradeProposal.findUnique({ where: { id: tradeId } });
    if (!trade) return res.status(404).json({ error: "Trade not found" });

    const team = await prisma.team.findFirst({
      where: { id: trade.proposingTeamId, ownerUserId: user.id },
    });
    if (!team && !user.isAdmin) {
      return res.status(403).json({ error: "You cannot cancel this trade" });
    }

    const updated = await prisma.tradeProposal.update({
      where: { id: tradeId },
      data: { status: "CANCELLED" },
    });

    return res.json({ trade: updated });
  } catch (e: any) {
      return res.status(500).json({ error: String(e) });
  }
});

// POST vote on trade (League voting)
tradesRouter.post("/trades/:id/vote", async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    
    const tradeId = Number(req.params.id);
    const { vote, reason } = req.body; // "APPROVE" | "VETO"

    const trade = await prisma.tradeProposal.findUnique({
      where: { id: tradeId },
      include: { proposingTeam: { select: { leagueId: true } } },
    });
    if (!trade) return res.status(404).json({ error: "Trade not found" });
    if (trade.status !== "ACCEPTED") {
      return res.status(400).json({ error: "Can only vote on accepted trades" });
    }

    // Find user's team in this league
    const myTeam = await prisma.team.findFirst({
      where: { ownerUserId: user.id, leagueId: trade.proposingTeam.leagueId },
    });
    if (!myTeam) return res.status(403).json({ error: "No team in this league" });

    // Cannot vote on your own trades
    if (myTeam.id === trade.proposingTeamId || myTeam.id === trade.acceptingTeamId) {
      return res.status(400).json({ error: "Cannot vote on your own trade" });
    }

    // Upsert vote
    const voteRecord = await prisma.tradeVote.upsert({
      where: { tradeId_teamId: { tradeId, teamId: myTeam.id } },
      create: { tradeId, teamId: myTeam.id, vote, reason },
      update: { vote, reason },
    });

    return res.json({ vote: voteRecord });
  } catch (e: any) {
    console.error("Error voting:", e);
    return res.status(500).json({ error: String(e) });
  }
});

// POST process trade (Commissioner only)
tradesRouter.post("/trades/:id/process", async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (!user.isAdmin) return res.status(403).json({ error: "Admin only" });

    const tradeId = Number(req.params.id);
    const { action } = req.body; // "PROCESS" | "VETO"

    const trade = await prisma.tradeProposal.findUnique({
      where: { id: tradeId },
      include: { items: true },
    });
    if (!trade) return res.status(404).json({ error: "Trade not found" });
    if (trade.status !== "ACCEPTED") {
      return res.status(400).json({ error: "Trade must be accepted first" });
    }

    if (action === "VETO") {
      await prisma.tradeProposal.update({
        where: { id: tradeId },
        data: { status: "VETOED" },
      });
      return res.json({ message: "Trade vetoed" });
    }

    if (action === "PROCESS") {
      // Execute the trade
      await executeTrade(tradeId);
      return res.json({ message: "Trade processed" });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (e: any) {
    console.error("Error processing trade:", e);
    return res.status(500).json({ error: String(e) });
  }
});

// Helper: Execute Trade (Move players/budget)
async function executeTrade(tradeId: number) {
  const trade = await prisma.tradeProposal.findUnique({
    where: { id: tradeId },
    include: { items: true },
  });
  if (!trade) throw new Error("Trade not found");

  // 1. Move players
  for (const item of trade.items) {
    if (item.assetType === "PLAYER" && item.playerId) {
      // Find current roster entry
      const roster = await prisma.roster.findFirst({
        where: { teamId: item.senderTeamId, playerId: item.playerId, releasedAt: null },
      });
      if (!roster) continue; // Already moved or dropped

      // Move to recipient
      const recipientTeamId = item.senderTeamId === trade.proposingTeamId ? trade.acceptingTeamId : trade.proposingTeamId;

       // Remove from sender
      await prisma.roster.update({
        where: { id: roster.id },
        data: { releasedAt: new Date() },
      });

      // Add to recipient
      await prisma.roster.create({
        data: {
          teamId: recipientTeamId,
          playerId: item.playerId,
          price: roster.price,
          source: "trade",
          acquiredAt: new Date(),
        },
      });
    }
  }

  // 2. Move budget
  for (const item of trade.items) {
    if (item.assetType === "BUDGET") {
      const recipientTeamId = item.senderTeamId === trade.proposingTeamId ? trade.acceptingTeamId : trade.proposingTeamId;

      await prisma.team.update({
        where: { id: item.senderTeamId },
        data: { budget: { decrement: item.amount } },
      });

      await prisma.team.update({
        where: { id: recipientTeamId },
        data: { budget: { increment: item.amount } },
      });
    }
  }

  // 3. Mark trade as processed
  await prisma.tradeProposal.update({
    where: { id: tradeId },
    data: { status: "PROCESSED" },
  });
}

export default tradesRouter;
