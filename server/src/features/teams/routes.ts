// server/src/routes/teams.ts
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { TeamService } from "./services/teamService.js";
import { requireAuth, requireTeamOwner } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { logger } from "../../lib/logger.js";

const rosterUpdateSchema = z.object({
  assignedPosition: z.string().max(5).nullable(),
});

const router = Router();
const teamService = new TeamService();

// GET /api/teams - simple list of teams
router.get("/", requireAuth, asyncHandler(async (_req, res) => {
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
}));

// GET /api/teams/:id/summary
router.get("/:id/summary", requireAuth, asyncHandler(async (req, res) => {
  const teamId = Number(req.params.id);
  if (Number.isNaN(teamId)) {
    return res.status(400).json({ error: "Invalid team id" });
  }

  try {
    const summary = await teamService.getTeamSummary(teamId);
    res.json(summary);
  } catch (e) {
    if ((e as Error).message === "Team not found") {
      return res.status(404).json({ error: "Team not found" });
    }
    throw e;
  }
}));

// PATCH /api/teams/:teamId/roster/:rosterId
// Update roster details (e.g. assigned position)
router.patch("/:teamId/roster/:rosterId", requireAuth, requireTeamOwner("teamId"), validateBody(rosterUpdateSchema), asyncHandler(async (req, res) => {
  const teamId = Number(req.params.teamId);
  const rosterId = Number(req.params.rosterId);

  if (Number.isNaN(teamId) || Number.isNaN(rosterId)) {
    return res.status(400).json({ error: "Invalid IDs" });
  }

  // Verify Roster belongs to Team
  const rosterItem = await prisma.roster.findUnique({
    where: { id: rosterId },
    include: { team: true }
  });

  if (!rosterItem || rosterItem.teamId !== teamId) {
    return res.status(404).json({ error: "Roster item not found for this team" });
  }

  const { assignedPosition } = req.body;

  const updated = await prisma.roster.update({
    where: { id: rosterId },
    data: { assignedPosition },
  });

  res.json({ roster: updated });
}));

export const teamsRouter = router;
export default teamsRouter;
