// server/src/routes/auctionValues.ts
import { Router } from "express";
import { auctionValues } from "../data/auctionValues";

const router = Router();

// GET /api/auction-values
router.get("/", (req, res) => {
  res.json(auctionValues);
});

export default router;
