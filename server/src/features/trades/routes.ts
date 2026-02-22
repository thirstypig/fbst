import { Router, Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { logger } from "../../lib/logger.js";

const router = Router();

// --- Types ---

type TradeItemInput = {
  senderId: number;
  recipientId: number;
  assetType: "PLAYER" | "BUDGET" | "PICK";
  playerId?: number;
  amount?: number;
  pickRound?: number;
};

type ProposeTradeBody = {
  leagueId: number;
  proposerTeamId: number;
  items: TradeItemInput[];
};

// --- Validation helpers ---

function validateTradeId(params: Request["params"]): number | null {
  const id = Number(params.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function validateProposeBody(body: unknown): { valid: true; data: ProposeTradeBody } | { valid: false; error: string } {
  const b = body as Record<string, unknown>;
  if (!b || typeof b !== "object") {
    return { valid: false, error: "Request body required" };
  }

  const leagueId = Number(b.leagueId);
  if (!Number.isFinite(leagueId) || leagueId <= 0) {
    return { valid: false, error: "Valid leagueId required" };
  }

  const proposerTeamId = Number(b.proposerTeamId);
  if (!Number.isFinite(proposerTeamId) || proposerTeamId <= 0) {
    return { valid: false, error: "Valid proposerTeamId required" };
  }

  if (!Array.isArray(b.items) || b.items.length === 0) {
    return { valid: false, error: "At least one trade item required" };
  }

  const validAssetTypes = ["PLAYER", "BUDGET", "PICK"];
  for (const item of b.items) {
    if (!item || typeof item !== "object") {
      return { valid: false, error: "Each trade item must be an object" };
    }
    if (!Number.isFinite(Number(item.senderId)) || Number(item.senderId) <= 0) {
      return { valid: false, error: "Each item requires a valid senderId" };
    }
    if (!Number.isFinite(Number(item.recipientId)) || Number(item.recipientId) <= 0) {
      return { valid: false, error: "Each item requires a valid recipientId" };
    }
    if (!validAssetTypes.includes(item.assetType)) {
      return { valid: false, error: `Invalid assetType: ${item.assetType}` };
    }
  }

  return {
    valid: true,
    data: {
      leagueId,
      proposerTeamId,
      items: (b.items as TradeItemInput[]).map((item) => ({
        senderId: Number(item.senderId),
        recipientId: Number(item.recipientId),
        assetType: item.assetType,
        playerId: item.playerId ? Number(item.playerId) : undefined,
        amount: item.amount ? Number(item.amount) : undefined,
        pickRound: item.pickRound ? Number(item.pickRound) : undefined,
      })),
    },
  };
}

// --- Routes ---

// POST /api/trades - Propose a new trade
router.post("/", async (req: Request, res: Response) => {
  try {
    const validation = validateProposeBody(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const { leagueId, proposerTeamId, items } = validation.data;

    const trade = await prisma.trade.create({
      data: {
        leagueId,
        proposerId: proposerTeamId,
        status: "PROPOSED",
        items: {
          create: items.map((item) => ({
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
  } catch (e) {
    logger.error({ err: String(e) }, "Failed to create trade");
    res.status(500).json({ error: "Failed to create trade" });
  }
});

// GET /api/trades - List trades for a league
router.get("/", async (req: Request, res: Response) => {
  try {
    const leagueId = Number(req.query.leagueId);
    if (!Number.isFinite(leagueId) || leagueId <= 0) {
      return res.status(400).json({ error: "Valid leagueId query parameter required" });
    }

    const trades = await prisma.trade.findMany({
      where: { leagueId },
      include: {
        items: { include: { player: true, sender: true, recipient: true } },
        proposer: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(trades);
  } catch (e) {
    logger.error({ err: String(e) }, "Failed to list trades");
    res.status(500).json({ error: "Failed to list trades" });
  }
});

// POST /api/trades/:id/accept - Accept a trade
router.post("/:id/accept", async (req: Request, res: Response) => {
  try {
    const id = validateTradeId(req.params);
    if (!id) return res.status(400).json({ error: "Invalid trade ID" });

    const existing = await prisma.trade.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Trade not found" });
    if (existing.status !== "PROPOSED") {
      return res.status(400).json({ error: `Cannot accept trade with status ${existing.status}` });
    }

    const trade = await prisma.trade.update({
      where: { id },
      data: { status: "ACCEPTED" },
    });

    res.json(trade);
  } catch (e) {
    logger.error({ err: String(e) }, "Failed to accept trade");
    res.status(500).json({ error: "Failed to accept trade" });
  }
});

// POST /api/trades/:id/reject - Reject a trade
router.post("/:id/reject", async (req: Request, res: Response) => {
  try {
    const id = validateTradeId(req.params);
    if (!id) return res.status(400).json({ error: "Invalid trade ID" });

    const existing = await prisma.trade.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Trade not found" });
    if (existing.status !== "PROPOSED") {
      return res.status(400).json({ error: `Cannot reject trade with status ${existing.status}` });
    }

    const trade = await prisma.trade.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    res.json(trade);
  } catch (e) {
    logger.error({ err: String(e) }, "Failed to reject trade");
    res.status(500).json({ error: "Failed to reject trade" });
  }
});

// POST /api/trades/:id/process - Execute trade (Commissioner/Admin)
router.post("/:id/process", async (req: Request, res: Response) => {
  try {
    const id = validateTradeId(req.params);
    if (!id) return res.status(400).json({ error: "Invalid trade ID" });

    const trade = await prisma.trade.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!trade) return res.status(404).json({ error: "Trade not found" });
    if (trade.status !== "ACCEPTED") {
      return res.status(400).json({ error: `Cannot process trade with status ${trade.status}` });
    }

    await prisma.$transaction(async (tx) => {
      for (const item of trade.items) {
        if (item.assetType === "PLAYER" && item.playerId) {
          const rosterEntry = await tx.roster.findFirst({
            where: { teamId: item.senderId, playerId: item.playerId, releasedAt: null },
          });

          if (rosterEntry) {
            await tx.roster.update({
              where: { id: rosterEntry.id },
              data: { releasedAt: new Date(), source: "TRADE_OUT" },
            });

            await tx.roster.create({
              data: {
                teamId: item.recipientId,
                playerId: item.playerId,
                source: "TRADE_IN",
                acquiredAt: new Date(),
                price: rosterEntry.price,
                assignedPosition: null,
              },
            });
          }
        } else if (item.assetType === "BUDGET") {
          await tx.team.update({
            where: { id: item.senderId },
            data: { budget: { decrement: item.amount || 0 } },
          });
          await tx.team.update({
            where: { id: item.recipientId },
            data: { budget: { increment: item.amount || 0 } },
          });
        }
      }

      await tx.trade.update({
        where: { id },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
    });

    res.json({ success: true });
  } catch (e) {
    logger.error({ err: String(e) }, "Failed to process trade");
    res.status(500).json({ error: "Failed to process trade" });
  }
});

export const tradesRouter = router;
export default tradesRouter;
