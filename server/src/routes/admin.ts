// server/src/routes/admin.ts
import { Router } from "express";
import { prisma } from "../db/prisma";
import { requireAdmin, parseIntParam } from "../middleware/auth";

export const adminRouter = Router();

type LeagueRole = "COMMISSIONER" | "OWNER" | "VIEWER";

/**
 * POST /api/admin/leagues
 * Admin creates a league and becomes COMMISSIONER automatically.
 * body: { name: string, season: number, draftMode: "AUCTION"|"DRAFT", draftOrder?: "SNAKE"|"LINEAR" }
 */
adminRouter.post("/admin/leagues", requireAdmin, async (req, res) => {
  try {
    const name = String(req.body?.name ?? "").trim();
    const season = Number(req.body?.season);
    const draftMode = String(req.body?.draftMode ?? "AUCTION").trim().toUpperCase();
    const draftOrder = req.body?.draftOrder ? String(req.body.draftOrder).trim().toUpperCase() : null;

    if (!name) return res.status(400).json({ error: "Missing name" });
    if (!Number.isFinite(season)) return res.status(400).json({ error: "Invalid season" });
    if (!["AUCTION", "DRAFT"].includes(draftMode)) return res.status(400).json({ error: "Invalid draftMode" });
    if (draftOrder && !["SNAKE", "LINEAR"].includes(draftOrder)) return res.status(400).json({ error: "Invalid draftOrder" });

    const league = await prisma.league.create({
      data: {
        name,
        season,
        draftMode: draftMode as any,
        draftOrder: draftOrder as any,
        memberships: {
          create: {
            userId: req.user!.id,
            role: "COMMISSIONER" satisfies LeagueRole,
          },
        },
      },
      select: { id: true, name: true, season: true },
    });

    return res.json({ ok: true, league });
  } catch (e: any) {
    console.error("POST /admin/leagues error:", e);
    return res.status(500).json({ error: String(e?.message ?? e ?? "Unknown error") });
  }
});

/**
 * POST /api/admin/leagues/:leagueId/teams
 * Admin creates a team in a league.
 * body: { name: string, code?: string, owner?: string, budget?: number }
 */
adminRouter.post("/admin/leagues/:leagueId/teams", requireAdmin, async (req, res) => {
  try {
    const leagueId = parseIntParam(req.params.leagueId);
    if (!leagueId) return res.status(400).json({ error: "Invalid leagueId" });

    const name = String(req.body?.name ?? "").trim();
    const code = req.body?.code != null ? String(req.body.code).trim().toUpperCase() : null;
    const owner = req.body?.owner != null ? String(req.body.owner).trim() : null;
    const budget = req.body?.budget != null ? Number(req.body.budget) : 400;

    if (!name) return res.status(400).json({ error: "Missing team name" });
    if (!Number.isFinite(budget)) return res.status(400).json({ error: "Invalid budget" });

    const team = await prisma.team.create({
      data: { leagueId, name, code, owner, budget },
      select: { id: true, leagueId: true, name: true, code: true, owner: true, budget: true },
    });

    return res.json({ ok: true, team });
  } catch (e: any) {
    console.error("POST /admin/leagues/:leagueId/teams error:", e);
    return res.status(500).json({ error: String(e?.message ?? e ?? "Unknown error") });
  }
});

/**
 * POST /api/admin/leagues/:leagueId/memberships
 * Admin sets membership for any user (by email).
 * body: { email: string, role: "COMMISSIONER"|"OWNER"|"VIEWER" }
 */
adminRouter.post("/admin/leagues/:leagueId/memberships", requireAdmin, async (req, res) => {
  try {
    const leagueId = parseIntParam(req.params.leagueId);
    if (!leagueId) return res.status(400).json({ error: "Invalid leagueId" });

    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const role = String(req.body?.role ?? "").trim().toUpperCase() as LeagueRole;

    if (!email) return res.status(400).json({ error: "Missing email" });
    if (!["COMMISSIONER", "OWNER", "VIEWER"].includes(role)) return res.status(400).json({ error: "Invalid role" });

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return res.status(404).json({ error: "User not found (must sign in once first)" });

    const membership = await prisma.leagueMembership.upsert({
      where: { leagueId_userId: { leagueId, userId: user.id } },
      update: { role: role as any },
      create: { leagueId, userId: user.id, role: role as any },
      select: { leagueId: true, userId: true, role: true },
    });

    return res.json({ ok: true, membership });
  } catch (e: any) {
    console.error("POST /admin/leagues/:leagueId/memberships error:", e);
    return res.status(500).json({ error: String(e?.message ?? e ?? "Unknown error") });
  }
});
export default adminRouter;
