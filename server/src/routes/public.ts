// server/src/routes/public.ts
import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const publicRouter = Router();

/**
 * GET /api/public/leagues
 * List all public leagues
 */
publicRouter.get("/public/leagues", asyncHandler(async (req, res) => {
  const leagues = await prisma.league.findMany({
    where: { isPublic: true },
    select: {
      id: true,
      name: true,
      season: true,
      draftMode: true,
      publicSlug: true,
    },
    orderBy: [{ season: "desc" }, { name: "asc" }],
  });
  return res.json({ leagues });
}));

export default publicRouter;
