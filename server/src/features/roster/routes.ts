import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { logger } from '../../lib/logger.js';

const addPlayerSchema = z.object({
  year: z.number().int().positive().optional(),
  teamCode: z.string().min(1).max(10),
  playerName: z.string().min(1).max(100),
  position: z.string().min(1).max(10),
  mlbTeam: z.string().max(10).optional(),
  acquisitionCost: z.number().nonnegative().optional(),
});

const router = Router();

// Add a player to a team's roster
router.post('/api/roster/add-player', requireAuth, validateBody(addPlayerSchema), asyncHandler(async (req, res) => {
  const { year, teamCode, playerName, position, mlbTeam, acquisitionCost } = req.body;
  const rosterYear = year || new Date().getFullYear();
  const entry = await prisma.rosterEntry.create({
    data: { year: rosterYear, teamCode, playerName, position, mlbTeam, acquisitionCost },
  });
  res.json(entry);
}));

// Delete a roster entry
router.delete('/api/roster/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.rosterEntry.delete({ where: { id: Number(id) } });
  res.json({ success: true });
}));

// Get roster for a team (optionally filtered by year)
router.get('/api/roster/:teamCode', asyncHandler(async (req, res) => {
  const { teamCode } = req.params;
  const year = req.query.year ? parseInt(req.query.year as string) : undefined;
  const roster = await prisma.rosterEntry.findMany({
    where: { teamCode, ...(year ? { year } : {}) },
    orderBy: { playerName: 'asc' },
  });
  res.json(roster);
}));

// Get all rosters for a year
router.get('/api/roster/year/:year', asyncHandler(async (req, res) => {
  const year = parseInt(req.params.year);
  const roster = await prisma.rosterEntry.findMany({
    where: { year },
    orderBy: [{ teamCode: 'asc' }, { playerName: 'asc' }],
  });
  res.json(roster);
}));

export const rosterRouter = router;
export default rosterRouter;
