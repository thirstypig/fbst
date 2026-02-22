// server/src/routes/auctionValues.ts
import { Router } from "express";
import { getAuctionValues } from "../data/auctionValues.js";

const router = Router();

// GET /api/auction-values
router.get("/", (req, res) => {
  res.json(getAuctionValues());
});

export default router;
