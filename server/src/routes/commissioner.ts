// server/src/routes/commissioner.ts
import { Router } from "express";
import { prisma } from "../db/prisma";

const router = Router();

/**
 * Assumes your existing auth middleware sets (req as any).user when cookie is valid.
 */
function requireAuth(req: any, res: any, next: any) {
  if (!req.user?.id) return res.status(401).json({ error: "Not authenticated" });
  next();
}

async function requireCommissionerOrAdmin(req: any, res: any, next: any) {
  try {
    const leagueId = Number(req.params.leagueId);
    if (!Number.isFinite(leagueId)) return res.status(400).json({ error: "Invalid leagueId" });

    if (req.user?.isAdmin) return next();

    const m = await prisma.leagueMembership.findUnique({
      where: { leagueId_userId: { leagueId, userId: req.user.id } },
      select: { role: true },
    });

    if (!m || m.role !== "COMMISSIONER") {
      return res.status(403).json({ error: "Commissioner only" });
    }

    return next();
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Auth check failed" });
  }
}

function normStr(v: any) {
  return String(v ?? "").trim();
}

function normCode(v: any) {
  const s = normStr(v).toUpperCase();
  return s || null;
}

function mustOneOf(v: string, allowed: string[], name: string) {
  if (!allowed.includes(v)) throw new Error(`Invalid ${name}. Allowed: ${allowed.join(", ")}`);
  return v;
}

/**
 * GET /api/commissioner/:leagueId
 * Returns league + teams + memberships (with user info)
 */
router.get("/commissioner/:leagueId", requireAuth, requireCommissionerOrAdmin, async (req, res) => {
  try {
    const leagueId = Number(req.params.leagueId);

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        id: true,
        name: true,
        season: true,
        draftMode: true,
        draftOrder: true,
        isPublic: true,
        publicSlug: true,
      },
    });
    if (!league) return res.status(404).json({ error: "League not found" });

    const teams = await prisma.team.findMany({
      where: { leagueId },
      orderBy: [{ id: "asc" }],
      select: {
        id: true,
        leagueId: true,
        name: true,
        owner: true,
        budget: true,
        code: true,
        ownerUserId: true,
        ownerUser: { select: { id: true, email: true, name: true, avatarUrl: true, isAdmin: true } },
      },
    });

    const memberships = await prisma.leagueMembership.findMany({
      where: { leagueId },
      orderBy: [{ id: "asc" }],
      select: {
        id: true,
        leagueId: true,
        userId: true,
        role: true,
        user: { select: { id: true, email: true, name: true, avatarUrl: true, isAdmin: true } },
      },
    });

    return res.json({ league, teams, memberships });
  } catch (err: any) {
    console.error("GET /commissioner/:leagueId error:", err);
    return res.status(500).json({ error: err?.message || "Commissioner overview error" });
  }
});

/**
 * POST /api/commissioner/:leagueId/teams
 * Body:
 *  - { name, code?, owner?, budget? }
 *  - OR { teams: [{ name, code?, owner?, budget? }, ...] }
 */
router.post("/commissioner/:leagueId/teams", requireAuth, requireCommissionerOrAdmin, async (req, res) => {
  try {
    const leagueId = Number(req.params.leagueId);

    const items: any[] = Array.isArray(req.body?.teams) ? req.body.teams : [req.body];

    if (!items.length) return res.status(400).json({ error: "Missing teams" });

    const created: any[] = [];

    for (const raw of items) {
      const name = normStr(raw?.name);
      if (!name) throw new Error("Missing team name");

      const code = normCode(raw?.code);
      const owner = normStr(raw?.owner || "") || null;
      const budget = raw?.budget != null && String(raw.budget).trim() !== "" ? Number(raw.budget) : undefined;

      const t = await prisma.team.create({
        data: {
          leagueId,
          name,
          code: code ?? undefined,
          owner: owner ?? undefined,
          budget: budget != null && Number.isFinite(budget) ? budget : undefined,
        },
        select: {
          id: true,
          leagueId: true,
          name: true,
          owner: true,
          budget: true,
          code: true,
          ownerUserId: true,
          ownerUser: { select: { id: true, email: true, name: true, avatarUrl: true, isAdmin: true } },
        },
      });

      created.push(t);
    }

    return res.json({ teams: created });
  } catch (err: any) {
    const msg = String(err?.message || "Create teams failed");
    return res.status(400).json({ error: msg });
  }
});

/**
 * POST /api/commissioner/:leagueId/members
 * Commissioner can add OWNER/VIEWER. Only admin can add COMMISSIONER.
 * Body: { userId?: number, email?: string, role: "OWNER" | "VIEWER" | "COMMISSIONER" }
 */
router.post("/commissioner/:leagueId/members", requireAuth, requireCommissionerOrAdmin, async (req, res) => {
  try {
    const leagueId = Number(req.params.leagueId);

    const role = mustOneOf(normStr(req.body?.role), ["COMMISSIONER", "OWNER", "VIEWER"], "role") as
      | "COMMISSIONER"
      | "OWNER"
      | "VIEWER";

    if (role === "COMMISSIONER" && !req.user?.isAdmin) {
      return res.status(403).json({ error: "Only admin can assign COMMISSIONER" });
    }

    const userIdRaw = req.body?.userId;
    const emailRaw = normStr(req.body?.email || "").toLowerCase();

    let userId: number | null = null;

    if (userIdRaw != null && String(userIdRaw).trim() !== "") {
      const n = Number(userIdRaw);
      if (!Number.isFinite(n)) return res.status(400).json({ error: "Invalid userId" });
      userId = n;
    } else if (emailRaw) {
      const u = await prisma.user.findUnique({ where: { email: emailRaw } });
      if (!u) {
        return res.status(404).json({
          error:
            "User not found by email. That user must log in once first (User.googleSub is required), then you can add them.",
        });
      }
      userId = u.id;
    } else {
      return res.status(400).json({ error: "Provide userId or email" });
    }

    // ensure league exists
    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    if (!league) return res.status(404).json({ error: "League not found" });

    const membership = await prisma.leagueMembership.upsert({
      where: { leagueId_userId: { leagueId, userId } },
      create: { leagueId, userId, role },
      update: { role },
      select: {
        id: true,
        leagueId: true,
        userId: true,
        role: true,
        user: { select: { id: true, email: true, name: true, avatarUrl: true, isAdmin: true } },
      },
    });

    return res.json({ membership });
  } catch (err: any) {
    return res.status(400).json({ error: String(err?.message || "Add member failed") });
  }
});

/**
 * POST /api/commissioner/:leagueId/teams/:teamId/owner
 * Assign the ownerUserId for a team (and optionally set owner display name).
 * Body: { userId?: number, email?: string, ownerName?: string }
 */
router.post(
  "/commissioner/:leagueId/teams/:teamId/owner",
  requireAuth,
  requireCommissionerOrAdmin,
  async (req, res) => {
    try {
      const leagueId = Number(req.params.leagueId);
      const teamId = Number(req.params.teamId);

      if (!Number.isFinite(teamId)) return res.status(400).json({ error: "Invalid teamId" });

      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team || team.leagueId !== leagueId) return res.status(404).json({ error: "Team not found" });

      const userIdRaw = req.body?.userId;
      const emailRaw = normStr(req.body?.email || "").toLowerCase();
      const ownerName = normStr(req.body?.ownerName || "") || null;

      let userId: number | null = null;

      if (userIdRaw != null && String(userIdRaw).trim() !== "") {
        const n = Number(userIdRaw);
        if (!Number.isFinite(n)) return res.status(400).json({ error: "Invalid userId" });
        userId = n;
      } else if (emailRaw) {
        const u = await prisma.user.findUnique({ where: { email: emailRaw } });
        if (!u) return res.status(404).json({ error: "User not found by email (must log in once first)" });
        userId = u.id;
      } else {
        return res.status(400).json({ error: "Provide userId or email" });
      }

      // Ensure the user is at least a member (OWNER/VIEWER/COMMISSIONER). If not, force-add as OWNER.
      await prisma.leagueMembership.upsert({
        where: { leagueId_userId: { leagueId, userId } },
        create: { leagueId, userId, role: "OWNER" },
        update: {},
      });

      const updated = await prisma.team.update({
        where: { id: teamId },
        data: {
          ownerUserId: userId,
          owner: ownerName ?? undefined,
        },
        select: {
          id: true,
          leagueId: true,
          name: true,
          owner: true,
          budget: true,
          code: true,
          ownerUserId: true,
          ownerUser: { select: { id: true, email: true, name: true, avatarUrl: true, isAdmin: true } },
        },
      });

      return res.json({ team: updated });
    } catch (err: any) {
      return res.status(400).json({ error: String(err?.message || "Assign owner failed") });
    }
  }
);

/**
 * GET /api/commissioner/:leagueId/teams/:teamId/roster
 * Returns active roster (releasedAt is null) + player fields.
 */
router.get(
  "/commissioner/:leagueId/teams/:teamId/roster",
  requireAuth,
  requireCommissionerOrAdmin,
  async (req, res) => {
    try {
      const leagueId = Number(req.params.leagueId);
      const teamId = Number(req.params.teamId);

      if (!Number.isFinite(teamId)) return res.status(400).json({ error: "Invalid teamId" });

      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team || team.leagueId !== leagueId) return res.status(404).json({ error: "Team not found" });

      const roster = await prisma.roster.findMany({
        where: { teamId, releasedAt: null },
        orderBy: [{ id: "asc" }],
        select: {
          id: true,
          teamId: true,
          playerId: true,
          acquiredAt: true,
          releasedAt: true,
          source: true,
          price: true,
          player: { select: { id: true, mlbId: true, name: true, posPrimary: true, posList: true } },
        },
      });

      return res.json({ roster });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Roster fetch failed" });
    }
  }
);

/**
 * POST /api/commissioner/:leagueId/roster/assign
 * Manual assignment:
 * Body:
 * {
 *   teamId: number,
 *   mlbId?: number|string,
 *   name: string,
 *   posPrimary: string,
 *   posList?: string,
 *   price?: number,
 *   source?: string
 * }
 *
 * Behavior:
 * - Upsert Player (best-effort) by mlbId if provided, else by (name+posPrimary)
 * - Releases any existing active roster rows for that player (releasedAt = now)
 * - Creates a new roster row for teamId
 */
router.post(
  "/commissioner/:leagueId/roster/assign",
  requireAuth,
  requireCommissionerOrAdmin,
  async (req, res) => {
    try {
      const leagueId = Number(req.params.leagueId);

      const teamId = Number(req.body?.teamId);
      if (!Number.isFinite(teamId)) return res.status(400).json({ error: "Invalid teamId" });

      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team || team.leagueId !== leagueId) return res.status(404).json({ error: "Team not found" });

      const mlbIdRaw = req.body?.mlbId;
      const mlbIdNum =
        mlbIdRaw != null && String(mlbIdRaw).trim() !== "" ? Number(String(mlbIdRaw).trim()) : null;
      const mlbId = Number.isFinite(mlbIdNum as any) ? (mlbIdNum as number) : null;

      const name = normStr(req.body?.name);
      const posPrimary = normStr(req.body?.posPrimary);
      const posList = normStr(req.body?.posList || posPrimary);

      if (!name) return res.status(400).json({ error: "Missing name" });
      if (!posPrimary) return res.status(400).json({ error: "Missing posPrimary" });
      if (!posList) return res.status(400).json({ error: "Missing posList" });

      const priceRaw = req.body?.price;
      const price =
        priceRaw != null && String(priceRaw).trim() !== "" ? Number(priceRaw) : 1;

      const source = normStr(req.body?.source || "manual");

      // Upsert-ish player
      let player = null as any;

      if (mlbId != null) {
        player = await prisma.player.findFirst({ where: { mlbId } });
      }

      if (!player) {
        player = await prisma.player.findFirst({
          where: { name, posPrimary },
        });
      }

      if (!player) {
        player = await prisma.player.create({
          data: {
            mlbId: mlbId ?? undefined,
            name,
            posPrimary,
            posList,
          },
        });
      } else {
        // keep record fresh without being destructive
        player = await prisma.player.update({
          where: { id: player.id },
          data: {
            mlbId: mlbId ?? player.mlbId ?? undefined,
            name,
            posPrimary,
            posList,
          },
        });
      }

      // Release any existing active roster rows for this player
      await prisma.roster.updateMany({
        where: { playerId: player.id, releasedAt: null },
        data: { releasedAt: new Date() },
      });

      const roster = await prisma.roster.create({
        data: {
          teamId,
          playerId: player.id,
          source,
          price: Number.isFinite(price) ? price : 1,
        },
        select: {
          id: true,
          teamId: true,
          playerId: true,
          acquiredAt: true,
          releasedAt: true,
          source: true,
          price: true,
          player: { select: { id: true, mlbId: true, name: true, posPrimary: true, posList: true } },
        },
      });

      return res.json({ roster });
    } catch (err: any) {
      return res.status(400).json({ error: String(err?.message || "Roster assign failed") });
    }
  }
);

/**
 * POST /api/commissioner/:leagueId/roster/release
 * Body: { rosterId?: number, teamId?: number, playerId?: number }
 */
router.post(
  "/commissioner/:leagueId/roster/release",
  requireAuth,
  requireCommissionerOrAdmin,
  async (req, res) => {
    try {
      const leagueId = Number(req.params.leagueId);

      const rosterIdRaw = req.body?.rosterId;
      const rosterId = rosterIdRaw != null && String(rosterIdRaw).trim() !== "" ? Number(rosterIdRaw) : null;

      if (rosterId != null && Number.isFinite(rosterId)) {
        const r = await prisma.roster.findUnique({ where: { id: rosterId } });
        if (!r) return res.status(404).json({ error: "Roster row not found" });

        const team = await prisma.team.findUnique({ where: { id: r.teamId } });
        if (!team || team.leagueId !== leagueId) return res.status(404).json({ error: "Team not found" });

        const updated = await prisma.roster.update({
          where: { id: rosterId },
          data: { releasedAt: new Date() },
        });

        return res.json({ roster: updated });
      }

      const teamId = Number(req.body?.teamId);
      const playerId = Number(req.body?.playerId);

      if (!Number.isFinite(teamId) || !Number.isFinite(playerId)) {
        return res.status(400).json({ error: "Provide rosterId OR (teamId + playerId)" });
      }

      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team || team.leagueId !== leagueId) return res.status(404).json({ error: "Team not found" });

      await prisma.roster.updateMany({
        where: { teamId, playerId, releasedAt: null },
        data: { releasedAt: new Date() },
      });

      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(400).json({ error: String(err?.message || "Roster release failed") });
    }
  }
);

export const commissionerRouter = router;
export default commissionerRouter;
