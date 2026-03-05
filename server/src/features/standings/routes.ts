import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { logger } from "../../lib/logger.js";

const router = Router();

import {
  CATEGORY_CONFIG,
  CategoryKey,
  computeCategoryRows,
  computeStandingsFromStats,
} from "./services/standingsService.js";

// --- Period standings: /api/standings/period/current ---

router.get("/period/current", requireAuth, asyncHandler(async (req, res) => {
  const period =
    (await prisma.period.findFirst({
      where: { status: "active" },
      orderBy: { startDate: "asc" },
    })) ||
    (await prisma.period.findFirst({
      where: { id: 1 },
    }));

  if (!period) {
    return res
      .status(404)
      .json({ error: "No active period found and no default period with id=1" });
  }

  const stats = await prisma.teamStatsPeriod.findMany({
    where: { periodId: period.id },
    include: {
      team: true,
    },
  });

  const standings = computeStandingsFromStats(stats);

  res.json({
    periodId: period.id,
    data: standings,
  });
}));

// --- Period category standings: /api/period-category-standings ---

router.get("/period-category-standings", requireAuth, asyncHandler(async (req, res) => {
    const periodIdRaw = req.query.periodId ? String(req.query.periodId) : "1";
    
    // Parse keys like "1", "P1", "Period 1"
    const m = periodIdRaw.match(/(\d+)/);
    const pid = m ? parseInt(m[1], 10) : 1;

    const period = await prisma.period.findUnique({
      where: { id: pid },
    });

    if (!period) {
       // fallback to period 1 if not found, or error? 
       // Client expects success mostly, but 404 is fine.
       // Let's return 404 to be specific.
       return res.status(404).json({ error: `Period ${pid} not found` });
    }

    const stats = await prisma.teamStatsPeriod.findMany({
      where: { periodId: period.id },
      include: { team: true },
    });

    const categories = CATEGORY_CONFIG.map((cfg) => {
      const rows = computeCategoryRows(
        stats,
        cfg.key as CategoryKey,
        cfg.lowerIsBetter
      );
      return {
        id: cfg.key,
        key: cfg.key,
        label: cfg.label,
        group: cfg.group,
        higherIsBetter: !cfg.lowerIsBetter,
        rows,
      };
    });
    res.json({
      periodId: period.id,
      categories,
      // Add teamCount which Period.tsx uses
      teamCount: stats.length,
    });
}));

// --- Season (cumulative) standings: /api/standings/season ---

router.get("/season", requireAuth, asyncHandler(async (req, res) => {
  const stats = await prisma.teamStatsSeason.findMany({
    include: { team: true },
  });

  if (stats.length === 0) {
    return res.json({ data: [] });
  }

  const standings = computeStandingsFromStats(stats);

  // enrich each with raw season stats for display
  const byId = new Map<number, any>();
  for (const s of stats) {
    byId.set(s.teamId, s);
  }

  const data = standings.map((row) => {
    const s = byId.get(row.teamId);
    return {
      ...row,
      R: s.R,
      HR: s.HR,
      RBI: s.RBI,
      SB: s.SB,
      AVG: s.AVG,
      W: s.W,
      SV: s.S,
      ERA: s.ERA,
      WHIP: s.WHIP,
      K: s.K,
    };
  });

  res.json({ data });
}));

export const standingsRouter = router;
export default standingsRouter;
