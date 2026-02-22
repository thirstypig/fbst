import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../../db/prisma.js";
import { CommissionerService } from "../commissioner/services/CommissionerService.js";
import { requireAuth, requireAdmin, requireCommissionerOrAdmin } from "../../middleware/auth.js";
const router = Router();
const commissionerService = new CommissionerService();

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
router.put("/:id/rules", requireAuth, requireCommissionerOrAdmin("id"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leagueId = parseInt(req.params.id);
    const { updates } = req.body; // Array of { id, value } objects

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
router.post("/:id/rules/lock", requireAuth, requireCommissionerOrAdmin("id"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leagueId = parseInt(req.params.id);

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
router.post("/:id/rules/unlock", requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leagueId = parseInt(req.params.id);

    await commissionerService.unlockRules(leagueId);

    res.json({ success: true, message: "Rules unlocked" });
  } catch (err) {
    next(err);
  }
});

export const rulesRouter = router;
export default rulesRouter;

