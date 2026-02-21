import { Router } from 'express';
import { prisma } from '../../db/prisma.js';

const router = Router();

// Add a player to a team's roster
router.post('/api/roster/add-player', async (req, res) => {
  const { year, teamCode, playerName, position, mlbTeam, acquisitionCost } = req.body;
  const rosterYear = year || new Date().getFullYear();
  if (!teamCode || !playerName || !position) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const entry = await prisma.rosterEntry.create({
      data: { year: rosterYear, teamCode, playerName, position, mlbTeam, acquisitionCost },
    });
    res.json(entry);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to add player' });
  }
});

// Delete a roster entry
router.delete('/api/roster/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.rosterEntry.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

// Get roster for a team (optionally filtered by year)
router.get('/api/roster/:teamCode', async (req, res) => {
  const { teamCode } = req.params;
  const year = req.query.year ? parseInt(req.query.year as string) : undefined;
  try {
    const roster = await prisma.rosterEntry.findMany({
      where: { teamCode, ...(year ? { year } : {}) },
      orderBy: { playerName: 'asc' },
    });
    res.json(roster);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch roster' });
  }
});

// Get all rosters for a year
router.get('/api/roster/year/:year', async (req, res) => {
  const year = parseInt(req.params.year);
  try {
    const roster = await prisma.rosterEntry.findMany({
      where: { year },
      orderBy: [{ teamCode: 'asc' }, { playerName: 'asc' }],
    });
    res.json(roster);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch rosters for year' });
  }
});

export const rosterRouter = router;
export default rosterRouter;
