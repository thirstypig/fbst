// server/src/routes/leagues.ts
import { Router } from "express";
import { prisma } from "../db/prisma";
import { requireAuth, parseIntParam, requireLeagueRole } from "../middleware/auth";

export const leaguesRouter = Router();

type LeagueRole = "COMMISSIONER" | "OWNER" | "VIEWER";

/**
 * GET /api/leagues
 * returns leagues the current user is a member of
 */
leaguesRouter.get("/leagues", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    const memberships = await prisma.leagueMembership.findMany({
      where: { userId },
      select: {
        role: true,
        league: {
          select: {
            id: true,
            name: true,
            season: true,
            isPublic: true,
            publicSlug: true,
            teams: { select: { id: true, name: true, code: true, owner: true } },
          },
        },
      },
      orderBy: { leagueId: "asc" },
    });

    return res.json({
      rows: memberships.map((m) => ({ role: m.role, league: m.league })),
    });
  } catch (e: any) {
    console.error("GET /leagues error:", e);
    return res.status(500).json({ error: String(e?.message ?? e ?? "Unknown error") });
  }
});

/**
 * GET /api/leagues/:leagueId/my-role
 */
leaguesRouter.get("/leagues/:leagueId/my-role", requireAuth, async (req, res) => {
  const leagueId = parseIntParam(req.params.leagueId);
  if (!leagueId) return res.status(400).json({ error: "Invalid leagueId" });

  if (req.user!.isAdmin) return res.json({ role: "ADMIN" });

  const m = await prisma.leagueMembership.findUnique({
    where: { leagueId_userId: { leagueId, userId: req.user!.id } },
    select: { role: true },
  });

  return res.json({ role: m?.role ?? null });
});

/**
 * POST /api/leagues/:leagueId/members
 * Commissioner (or admin) adds/updates membership by email
 * body: { email: string, role: "COMMISSIONER"|"OWNER"|"VIEWER" }
 */
leaguesRouter.post("/leagues/:leagueId/members", requireAuth, async (req, res) => {
  const leagueId = parseIntParam(req.params.leagueId);
  if (!leagueId) return res.status(400).json({ error: "Invalid leagueId" });

  const ok = await requireLeagueRole(leagueId, "COMMISSIONER", req, res);
  if (!ok) return;

  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const role = String(req.body?.role ?? "").trim().toUpperCase() as LeagueRole;

  if (!email) return res.status(400).json({ error: "Missing email" });
  if (!["COMMISSIONER", "OWNER", "VIEWER"].includes(role)) return res.status(400).json({ error: "Invalid role" });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });
  if (!user) return res.status(404).json({ error: "User not found (must sign in once first)" });

  const membership = await prisma.leagueMembership.upsert({
    where: { leagueId_userId: { leagueId, userId: user.id } },
    update: { role: role as any },
    create: { leagueId, userId: user.id, role: role as any },
    select: { id: true, leagueId: true, userId: true, role: true },
  });

  return res.json({ ok: true, membership });
});

/**
 * GET /api/leagues/:leagueId/members
 * Commissioner/admin only
 */
leaguesRouter.get("/leagues/:leagueId/members", requireAuth, async (req, res) => {
  const leagueId = parseIntParam(req.params.leagueId);
  if (!leagueId) return res.status(400).json({ error: "Invalid leagueId" });

  const ok = await requireLeagueRole(leagueId, "COMMISSIONER", req, res);
  if (!ok) return;

  const members = await prisma.leagueMembership.findMany({
    where: { leagueId },
    select: {
      role: true,
      user: { select: { id: true, email: true, name: true, avatarUrl: true, isAdmin: true } },
    },
    orderBy: { userId: "asc" },
  });

  return res.json({ rows: members });
});

/**
 * PATCH /api/leagues/:leagueId/public
 * Commissioner/admin sets public viewer access
 * body: { isPublic: boolean, publicSlug?: string }
 */
leaguesRouter.patch("/leagues/:leagueId/public", requireAuth, async (req, res) => {
  const leagueId = parseIntParam(req.params.leagueId);
  if (!leagueId) return res.status(400).json({ error: "Invalid leagueId" });

  const ok = await requireLeagueRole(leagueId, "COMMISSIONER", req, res);
  if (!ok) return;

  const isPublic = Boolean(req.body?.isPublic);
  const publicSlug = req.body?.publicSlug != null ? String(req.body.publicSlug).trim() : undefined;

  if (publicSlug != null && publicSlug.length < 3) {
    return res.status(400).json({ error: "publicSlug too short" });
  }

  const league = await prisma.league.update({
    where: { id: leagueId },
    data: {
      isPublic,
      publicSlug: isPublic ? publicSlug ?? undefined : null,
    },
    select: { id: true, name: true, season: true, isPublic: true, publicSlug: true },
  });

  return res.json({ ok: true, league });
});
export default leaguesRouter;
