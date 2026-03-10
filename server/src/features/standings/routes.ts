import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../db/prisma.js";

const router = Router();

// --- Period standings: /api/standings/period/current ---
// No stats yet for 2026 season — return empty standings with team info

router.get("/period/current", requireAuth, asyncHandler(async (req, res) => {
  const leagueId = req.query.leagueId ? Number(req.query.leagueId) : null;
  if (!leagueId) return res.status(400).json({ error: "Missing leagueId" });

  const period = await prisma.period.findFirst({
    where: { status: "active", leagueId },
    orderBy: { endDate: "desc" },
  });

  if (!period) {
    return res.status(404).json({ error: "No active period found" });
  }

  // Return teams with zero points
  const teams = await prisma.team.findMany({
    where: { leagueId },
    select: { id: true, name: true, code: true },
    orderBy: { id: "asc" },
  });

  const standings = teams.map((t) => ({
    teamId: t.id,
    teamName: t.name,
    teamCode: t.code ?? t.name.substring(0, 3).toUpperCase(),
    points: 0,
  }));

  res.json({ periodId: period.id, data: standings });
}));

// --- Period category standings: /api/period-category-standings ---

router.get("/period-category-standings", requireAuth, asyncHandler(async (req, res) => {
  const leagueId = req.query.leagueId ? Number(req.query.leagueId) : null;
  if (!leagueId) return res.status(400).json({ error: "Missing leagueId" });

  const periodId = req.query.periodId ? Number(req.query.periodId) : null;

  let pid = periodId;
  if (!pid) {
    const period = await prisma.period.findFirst({
      where: { status: "active", leagueId },
      orderBy: { endDate: "desc" },
    });
    pid = period?.id ?? null;
  }

  if (!pid) {
    return res.status(404).json({ error: "No active period found" });
  }

  // Return empty categories — no stats data yet
  res.json({ periodId: pid, categories: [], teamCount: 0 });
}));

// --- Season (cumulative) standings: /api/standings/season ---

router.get("/season", requireAuth, asyncHandler(async (req, res) => {
  const leagueId = req.query.leagueId ? Number(req.query.leagueId) : null;
  if (!leagueId) return res.status(400).json({ error: "Missing leagueId" });

  // Get all periods for this league's season
  const periods = await prisma.period.findMany({
    where: { leagueId, status: { in: ["active", "completed"] } },
    orderBy: { startDate: "asc" },
  });

  const periodIds = periods.map((p) => p.id);

  // Get team info from DB
  const teams = await prisma.team.findMany({
    where: { leagueId },
    select: { id: true, name: true, code: true },
    orderBy: { id: "asc" },
  });

  // Return teams with zero points across all periods
  const rows = teams.map((t) => ({
    teamId: t.id,
    teamName: t.name,
    teamCode: t.code ?? t.name.substring(0, 3).toUpperCase(),
    periodPoints: periodIds.map(() => 0),
    totalPoints: 0,
  }));

  res.json({ periodIds, rows });
}));

export const standingsRouter = router;
export default standingsRouter;
