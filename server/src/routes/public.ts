// server/src/routes/public.ts
import { Router } from "express";
import { prisma } from "../db/prisma.js";

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

/**
 * GET /api/public/leagues
 * List all public leagues
 */
publicRouter.get("/public/leagues", async (req, res) => {
  try {
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
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || "Public leagues error") });
  }
});

export default publicRouter;
