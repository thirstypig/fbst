import { Router } from 'express';

const router = Router();

// GET /api/auction/state
router.get('/state', (_req, res) => {
  res.json({
    status: 'idle',
    currentLot: null,
    highBid: null,
    teams: []
  });
});

export default router;
