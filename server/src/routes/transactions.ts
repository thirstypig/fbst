// server/src/routes/transactions.ts
import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { DataService } from "../services/dataService.js";

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

/**
 * POST /api/transactions/claim
 * Claims a player for a team.
 * Body: { leagueId, teamId, playerId, dropPlayerId? }
 */
router.post("/transactions/claim", async (req, res) => {
  try {
    const { leagueId, teamId, dropPlayerId } = req.body;
    let { playerId } = req.body;
    const { mlbId } = req.body;

    if (!leagueId || !teamId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1. Resolve Player Identity (Lazy Create if needed)
    if (!playerId && mlbId) {
        const mlbIdNum = Number(mlbId);
        let player = await prisma.player.findFirst({ where: { mlbId: mlbIdNum }});
        
        if (!player) {
             // Lazy Create from DataService
             const ds = DataService.getInstance();
             const seasonStats = ds.getSeasonStats();
             // Find matching player in CSV data
             const playerRow = seasonStats.find(p => Number(p.mlb_id || p.mlbId) === mlbIdNum);

             if (playerRow) {
                 const name = playerRow.player_name || playerRow.name || "Unknown";
                 const positions = playerRow.positions || playerRow.pos || "UT";
                 // Simple logic for primary position: first one listed
                 const posPrimary = positions.split(',')[0].trim();
                 
                 console.log(`Lazy creating player: ${name} (MLB ID: ${mlbIdNum})`);
                 player = await prisma.player.create({
                     data: {
                         mlbId: mlbIdNum,
                         name: name,
                         posPrimary: posPrimary,
                         posList: positions
                     }
                 });
             } else {
                 return res.status(404).json({ error: `Player with MLB ID ${mlbId} not found in database or stats.` });
             }
        }
        playerId = player.id;
    }

    if (!playerId) {
        return res.status(400).json({ error: "Missing playerId or mlbId" });
    }

    // 2. Verify availability
    // Check if player is already on a roster in this league
    const existingRoster = await prisma.roster.findFirst({
       where: {
          playerId,
          team: { leagueId }
       },
       include: { team: true }
    });

    if (existingRoster) {
        return res.status(400).json({ error: `Player is already on team: ${existingRoster.team.name}` });
    }

    // 3. Perform Transaction (Atomic)
    await prisma.$transaction(async (tx) => {
         // A. Add Player
         await tx.roster.create({
             data: {
                 teamId,
                 playerId,
                 source: 'waiver_claim',
                 acquiredAt: new Date()
             }
         });

         // Log ADD Transaction
         const player = await tx.player.findUnique({ where: { id: playerId } });
         // Create a synthetic hash or just let DB auto-increment ID handling uniqueness if rowHash wasn't unique. 
         // But rowHash is unique. We need a unique string.
         const rowHash = `CLAIM-${Date.now()}-${playerId}`; 

         await tx.transactionEvent.create({
             data: {
                 rowHash,
                 leagueId,
                 season: 2025, // TODO: Dynamic Season
                 effDate: new Date(),
                 submittedAt: new Date(),
                 teamId,
                 playerId,
                 transactionRaw: `Claimed ${player?.name}`,
                 transactionType: 'ADD'
             }
         });

         // B. Drop Player (if requested)
         if (dropPlayerId) {
             const dropRoster = await tx.roster.findFirst({
                 where: { teamId, playerId: dropPlayerId }
             });

             if (dropRoster) {
                 await tx.roster.delete({ where: { id: dropRoster.id } });
                 
                 const dropPlayer = await tx.player.findUnique({ where: { id: dropPlayerId } });
                 await tx.transactionEvent.create({
                    data: {
                        rowHash: `DROP-${Date.now()}-${dropPlayerId}`,
                        leagueId,
                        season: 2025,
                        effDate: new Date(),
                        submittedAt: new Date(),
                        teamId,
                        playerId: dropPlayerId,
                        transactionRaw: `Dropped ${dropPlayer?.name}`,
                        transactionType: 'DROP'
                    }
                 });
             }
         }
    });

    return res.json({ success: true, playerId }); 

  } catch (err: any) {
    console.error("POST /transactions/claim error:", err);
    return res.status(500).json({ error: err.message || "Claim failed" });
  }
});

export const transactionsRouter = router;
export default transactionsRouter;
