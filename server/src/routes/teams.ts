import { Router } from "express";
import prisma from "../prisma";

const router = Router();

// GET /api/teams - simple list of teams
router.get("/", async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        owner: true,
        budget: true,
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

    // active period (for now: first "active" period, or id=1 fallback)
    const period =
      (await prisma.period.findFirst({
        where: { status: "active" },
        orderBy: { startDate: "asc" },
      })) ||
      (await prisma.period.findFirst({
        where: { id: 1 },
      }));

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

    // --- current roster with gamesByPos (mocked) ---
    const rosterRows = await prisma.roster.findMany({
      where: {
        teamId: team.id,
        releasedAt: null,
      },
      include: {
        player: true,
      },
      orderBy: {
        acquiredAt: "asc",
      },
    });

    // For now, we mock "games by position" based on the player's posList.
    // Later this will come from real MLB stats.
    const buildGamesByPos = (posPrimary: string, posList: string | null) => {
      const positionsRaw = (posList || posPrimary || "")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

      const positions = positionsRaw.length > 0 ? positionsRaw : [posPrimary];

      const totalGames = 20; // arbitrary for now
      const gamesByPos: Record<string, number> = {};

      if (positions.length === 1) {
        gamesByPos[positions[0]] = totalGames;
      } else {
        // primary gets 60%, others share the remaining 40%
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

    // --- dropped players (none yet, but shaped for future) ---
    const droppedRows = await prisma.roster.findMany({
      where: {
        teamId: team.id,
        NOT: { releasedAt: null },
      },
      include: {
        player: true,
      },
      orderBy: {
        releasedAt: "desc",
      },
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
    });
  } catch (e) {
    console.error("Error fetching team summary:", e);
    res.status(500).json({ error: "Failed to fetch team summary" });
  }
});

export default router;
