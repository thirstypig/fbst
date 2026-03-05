
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { requireAuth, requireAdmin, requireTeamOwner, isTeamOwner } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { logger } from "../../lib/logger.js";
import { writeAuditLog } from "../../lib/auditLog.js";

const waiverClaimSchema = z.object({
  teamId: z.number().int().positive(),
  playerId: z.number().int().positive(),
  dropPlayerId: z.number().int().positive().optional(),
  bidAmount: z.number().int().nonnegative(),
  priority: z.number().int().positive().optional(),
});

const router = Router();

// GET /api/waivers - List pending claims for current user (or all if admin?)
// Query param: teamId (optional)
router.get("/", requireAuth, asyncHandler(async (req, res) => {
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
}));

// POST /api/waivers - Submit a claim
router.post("/", requireAuth, validateBody(waiverClaimSchema), requireTeamOwner("teamId"), asyncHandler(async (req, res) => {
  const { teamId, playerId, dropPlayerId, bidAmount, priority } = req.body;

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
}));

// DELETE /api/waivers/:id - Cancel claim
router.delete("/:id", requireAuth, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  const claim = await prisma.waiverClaim.findUnique({ where: { id } });
  if (!claim) return res.status(404).json({ error: "Claim not found" });

  // Verify ownership (admins bypass)
  if (!req.user!.isAdmin) {
    const owns = await isTeamOwner(claim.teamId, req.user!.id);
    if (!owns) return res.status(403).json({ error: "You do not own this team" });
  }

  await prisma.waiverClaim.delete({ where: { id } });
  res.json({ success: true });
}));

// POST /api/waivers/process - Execute FAAB (Admin/Cron)
router.post("/process", requireAdmin, asyncHandler(async (req, res) => {
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
          data: { status: "FAILED_INVALID", processedAt: new Date() },
        });
        logs.push(`Claim ${claim.id} failed: Insufficient budget.`);
        continue;
      }

      // Check drop player availability (if conditional)
      if (claim.dropPlayerId) {
        const teamDrops = teamDropMap.get(claim.teamId) || new Set();
        if (teamDrops.has(claim.dropPlayerId)) {
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
          price: claim.bidAmount,
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
  }, { timeout: 30_000 });

  writeAuditLog({
    userId: req.user!.id,
    action: "WAIVER_PROCESS",
    resourceType: "WaiverClaim",
    metadata: { claimCount: claims.length, successCount: logs.filter(l => l.includes("SUCCESS")).length },
  });

  res.json({ success: true, logs });
}));

export const waiversRouter = router;
export default waiversRouter;
