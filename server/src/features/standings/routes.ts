import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { DataService } from "../players/services/dataService.js";

const router = Router();

import {
  CATEGORY_CONFIG,
  CategoryKey,
  computeCategoryRows,
  computeStandingsFromStats,
  aggregatePeriodStatsFromCsv,
  aggregateSeasonStatsFromCsv,
} from "./services/standingsService.js";

// --- Period standings: /api/standings/period/current ---

router.get("/period/current", requireAuth, asyncHandler(async (req, res) => {
  // Find the most recent period with CSV data
  const csvRows = DataService.getInstance().getPeriodStats();

  // Get unique period IDs from CSV data
  const periodIds = [...new Set(
    csvRows.map((r: any) => String(r.period_id ?? "").trim().toUpperCase())
  )].filter(Boolean).sort();

  // Use the last period as "current"
  const currentPeriodKey = periodIds[periodIds.length - 1] || "P1";
  const pidMatch = currentPeriodKey.match(/(\d+)/);
  const pid = pidMatch ? parseInt(pidMatch[1], 10) : 1;

  const stats = aggregatePeriodStatsFromCsv(csvRows, currentPeriodKey);

  if (stats.length === 0) {
    return res.status(404).json({ error: "No period data available" });
  }

  const standings = computeStandingsFromStats(stats);

  res.json({
    periodId: pid,
    data: standings,
  });
}));

// --- Period category standings: /api/period-category-standings ---

router.get("/period-category-standings", requireAuth, asyncHandler(async (req, res) => {
    const periodIdRaw = req.query.periodId ? String(req.query.periodId) : "1";

    // Parse keys like "1", "P1", "Period 1"
    const m = periodIdRaw.match(/(\d+)/);
    const pid = m ? parseInt(m[1], 10) : 1;

    // Compute team-level stats from CSV player data
    const periodKey = `P${pid}`;
    const csvRows = DataService.getInstance().getPeriodStats();
    const stats = aggregatePeriodStatsFromCsv(csvRows, periodKey);

    if (stats.length === 0) {
      return res.status(404).json({ error: `No data for period ${periodKey}` });
    }

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
      periodId: pid,
      categories,
      teamCount: stats.length,
    });
}));

// --- Season (cumulative) standings: /api/standings/season ---

router.get("/season", requireAuth, asyncHandler(async (req, res) => {
  const csvRows = DataService.getInstance().getPeriodStats();

  // Discover all period keys from CSV
  const periodKeys = [...new Set(
    csvRows.map((r: any) => String(r.period_id ?? "").trim().toUpperCase())
  )].filter(Boolean).sort();

  const periodIds = periodKeys.map((k) => {
    const m = k.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }).filter(Boolean);

  if (periodKeys.length === 0) {
    return res.json({ periodIds: [], rows: [] });
  }

  // Compute standings per period
  const periodStandings = new Map<string, Map<string, number>>();
  for (const pk of periodKeys) {
    const stats = aggregatePeriodStatsFromCsv(csvRows, pk);
    const standings = computeStandingsFromStats(stats);
    const pointsMap = new Map<string, number>();
    for (const s of standings) {
      pointsMap.set(s.teamName, s.points);
    }
    periodStandings.set(pk, pointsMap);
  }

  // Compute overall season standings (sum of all period points)
  const seasonStats = aggregateSeasonStatsFromCsv(csvRows);
  const teamNames = seasonStats.map((s: any) => ({
    teamId: s.team.id,
    teamName: s.team.name,
    teamCode: s.team.code,
  }));

  const rows = teamNames.map((t: any) => {
    const periodPoints = periodKeys.map((pk) => {
      return periodStandings.get(pk)?.get(t.teamName) ?? 0;
    });
    const totalPoints = periodPoints.reduce((a: number, b: number) => a + b, 0);

    return {
      teamId: t.teamId,
      teamName: t.teamName,
      teamCode: t.teamCode,
      periodPoints,
      totalPoints,
    };
  });

  rows.sort((a: any, b: any) => b.totalPoints - a.totalPoints);

  res.json({ periodIds, rows });
}));

export const standingsRouter = router;
export default standingsRouter;
