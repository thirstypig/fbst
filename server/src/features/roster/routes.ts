import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { requireAuth, requireLeagueMember, isTeamOwner } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { logger } from '../../lib/logger.js';
import { writeAuditLog } from '../../lib/auditLog.js';

const addPlayerSchema = z.object({
  year: z.number().int().positive().optional(),
  teamCode: z.string().min(1).max(10),
  playerName: z.string().min(1).max(100),
  position: z.string().min(1).max(10),
  mlbTeam: z.string().max(10).optional(),
  acquisitionCost: z.number().nonnegative().optional(),
});

const router = Router();

/** Verify the current user owns the team identified by code. Admins bypass. */
async function verifyTeamOwnerByCode(teamCode: string, userId: number, isAdmin: boolean): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (isAdmin) return { ok: true };
  const team = await prisma.team.findFirst({ where: { code: teamCode } });
  if (!team) return { ok: false, status: 404, error: "Team not found" };
  const owns = await isTeamOwner(team.id, userId);
  if (!owns) return { ok: false, status: 403, error: "You do not own this team" };
  return { ok: true };
}

// Add a player to a team's roster
router.post('/api/roster/add-player', requireAuth, validateBody(addPlayerSchema), asyncHandler(async (req, res) => {
  const { year, teamCode, playerName, position, mlbTeam, acquisitionCost } = req.body;

  // Ownership check: find team by code, verify user owns it
  const check = await verifyTeamOwnerByCode(teamCode, req.user!.id, req.user!.isAdmin);
  if (!check.ok) return res.status(check.status).json({ error: check.error });

  const rosterYear = year || new Date().getFullYear();
  const entry = await prisma.rosterEntry.create({
    data: { year: rosterYear, teamCode, playerName, position, mlbTeam, acquisitionCost },
  });

  writeAuditLog({
    userId: req.user!.id,
    action: "ROSTER_ADD",
    resourceType: "Roster",
    resourceId: entry.id,
    metadata: { teamCode, playerName, position, year: rosterYear },
  });

  res.json(entry);
}));

// Delete a roster entry
router.delete('/api/roster/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Ownership check: fetch entry, find team by code, verify ownership
  const entry = await prisma.rosterEntry.findUnique({ where: { id: Number(id) } });
  if (!entry) return res.status(404).json({ error: "Roster entry not found" });
  const check = await verifyTeamOwnerByCode(entry.teamCode, req.user!.id, req.user!.isAdmin);
  if (!check.ok) return res.status(check.status).json({ error: check.error });

  await prisma.rosterEntry.delete({ where: { id: Number(id) } });

  writeAuditLog({
    userId: req.user!.id,
    action: "ROSTER_RELEASE",
    resourceType: "Roster",
    resourceId: Number(id),
    metadata: { teamCode: entry.teamCode, playerName: entry.playerName },
  });

  res.json({ success: true });
}));

// Get roster for a team (optionally filtered by year) — requires league membership
router.get('/api/roster/:teamCode', requireAuth, asyncHandler(async (req, res) => {
  const { teamCode } = req.params;
  const year = req.query.year ? parseInt(req.query.year as string) : undefined;

  // Verify the team belongs to a league the user is in (or user is admin)
  if (!req.user!.isAdmin) {
    const team = await prisma.team.findFirst({ where: { code: teamCode } });
    if (!team) return res.status(404).json({ error: "Team not found" });
    const membership = await prisma.leagueMembership.findUnique({
      where: { leagueId_userId: { leagueId: team.leagueId, userId: req.user!.id } },
    });
    if (!membership) return res.status(403).json({ error: "Not a member of this team's league" });
  }

  const roster = await prisma.rosterEntry.findMany({
    where: { teamCode, ...(year ? { year } : {}) },
    orderBy: { playerName: 'asc' },
  });
  res.json({ roster });
}));

// Get all rosters for a year — requires league membership via leagueId query param
router.get('/api/roster/year/:year', requireAuth, requireLeagueMember("leagueId"), asyncHandler(async (req, res) => {
  const year = parseInt(req.params.year);
  const leagueId = Number(req.query.leagueId);

  // Only return rosters for teams in the user's league
  const teams = await prisma.team.findMany({ where: { leagueId }, select: { code: true } });
  const teamCodes = teams.map(t => t.code).filter((c): c is string => c !== null);

  const roster = await prisma.rosterEntry.findMany({
    where: { year, teamCode: { in: teamCodes } },
    orderBy: [{ teamCode: 'asc' }, { playerName: 'asc' }],
  });
  res.json({ roster });
}));

export const rosterRouter = router;
export default rosterRouter;
