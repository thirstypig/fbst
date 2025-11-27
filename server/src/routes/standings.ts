import { Router } from "express";
import prisma from "../prisma";

const router = Router();

// Which categories, and whether lower is better
const CATEGORY_CONFIG = [
  { key: "R", label: "Runs", lowerIsBetter: false },
  { key: "HR", label: "Home Runs", lowerIsBetter: false },
  { key: "RBI", label: "RBI", lowerIsBetter: false },
  { key: "SB", label: "Stolen Bases", lowerIsBetter: false },
  { key: "AVG", label: "Average", lowerIsBetter: false },
  { key: "W", label: "Wins", lowerIsBetter: false },
  { key: "S", label: "Saves", lowerIsBetter: false },
  { key: "ERA", label: "ERA", lowerIsBetter: true },
  { key: "WHIP", label: "WHIP", lowerIsBetter: true },
  { key: "K", label: "Strikeouts", lowerIsBetter: false },
] as const;

type CategoryKey = (typeof CATEGORY_CONFIG)[number]["key"];

function computeCategoryRows(
  stats: any[],
  key: CategoryKey,
  lowerIsBetter: boolean
) {
  const rows = stats.map((s) => ({
    teamId: s.team.id,
    teamName: s.team.name,
    value: s[key],
  }));

  rows.sort((a, b) => {
    if (lowerIsBetter) {
      return a.value - b.value;
    } else {
      return b.value - a.value;
    }
  });

  const n = rows.length;
  return rows.map((row, idx) => ({
    ...row,
    rank: idx + 1,
    points: n - idx,
  }));
}

function computeStandingsFromStats(stats: any[]) {
  if (stats.length === 0) {
    return [];
  }

  const teamMap = new Map<
    number,
    {
      teamId: number;
      teamName: string;
      points: number;
    }
  >();

  for (const row of stats) {
    teamMap.set(row.team.id, {
      teamId: row.team.id,
      teamName: row.team.name,
      points: 0,
    });
  }

  // For each category, rank and add points
  for (const cfg of CATEGORY_CONFIG) {
    const rows = computeCategoryRows(stats, cfg.key as CategoryKey, cfg.lowerIsBetter);
    for (const r of rows) {
      const team = teamMap.get(r.teamId);
      if (!team) continue;
      team.points += r.points;
    }
  }

  const standings = Array.from(teamMap.values());
  standings.sort((a, b) => b.points - a.points);

  return standings.map((s, idx) => ({
    teamId: s.teamId,
    teamName: s.teamName,
    points: s.points,
    rank: idx + 1,
    delta: 0, // later we can compute movement vs previous snapshot
  }));
}

// --- Period standings: /api/standings/period/current ---

router.get("/period/current", async (req, res) => {
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
  } catch (e) {
    console.error("Error fetching period standings:", e);
    res.status(500).json({ error: "Failed to fetch period standings" });
  }
});

// --- Period category standings: /api/standings/period/current/categories ---

router.get("/period/current/categories", async (req, res) => {
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
      return res
        .status(404)
        .json({ error: "No active period found and no default period with id=1" });
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
        key: cfg.key,
        label: cfg.label,
        rows,
      };
    });

    res.json({
      periodId: period.id,
      categories,
    });
  } catch (e) {
    console.error("Error fetching category standings:", e);
    res.status(500).json({ error: "Failed to fetch category standings" });
  }
});

// --- Season (cumulative) standings: /api/standings/season ---

router.get("/season", async (req, res) => {
  try {
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
        S: s.S,
        ERA: s.ERA,
        WHIP: s.WHIP,
        K: s.K,
      };
    });

    res.json({ data });
  } catch (e) {
    console.error("Error fetching season standings:", e);
    res.status(500).json({ error: "Failed to fetch season standings" });
  }
});

export default router;
