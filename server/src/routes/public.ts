// server/src/routes/public.ts
import { Router } from "express";
import { prisma } from "../db/prisma";

export const publicRouter = Router();

/**
 * Public league lookup by slug (viewer w/o login)
 * GET /api/public/leagues/:slug
 */
publicRouter.get("/public/leagues/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug ?? "").trim();
    if (!slug) return res.status(400).json({ error: "Missing slug" });

    const league = await prisma.league.findFirst({
      where: { publicSlug: slug, isPublic: true },
      select: {
        id: true,
        name: true,
        season: true,
        isPublic: true,
        publicSlug: true,
        teams: {
          select: { id: true, name: true, code: true, owner: true },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!league) return res.status(404).json({ error: "Public league not found" });

    return res.json({ league });
  } catch (e: any) {
    console.error("public league error:", e);
    return res.status(500).json({ error: String(e?.message ?? e ?? "Unknown error") });
  }
});
export default publicRouter;
