// server/src/routes/teams.ts
import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { TeamService } from "../services/teamService.js";

const router = Router();
const teamService = new TeamService();



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
    const summary = await teamService.getTeamSummary(teamId);
    res.json(summary);
  } catch (e) {
    if ((e as Error).message === "Team not found") {
      return res.status(404).json({ error: "Team not found" });
    }
    console.error("Error fetching team summary:", e);
    res.status(500).json({ error: "Failed to fetch team summary" });
  }
});

// PATCH /api/teams/:teamId/roster/:rosterId
// Update roster details (e.g. assigned position)
router.patch("/:teamId/roster/:rosterId", async (req, res) => {
  const teamId = Number(req.params.teamId);
  const rosterId = Number(req.params.rosterId);
  
  if (Number.isNaN(teamId) || Number.isNaN(rosterId)) {
    return res.status(400).json({ error: "Invalid IDs" });
  }

  try {
    // 1. Verify Roster belongs to Team
    const rosterItem = await prisma.roster.findUnique({
      where: { id: rosterId },
      include: { team: true }
    });

    if (!rosterItem || rosterItem.teamId !== teamId) {
      return res.status(404).json({ error: "Roster item not found for this team" });
    }

    // 2. Auth check: User must own the team OR be Commissioner/Admin
    // (Skipping strict auth middleware for now as per project pattern, but ideally add requireAuth)
    // For now, we trust the UI state or add simple check if user is in req (if using auth middleware globally)
    
    // 3. Update fields
    const { assignedPosition } = req.body;
    
    // Validate position if needed (e.g. against player.posList)
    // For now, accept any string or null
    
    const updated = await prisma.roster.update({
      where: { id: rosterId },
      data: {
        assignedPosition: assignedPosition
      }
    });

    res.json({ roster: updated });
  } catch (e) {
    console.error("Error updating roster:", e);
    res.status(500).json({ error: "Failed to update roster" });
  }
});

export default router;
