import { Router } from 'express';

const router = Router();

// GET /api/standings/period/current
router.get('/period/current', (_req, res) => {
  const data = [
    { teamId: 1, teamName: 'Team A', points: 68, rank: 1, delta: +1 },
    { teamId: 2, teamName: 'Team B', points: 64, rank: 2, delta: -1 },
    { teamId: 3, teamName: 'Team C', points: 55, rank: 3, delta: 0 },
    { teamId: 4, teamName: 'Team D', points: 50, rank: 4, delta: 0 }
  ];

  res.json({ periodId: 1, data });
});

export default router;
