import { Router, Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { logger } from "../../lib/logger.js";
import {
  CATEGORY_CONFIG,
  CategoryKey,
  computeCategoryRows,
  computeStandingsFromStats,
  TeamStatsRow,
} from "./services/standingsService.js";

const router = Router();

// --- Period standings: /api/standings/period/current ---

router.get("/period/current", async (_req: Request, res: Response) => {
  try {
    const period =
      (await prisma.period.findFirst({
        where: { status: "active" },
        orderBy: { startDate: "asc" },
      })) ||
      (await prisma.period.findFirst({
        where: { id: 1 },
      }));

    if (!period) {
      return res.status(404).json({ error: "No active period found" });
    }

    const stats = await prisma.teamStatsPeriod.findMany({
      where: { periodId: period.id },
      include: { team: true },
    });

    const standings = computeStandingsFromStats(stats as unknown as TeamStatsRow[]);

    res.json({ periodId: period.id, data: standings });
  } catch (e) {
    logger.error({ err: String(e) }, "Failed to fetch period standings");
    res.status(500).json({ error: "Failed to fetch period standings" });
  }
});

// --- Period category standings: /api/period-category-standings ---

router.get("/period-category-standings", async (req: Request, res: Response) => {
  try {
    const periodIdRaw = req.query.periodId ? String(req.query.periodId) : "1";
    const match = periodIdRaw.match(/(\d+)/);
    const pid = match ? parseInt(match[1], 10) : NaN;

    if (!Number.isFinite(pid) || pid <= 0) {
      return res.status(400).json({ error: "Invalid periodId parameter" });
    }

    const period = await prisma.period.findUnique({
      where: { id: pid },
    });

    if (!period) {
      return res.status(404).json({ error: `Period ${pid} not found` });
    }

    const stats = await prisma.teamStatsPeriod.findMany({
      where: { periodId: period.id },
      include: { team: true },
    });

    const typedStats = stats as unknown as TeamStatsRow[];

    const categories = CATEGORY_CONFIG.map((cfg) => {
      const rows = computeCategoryRows(typedStats, cfg.key as CategoryKey, cfg.lowerIsBetter);
      return {
        key: cfg.key,
        label: cfg.label,
        rows: rows.map((r) => ({
          ...r,
          teamCode: r.teamName.substring(0, 3).toUpperCase(),
        })),
      };
    });

    res.json({
      periodId: period.id,
      categories,
      teamCount: stats.length,
    });
  } catch (e) {
    logger.error({ err: String(e) }, "Failed to fetch period category standings");
    res.status(500).json({ error: "Failed to fetch period standings" });
  }
});

// --- Season (cumulative) standings: /api/standings/season ---

router.get("/season", async (_req: Request, res: Response) => {
  try {
    const stats = await prisma.teamStatsSeason.findMany({
      include: { team: true },
    });

    if (stats.length === 0) {
      return res.json({ data: [] });
    }

    const typedStats = stats as unknown as TeamStatsRow[];
    const standings = computeStandingsFromStats(typedStats);

    const byId = new Map<number, (typeof stats)[number]>();
    for (const s of stats) {
      byId.set(s.teamId, s);
    }

    const data = standings.map((row) => {
      const s = byId.get(row.teamId);
      return {
        ...row,
        R: s?.R ?? 0,
        HR: s?.HR ?? 0,
        RBI: s?.RBI ?? 0,
        SB: s?.SB ?? 0,
        AVG: s?.AVG ?? 0,
        W: s?.W ?? 0,
        S: s?.S ?? 0,
        ERA: s?.ERA ?? 0,
        WHIP: s?.WHIP ?? 0,
        K: s?.K ?? 0,
      };
    });

    res.json({ data });
  } catch (e) {
    logger.error({ err: String(e) }, "Failed to fetch season standings");
    res.status(500).json({ error: "Failed to fetch season standings" });
  }
});

export const standingsRouter = router;
export default standingsRouter;
