// server/src/routes/leagues.ts
import { Router } from "express";
import { prisma } from "../db/prisma";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.user?.id) return res.status(401).json({ error: "Not authenticated" });
  next();
}

/**
 * GET /api/leagues
 * Returns:
 * - leagues the user can access via membership
 * - plus public leagues (deduped)
 */
router.get("/leagues", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id as number;

    const memberships = await prisma.leagueMembership.findMany({
      where: { userId },
      select: {
        role: true,
        league: {
          select: { id: true, name: true, season: true, draftMode: true, draftOrder: true, isPublic: true, publicSlug: true },
        },
      },
      orderBy: [{ leagueId: "asc" }],
    });

    const memberLeagues = memberships.map((m) => ({
      ...m.league,
      access: { type: "MEMBER" as const, role: m.role },
    }));

    const publicLeaguesRaw = await prisma.league.findMany({
      where: { isPublic: true },
      select: { id: true, name: true, season: true, draftMode: true, draftOrder: true, isPublic: true, publicSlug: true },
      orderBy: [{ season: "desc" }, { name: "asc" }],
    });

    const byId = new Map<number, any>();
    for (const l of memberLeagues) byId.set(l.id, l);

    for (const l of publicLeaguesRaw) {
      if (!byId.has(l.id)) {
        byId.set(l.id, { ...l, access: { type: "PUBLIC" as const } });
      }
    }

    const leagues = Array.from(byId.values());
    return res.json({ leagues });
  } catch (err: any) {
    console.error("GET /leagues error:", err);
    return res.status(500).json({ error: err?.message || "Leagues error" });
  }
});

export const leaguesRouter = router;
export default leaguesRouter;
