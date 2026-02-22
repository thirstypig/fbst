// server/src/routes/keeperPrep.ts
// Keeper Selection Agent — Pre-Auction Preparation Routes

import { Router } from "express";
import { KeeperPrepService } from "./services/keeperPrepService.js";
import { prisma } from "../../db/prisma.js";

const router = Router();
const keeperPrepService = new KeeperPrepService();

// ─── Auth Middleware (reused from commissioner.ts pattern) ──────────────────

function requireAuth(req: any, res: any, next: any) {
  if (!req.user?.id) return res.status(401).json({ error: "Not authenticated" });
  next();
}

async function requireCommissionerOrAdmin(req: any, res: any, next: any) {
  try {
    const leagueId = Number(req.params.leagueId);
    if (!Number.isFinite(leagueId)) return res.status(400).json({ error: "Invalid leagueId" });

    if (req.user?.isAdmin) return next();

    const m = await prisma.leagueMembership.findUnique({
      where: { leagueId_userId: { leagueId, userId: req.user.id } },
      select: { role: true },
    });

    if (!m || m.role !== "COMMISSIONER") {
      return res.status(403).json({ error: "Commissioner only" });
    }

    return next();
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Auth check failed" });
  }
}

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /api/commissioner/:leagueId/keeper-prep/populate
 * Populate rosters from the prior season's last period.
 */
router.post(
  "/commissioner/:leagueId/keeper-prep/populate",
  requireAuth,
  requireCommissionerOrAdmin,
  async (req, res) => {
    try {
      const leagueId = Number(req.params.leagueId);
      const result = await keeperPrepService.populateRostersFromPriorSeason(leagueId);
      return res.json({ success: true, ...result });
    } catch (err: any) {
      console.error("keeper-prep/populate error:", err);
      return res.status(400).json({ error: err?.message || "Populate failed" });
    }
  }
);

/**
 * GET /api/commissioner/:leagueId/keeper-prep/status
 * Get per-team keeper readiness summary.
 */
router.get(
  "/commissioner/:leagueId/keeper-prep/status",
  requireAuth,
  requireCommissionerOrAdmin,
  async (req, res) => {
    try {
      const leagueId = Number(req.params.leagueId);
      const statuses = await keeperPrepService.getKeeperStatus(leagueId);
      const isLocked = await keeperPrepService.isKeepersLocked(leagueId);
      return res.json({ statuses, isLocked });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Status fetch failed" });
    }
  }
);

/**
 * GET /api/commissioner/:leagueId/keeper-prep/team/:teamId/roster
 * Get full roster for a team so commissioner can pick keepers.
 */
router.get(
  "/commissioner/:leagueId/keeper-prep/team/:teamId/roster",
  requireAuth,
  requireCommissionerOrAdmin,
  async (req, res) => {
    try {
      const leagueId = Number(req.params.leagueId);
      const teamId = Number(req.params.teamId);

      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team || team.leagueId !== leagueId) return res.status(404).json({ error: "Team not found" });

      const roster = await prisma.roster.findMany({
        where: { teamId, releasedAt: null },
        orderBy: [{ isKeeper: "desc" }, { price: "desc" }],
        include: {
          player: { select: { id: true, name: true, posPrimary: true, mlbTeam: true, mlbId: true } },
        },
      });

      const keeperLimit = await keeperPrepService.getKeeperLimit(leagueId);
      const isLocked = await keeperPrepService.isKeepersLocked(leagueId);

      return res.json({ team, roster, keeperLimit, isLocked });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Roster fetch failed" });
    }
  }
);

/**
 * POST /api/commissioner/:leagueId/keeper-prep/save
 * Save keeper selections for a specific team.
 * Body: { teamId: number, keeperIds: number[], force?: boolean }
 */
router.post(
  "/commissioner/:leagueId/keeper-prep/save",
  requireAuth,
  requireCommissionerOrAdmin,
  async (req, res) => {
    try {
      const leagueId = Number(req.params.leagueId);
      const { teamId, keeperIds, force } = req.body;

      if (!Number.isFinite(Number(teamId))) return res.status(400).json({ error: "Invalid teamId" });
      if (!Array.isArray(keeperIds)) return res.status(400).json({ error: "keeperIds must be an array" });

      const result = await keeperPrepService.saveKeepersForTeam(
        leagueId,
        Number(teamId),
        keeperIds.map(Number)
      );

      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(400).json({ error: err?.message || "Save keepers failed" });
    }
  }
);

/**
 * POST /api/commissioner/:leagueId/keeper-prep/lock
 * Lock keeper selections.
 */
router.post(
  "/commissioner/:leagueId/keeper-prep/lock",
  requireAuth,
  requireCommissionerOrAdmin,
  async (req, res) => {
    try {
      const leagueId = Number(req.params.leagueId);
      await keeperPrepService.lockKeepers(leagueId);
      return res.json({ success: true, locked: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Lock failed" });
    }
  }
);

/**
 * POST /api/commissioner/:leagueId/keeper-prep/unlock
 * Unlock keeper selections.
 */
router.post(
  "/commissioner/:leagueId/keeper-prep/unlock",
  requireAuth,
  requireCommissionerOrAdmin,
  async (req, res) => {
    try {
      const leagueId = Number(req.params.leagueId);
      await keeperPrepService.unlockKeepers(leagueId);
      return res.json({ success: true, locked: false });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Unlock failed" });
    }
  }
);

export const keeperPrepRouter = router;
export default keeperPrepRouter;
