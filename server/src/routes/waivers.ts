
import { Router } from "express";
import prisma from "../prisma.js";

const router = Router();

// GET /api/waivers - List pending claims for current user (or all if admin?)
// Query param: teamId (optional)
router.get("/", async (req, res) => {
  const teamId = Number(req.query.teamId);
  const where = teamId ? { teamId } : {};
  
  const claims = await prisma.waiverClaim.findMany({
    where: {
      ...where,
      status: "PENDING",
    },
    include: { player: true, dropPlayer: true },
    orderBy: [{ bidAmount: "desc" }, { priority: "asc" }],
  });
  
  res.json(claims);
});

// POST /api/waivers - Submit a claim
router.post("/", async (req, res) => {
  try {
    const { teamId, playerId, dropPlayerId, bidAmount, priority } = req.body;
    
    // Auto-assign priority if not provided?
    // Validate bid <= budget?
    
    const claim = await prisma.waiverClaim.create({
      data: {
        teamId,
        playerId,
        dropPlayerId,
        bidAmount,
        priority: priority || 1,
        status: "PENDING",
      },
      include: { player: true },
    });
    
    res.json(claim);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/waivers/:id - Cancel claim
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await prisma.waiverClaim.delete({ where: { id } });
  res.json({ success: true });
});

// POST /api/waivers/process - Execute FAAB (Admin/Cron)
router.post("/process", async (req, res) => {
  // 1. Fetch all pending claims, sorted by Bid DESC, Priority ASC
  const claims = await prisma.waiverClaim.findMany({
    where: { status: "PENDING" },
    include: { player: true, team: true },
    orderBy: [
      { bidAmount: "desc" }, 
      { priority: "asc" }
    ],
  });

  const logs: string[] = [];
  const processedPlayerIds = new Set<number>(); // Players added
  const teamDropMap = new Map<number, Set<number>>(); // teamId -> Set<droppedPlayerId>

  await prisma.$transaction(async (tx: any) => {
    for (const claim of claims) {
      // Check if player already taken in this batch
      if (processedPlayerIds.has(claim.playerId)) {
        await tx.waiverClaim.update({
          where: { id: claim.id },
          data: { status: "FAILED_OUTBID", processedAt: new Date() },
        });
        continue;
      }

      // Check budget
      const currentTeam = await tx.team.findUnique({ where: { id: claim.teamId } });
      if (currentTeam.budget < claim.bidAmount) {
         await tx.waiverClaim.update({
          where: { id: claim.id },
          data: { status: "FAILED_INVALID", processedAt: new Date() }, // Insufficient funds
        });
        logs.push(`Claim ${claim.id} failed: Insufficient budget.`);
        continue;
      }

      // Check drop player availability (if conditional)
      if (claim.dropPlayerId) {
        const teamDrops = teamDropMap.get(claim.teamId) || new Set();
        if (teamDrops.has(claim.dropPlayerId)) {
          // Already dropping this player in a higher priority claim?
          // If so, this claim might be invalid OR we just skip the drop requirement?
          // Usually, if you drop Player A for Player B, and Player C for Player A... conflict.
          // Simplification: If drop player is already used in a successful claim, fail this claim?
          // OR: allow purely additive if roster space?
          await tx.waiverClaim.update({
            where: { id: claim.id },
            data: { status: "FAILED_INVALID", processedAt: new Date() },
          });
           logs.push(`Claim ${claim.id} failed: Drop player ${claim.dropPlayerId} already processed.`);
           continue;
        }
      }
      
      // Execute Success
      processedPlayerIds.add(claim.playerId);
      
      // Update Budget
      await tx.team.update({
        where: { id: claim.teamId },
        data: { budget: { decrement: claim.bidAmount } },
      });
      
      // Add Player to Roster
      await tx.roster.create({
        data: {
          teamId: claim.teamId,
          playerId: claim.playerId,
          source: "WAIVER",
          price: claim.bidAmount, // Does FAAB price become salary? Usually yes.
          acquiredAt: new Date(),
        },
      });

      // Drop Player if needed
      if (claim.dropPlayerId) {
        const rosterEntry = await tx.roster.findFirst({
          where: { teamId: claim.teamId, playerId: claim.dropPlayerId, releasedAt: null },
        });
        if (rosterEntry) {
          await tx.roster.update({
            where: { id: rosterEntry.id },
            data: { releasedAt: new Date(), source: "WAIVER_DROP" },
          });
          
          if (!teamDropMap.has(claim.teamId)) teamDropMap.set(claim.teamId, new Set());
          teamDropMap.get(claim.teamId)!.add(claim.dropPlayerId);
        }
      }

      // Update Claim
      await tx.waiverClaim.update({
        where: { id: claim.id },
        data: { status: "SUCCESS", processedAt: new Date() },
      });
      
      logs.push(`Claim ${claim.id} SUCCESS: Team ${claim.teamId} gets Player ${claim.playerId} for $${claim.bidAmount}`);
    }
  });

  res.json({ success: true, logs });
});

export default router;
