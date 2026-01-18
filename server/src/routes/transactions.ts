// server/src/routes/transactions.ts
import { Router } from "express";
import { prisma } from "../db/prisma";

const router = Router();

/**
 * GET /api/transactions
 * Querystring:
 * - leagueId (optional)
 * - teamId (optional)
 * - skip (optional, default 0)
 * - take (optional, default 50)
 */
router.get("/transactions", async (req, res) => {
  try {
    const leagueId = req.query.leagueId ? Number(req.query.leagueId) : undefined;
    const teamId = req.query.teamId ? Number(req.query.teamId) : undefined;
    const skip = req.query.skip ? Number(req.query.skip) : 0;
    const take = req.query.take ? Number(req.query.take) : 50;

    const where: any = {};
    if (leagueId) where.leagueId = leagueId;
    if (teamId) where.teamId = teamId;

    try {
      const [total, transactions] = await Promise.all([
        prisma.transactionEvent.count({ where }),
        prisma.transactionEvent.findMany({
          where,
          orderBy: { submittedAt: "desc" },
          skip,
          take,
          include: {
            team: { select: { name: true } },
            player: { select: { name: true } },
          },
        }),
      ]);

      return res.json({
        transactions,
        total,
        skip,
        take,
      });
    } catch (dbErr: any) {
      console.error("DB Query failed:", dbErr.message);
      return res.status(500).json({ error: "Database error fetching transactions" });
    }
  } catch (err: any) {
    console.error("GET /transactions error:", err);
    return res.status(500).json({ error: err?.message || "Transactions error" });
  }
});

export const transactionsRouter = router;
export default transactionsRouter;
