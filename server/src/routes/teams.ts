import { Router } from 'express';
// import { prisma } from '../db'; // later for real DB queries

const router = Router();

// GET /api/teams/:teamId
router.get('/:teamId', (req, res) => {
  const teamId = Number(req.params.teamId);
  if (Number.isNaN(teamId)) {
    return res.status(400).json({ error: 'invalid teamId' });
  }

  // Placeholder response for now
  res.json({
    teamId,
    name: `Team ${teamId}`,
    summary: {},
    roster: [],
    pastContributors: [],
    totals: {}
  });
});

export default router;
