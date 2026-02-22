// server/src/routes/commissioner.ts
import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import multer from "multer";
import { parse } from "csv-parse";
import { Readable } from "stream";
import { CommissionerService } from "./services/CommissionerService.js";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();
const commissionerService = new CommissionerService();

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
 * GET /api/commissioner/:leagueId/available-users
 * Returns all registered users for owner assignment dropdown
 */
router.get("/commissioner/:leagueId/available-users", requireAuth, requireCommissionerOrAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, avatarUrl: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    });
    return res.json({ users });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to fetch users" });
  }
});

/**
 * GET /api/commissioner/:leagueId/prior-teams
 * Returns teams from the previous season for team history linking
 */
router.get("/commissioner/:leagueId/prior-teams", requireAuth, requireCommissionerOrAdmin, async (req, res) => {
  try {
    const leagueId = Number(req.params.leagueId);
    
    // Get current league to find its season
    const currentLeague = await prisma.league.findUnique({ where: { id: leagueId } });
    if (!currentLeague) return res.status(404).json({ error: "League not found" });

    // Find the prior season's league with the same name
    const priorLeague = await prisma.league.findFirst({
      where: {
        name: currentLeague.name,
        season: currentLeague.season - 1,
      },
    });

    if (!priorLeague) {
      return res.json({ priorTeams: [], priorLeagueId: null });
    }

    const priorTeams = await prisma.team.findMany({
      where: { leagueId: priorLeague.id },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });

    return res.json({ priorTeams, priorLeagueId: priorLeague.id, priorSeason: priorLeague.season });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to fetch prior teams" });
  }
});

/**
 * POST /api/commissioner/:leagueId/teams
 * Body:
 *  - { name, code?, owner?, budget?, priorTeamId? }
 *  - OR { teams: [{ name, code?, owner?, budget?, priorTeamId? }, ...] }
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

      const t = await commissionerService.createTeam(leagueId, {
          name,
          code: raw?.code,
          owner: raw?.owner,
          budget: raw?.budget != null && String(raw.budget).trim() !== "" ? Number(raw.budget) : undefined,
          priorTeamId: raw?.priorTeamId != null ? Number(raw.priorTeamId) : undefined
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
 * DELETE /api/commissioner/:leagueId/teams/:teamId
 * Commissioner can delete a team (cleanup).
 */
router.delete("/commissioner/:leagueId/teams/:teamId", requireAuth, requireCommissionerOrAdmin, async (req, res) => {
  try {
    const leagueId = Number(req.params.leagueId);
    const teamId = Number(req.params.teamId);

    if (!Number.isFinite(teamId)) return res.status(400).json({ error: "Invalid teamId" });

    await commissionerService.deleteTeam(leagueId, teamId);

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: String(err?.message || "Delete team failed") });
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

    const membership = await commissionerService.addMember(leagueId, {
        userId: req.body?.userId != null && String(req.body.userId).trim() !== "" ? Number(req.body.userId) : undefined,
        email: req.body?.email,
        role
    });

    return res.json({ membership });
  } catch (err: any) {
    return res.status(400).json({ error: String(err?.message || "Add member failed") });
  }
});

/**
 * POST /api/commissioner/:leagueId/teams/:teamId/owner
 * Add an owner to the team (max 2 owners).
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

      const team = await commissionerService.addTeamOwner(leagueId, teamId, {
          userId: req.body?.userId != null && String(req.body.userId).trim() !== "" ? Number(req.body.userId) : undefined,
          email: req.body?.email,
          ownerName: req.body?.ownerName
      });

      return res.json({ team });
    } catch (err: any) {
      return res.status(400).json({ error: String(err?.message || "Assign owner failed") });
    }
  }
);

/**
 * DELETE /api/commissioner/:leagueId/teams/:teamId/owner/:userId
 * Remove an owner from the team.
 */
router.delete(
  "/commissioner/:leagueId/teams/:teamId/owner/:userId",
  requireAuth,
  requireCommissionerOrAdmin,
  async (req, res) => {
    try {
      const leagueId = Number(req.params.leagueId);
      const teamId = Number(req.params.teamId);
      const userId = Number(req.params.userId);

      if (!Number.isFinite(teamId) || !Number.isFinite(userId)) {
        return res.status(400).json({ error: "Invalid teamId or userId" });
      }

      const team = await commissionerService.removeTeamOwner(leagueId, teamId, userId);

      return res.json({ team });
    } catch (err: any) {
      return res.status(400).json({ error: String(err?.message || "Remove owner failed") });
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

      const mlbIdRaw = req.body?.mlbId;
      const mlbIdNum =
        mlbIdRaw != null && String(mlbIdRaw).trim() !== "" ? Number(String(mlbIdRaw).trim()) : undefined;
      const mlbId = Number.isFinite(mlbIdNum as any) ? (mlbIdNum as number) : undefined;

      const name = normStr(req.body?.name);
      if (!name) return res.status(400).json({ error: "Missing name" });
      
      const roster = await commissionerService.assignPlayer(leagueId, {
          teamId,
          mlbId,
          name,
          posPrimary: req.body?.posPrimary,
          posList: req.body?.posList,
          price: req.body?.price,
          source: req.body?.source
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
      const rosterId = rosterIdRaw != null && String(rosterIdRaw).trim() !== "" ? Number(rosterIdRaw) : undefined;
      const teamId = req.body?.teamId ? Number(req.body.teamId) : undefined;
      const playerId = req.body?.playerId ? Number(req.body.playerId) : undefined;

      const result = await commissionerService.releasePlayer(leagueId, {
          rosterId,
          teamId,
          playerId
      });

      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(400).json({ error: String(err?.message || "Roster release failed") });
    }
  }
);

/**
 * GET /api/commissioner/:leagueId/rosters
 * Get ALl active rosters for the league
 */
router.get(
  "/commissioner/:leagueId/rosters",
  requireAuth,
  requireCommissionerOrAdmin,
  async (req, res) => {
    try {
      const leagueId = Number(req.params.leagueId);
      const rosters = await prisma.roster.findMany({
        where: {
          team: { leagueId },
          releasedAt: null,
        },
        include: {
          team: { select: { id: true, code: true, name: true } },
          player: { select: { id: true, name: true, posPrimary: true, mlbId: true } },
        },
      });
      return res.json({ rosters });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Failed to load rosters" });
    }
  }
);

/**
 * POST /api/commissioner/:leagueId/roster/import
 * Import CSV: teamCode,playerName,position,acquisitionCost
 */
router.post(
  "/commissioner/:leagueId/roster/import",
  requireAuth,
  requireCommissionerOrAdmin,
  upload.single("file"),
  async (req, res) => {
    try {
      const leagueId = Number(req.params.leagueId);
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const csvContent = req.file.buffer.toString("utf-8"); // Convert buffer to string
      
      const result = await commissionerService.importRosters(leagueId, csvContent);

      return res.json(result);
    } catch (err: any) {
       console.error(err);
      return res.status(500).json({ error: "Import failed" });
    }
  }
);


/**
 * ==========================================
 *  Period Management (Global / Season)
 * ==========================================
 */

/**
 * GET /api/commissioner/periods
 */
router.get("/commissioner/periods/list", requireAuth, async (req, res) => {
  try {
     // Allow any auth user to see periods? Or restrict? 
     // Usually public data, but editing is restricted.
     const periods = await prisma.period.findMany({ orderBy: { startDate: 'asc' } });
     return res.json({ periods });
  } catch(e: any) {
    return res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/commissioner/periods
 * Create or Update Period
 */
router.post("/commissioner/periods", requireAuth, async (req, res) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ error: "Admin only" });

    const id = Number(req.body.id);
    const name = normStr(req.body.name);
    const start = req.body.startDate ? new Date(req.body.startDate) : null;
    const end = req.body.endDate ? new Date(req.body.endDate) : null;
    const status = normStr(req.body.status) || "upcoming";

    if (!name || !start || !end) return res.status(400).json({ error: "Missing fields" });

    let period;
    if (id && Number.isFinite(id)) {
      period = await prisma.period.update({
        where: { id },
        data: { name, startDate: start, endDate: end, status },
      });
    } else {
      period = await prisma.period.create({
         data: { name, startDate: start, endDate: end, status }
      });
    }
    return res.json({ period });
  } catch(e: any) {
    return res.status(500).json({ error: e.message });
  }
});

/**
 * DELETE /api/commissioner/periods/:id
 */
router.delete("/commissioner/periods/:id", requireAuth, async (req, res) => {
   try {
     if (!req.user?.isAdmin) return res.status(403).json({ error: "Admin only" });
     const id = Number(req.params.id);
     await prisma.period.delete({ where: { id } });
     return res.json({ success: true });
   } catch(e: any) {
     return res.status(500).json({ error: e.message });
   }
});

/**
 * ==========================================
 *  League Rules (Auction Settings, etc.)
 * ==========================================
 */

router.get("/commissioner/:leagueId/rules", requireAuth, requireCommissionerOrAdmin, async (req, res) => {
    try {
        const leagueId = Number(req.params.leagueId);
        const rules = await prisma.leagueRule.findMany({ where: { leagueId } });
        return res.json({ rules });
    } catch(e: any) {
        return res.status(500).json({ error: e.message });
    }
});

router.post("/commissioner/:leagueId/rules", requireAuth, requireCommissionerOrAdmin, async (req, res) => {
    try {
        const leagueId = Number(req.params.leagueId);
        const { category, key, value, label } = req.body;
        
        const rule = await prisma.leagueRule.upsert({
            where: { leagueId_category_key: { leagueId, category, key } },
            create: { leagueId, category, key, value, label: label || key },
            update: { value, label: label || undefined }
        });
        return res.json({ rule });
    } catch(e: any) {
        return res.status(500).json({ error: e.message });
    }
});

/**
 * ==========================================
 *  Auction Controls
 * ==========================================
 */

/**
 * POST /api/commissioner/:leagueId/end-auction
 * Finalizes auction:
 * 1. Checks if rosters are full (warns if not?)
 * 2. Creates initial RosterEntry snapshot for "Start of Season"
 * 3. Updates League status (if we had one) or Rule?
 */
router.post("/commissioner/:leagueId/end-auction", requireAuth, requireCommissionerOrAdmin, async (req, res) => {
    try {
        const leagueId = Number(req.params.leagueId);
        
        // snapshot rosters
        const activeRosters = await prisma.roster.findMany({
            where: { team: { leagueId }, releasedAt: null },
            include: { team: true, player: true }
        });

        // Create RosterEntry records for archive/period 1 start
        let count = 0;
        for (const r of activeRosters) {
             // Basic idempotency check? or just append?
             // Since RosterEntry is historical/logging, appending is safer than missing data.
             await prisma.rosterEntry.create({
                 data: {
                     year: 2025, // TODO: fetch from League.season
                     teamCode: r.team.code || r.team.name.substring(0,3).toUpperCase(),
                     playerName: r.player.name,
                     position: r.player.posPrimary,
                     mlbTeam: null, // could fetch if we had it easily
                     acquisitionCost: r.price
                 }
             });
             count++;
        }

        // Set a flag that auction is done?
        // We'll use a LeagueRule for this state
        await prisma.leagueRule.upsert({
            where: { leagueId_category_key: { leagueId, category: "status", key: "auction_complete" } },
            create: { leagueId, category: "status", key: "auction_complete", value: "true", label: "Auction Complete" },
            update: { value: "true" }
        });

        return res.json({ success: true, snapshotted: count });
    } catch(e: any) {
        console.error(e);
        return res.status(500).json({ error: e.message });
    }
});

export const commissionerRouter = router;
export default commissionerRouter;

