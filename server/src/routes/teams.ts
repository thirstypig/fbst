// server/src/routes/teams.ts
import { Router } from "express";
import prisma from "../prisma";

const router = Router();

// Helper to pull a numeric "points" value out of any stats object
function pickPoints(obj: any): number {
  if (!obj) return 0;

  const candidatesExact = [
    "points",
    "totalPoints",
    "total_points",
    "score",
    "fbPoints",
    "value",
  ];

  // 1) Try a few common exact names
  for (const key of candidatesExact) {
    if (obj[key] != null) {
      const n = Number(obj[key]);
      if (!Number.isNaN(n)) return n;
    }
  }

  // 2) Fallback: any field whose name includes "point"
  for (const [key, value] of Object.entries(obj)) {
    if (key.toLowerCase().includes("point")) {
      const n = Number(value);
      if (!Number.isNaN(n)) return n;
    }
  }

  return 0;
}

// GET /api/teams - simple list of teams
router.get("/", async (_req, res) => {
  try {
    const teams = await prisma.team.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        owner: true,
        budget: true,
        leagueId: true,
      },
    });
    res.json(teams);
  } catch (e) {
    console.error("Error fetching teams:", e);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
});

// GET /api/teams/:id/summary
router.get("/:id/summary", async (req, res) => {
  const teamId = Number(req.params.id);
  if (Number.isNaN(teamId)) {
    return res.status(400).json({ error: "Invalid team id" });
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        owner: true,
        budget: true,
      },
    });

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // active period (first active, else id=1 fallback)
    const period =
      (await prisma.period.findFirst({
        where: { status: "active" },
        orderBy: { startDate: "asc" },
      })) ||
      (await prisma.period.findFirst({ where: { id: 1 } }));

    let periodStats = null;
    if (period) {
      periodStats = await prisma.teamStatsPeriod.findUnique({
        where: {
          teamId_periodId: {
            teamId: team.id,
            periodId: period.id,
          },
        },
      });
    }

    const seasonStats = await prisma.teamStatsSeason.findUnique({
      where: { teamId: team.id },
    });

    // ---------- period-by-period summary ----------
    const periodRows = await prisma.teamStatsPeriod.findMany({
      where: { teamId: team.id },
      include: { period: true },
      orderBy: { periodId: "asc" },
    });

    let runningTotal = 0;
    const periodSummaries = periodRows.map((row) => {
      // row contains id, teamId, periodId, and *some* points-like field
      const periodPoints = pickPoints(row);
      runningTotal += periodPoints;

      const p = row.period as any;

      const label =
        p?.label ||
        p?.name ||
        p?.code ||
        p?.displayName ||
        (p?.startDate
          ? new Date(p.startDate).toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
            })
          : `P${row.periodId}`);

      return {
        periodId: row.periodId,
        label,
        periodPoints,
        seasonPoints: runningTotal,
      };
    });

    const seasonTotal = pickPoints(seasonStats) ||
      (periodSummaries.length
        ? periodSummaries[periodSummaries.length - 1].seasonPoints
        : 0);

    // ---------- Roster ----------
    const rosterRows = await prisma.roster.findMany({
      where: { teamId: team.id, releasedAt: null },
      include: { player: true },
      orderBy: { acquiredAt: "asc" },
    });

    const buildGamesByPos = (posPrimary: string, posList: string | null) => {
      const positionsRaw = (posList || posPrimary || "")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

      const positions =
        positionsRaw.length > 0 ? positionsRaw : [posPrimary || "UTIL"];
      const totalGames = 20;
      const gamesByPos: Record<string, number> = {};

      if (positions.length === 1) {
        gamesByPos[positions[0]] = totalGames;
      } else {
        const primary = positions[0];
        const remaining = positions.slice(1);

        gamesByPos[primary] = Math.round(totalGames * 0.6);
        const perOther =
          remaining.length > 0
            ? Math.round((totalGames * 0.4) / remaining.length)
            : 0;

        for (const pos of remaining) {
          gamesByPos[pos] = perOther;
        }
      }

      return gamesByPos;
    };

    const currentRoster = rosterRows.map((r) => ({
      id: r.id,
      playerId: r.playerId,
      name: r.player.name,
      posPrimary: r.player.posPrimary,
      posList: r.player.posList,
      acquiredAt: r.acquiredAt,
      price: r.price,
      gamesByPos: buildGamesByPos(r.player.posPrimary, r.player.posList),
    }));

    const droppedRows = await prisma.roster.findMany({
      where: {
        teamId: team.id,
        NOT: { releasedAt: null },
      },
      include: { player: true },
      orderBy: { releasedAt: "desc" },
    });

    const droppedPlayers = droppedRows.map((r) => ({
      id: r.id,
      playerId: r.playerId,
      name: r.player.name,
      posPrimary: r.player.posPrimary,
      posList: r.player.posList,
      acquiredAt: r.acquiredAt,
      releasedAt: r.releasedAt!,
      price: r.price,
      gamesByPos: buildGamesByPos(r.player.posPrimary, r.player.posList),
    }));

    res.json({
      team,
      period,
      periodStats,
      seasonStats,
      currentRoster,
      droppedPlayers,
      periodSummaries,
      seasonTotal,
    });
  } catch (e) {
    console.error("Error fetching team summary:", e);
    res.status(500).json({ error: "Failed to fetch team summary" });
  }
});

export default router;
