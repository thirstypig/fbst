import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { CommissionerService } from "../services/CommissionerService.js";

const prisma = new PrismaClient();
const router = Router();
const commissionerService = new CommissionerService();

// Use a simpler type-safe approach for auth
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuthedRequest = Request & { user?: any };

// Check if user can edit rules (admin or commissioner)
const canEditRules = async (req: AuthedRequest, leagueId: number): Promise<boolean> => {
  if (req.user?.isAdmin) return true;
  
  const membership = await prisma.leagueMembership.findFirst({
    where: { userId: req.user?.id, leagueId },
  });
  
  return membership?.role === "COMMISSIONER";
};

/**
 * GET /api/leagues/:id/rules
 * Get all rules for a league (creates defaults if none exist)
 */
router.get("/:id/rules", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leagueId = parseInt(req.params.id);
    
    const rules = await commissionerService.getRules(leagueId);

    // Group by category for easier UI rendering
    const grouped = rules.reduce((acc: Record<string, typeof rules>, rule) => {
      if (!acc[rule.category]) acc[rule.category] = [];
      acc[rule.category].push(rule);
      return acc;
    }, {});

    res.json({ rules, grouped, leagueId });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/leagues/:id/rules
 * Bulk update rules (admin/commissioner only)
 */
router.put("/:id/rules", async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const leagueId = parseInt(req.params.id);
    const { updates } = req.body; // Array of { id, value } objects

    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!(await canEditRules(req, leagueId))) {
      return res.status(403).json({ error: "Commissioner or admin access required" });
    }

    const count = await commissionerService.updateRules(leagueId, updates);

    res.json({ success: true, updated: count });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/leagues/:id/rules/lock
 * Lock all rules for the season (prevents further editing)
 */
router.post("/:id/rules/lock", async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const leagueId = parseInt(req.params.id);

    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!(await canEditRules(req, leagueId))) {
      return res.status(403).json({ error: "Commissioner or admin access required" });
    }

    await commissionerService.lockRules(leagueId);

    res.json({ success: true, message: "Rules locked for the season" });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/leagues/:id/rules/unlock
 * Unlock rules (admin only - emergency)
 */
router.post("/:id/rules/unlock", async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const leagueId = parseInt(req.params.id);

    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: "Admin access required to unlock rules" });
    }

    await commissionerService.unlockRules(leagueId);

    res.json({ success: true, message: "Rules unlocked" });
  } catch (err) {
    next(err);
  }
});

export default router;

