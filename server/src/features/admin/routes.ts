// server/src/routes/admin.ts
import { Router } from "express";
import express from "express";
import { prisma } from "../../db/prisma.js";

const router = Router();

/**
 * Assumes your existing auth middleware sets (req as any).user when cookie is valid.
 */
function requireAuth(req: any, res: any, next: any) {
  if (!req.user?.id) return res.status(401).json({ error: "Not authenticated" });
  next();
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.user?.isAdmin) return res.status(403).json({ error: "Admin only" });
  next();
}

function normStr(v: any) {
  return String(v ?? "").trim();
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mustOneOf(v: string, allowed: string[], name: string) {
  if (!allowed.includes(v)) throw new Error(`Invalid ${name}. Allowed: ${allowed.join(", ")}`);
  return v;
}

/**
 * POST /api/admin/league
 * Body:
 * {
 *   name: string,
 *   season: number,
 *   draftMode: "AUCTION" | "DRAFT",
 *   draftOrder?: "SNAKE" | "LINEAR",
 *   isPublic?: boolean,
 *   publicSlug?: string
 * }
 */
router.post("/admin/league", requireAuth, requireAdmin, async (req, res) => {
  try {
    const name = normStr(req.body?.name);
    const season = Number(req.body?.season);

    const draftMode = mustOneOf(normStr(req.body?.draftMode || "AUCTION"), ["AUCTION", "DRAFT"], "draftMode") as
      | "AUCTION"
      | "DRAFT";

    const draftOrderRaw = normStr(req.body?.draftOrder || "");
    const draftOrder =
      draftMode === "DRAFT"
        ? (mustOneOf(draftOrderRaw || "SNAKE", ["SNAKE", "LINEAR"], "draftOrder") as "SNAKE" | "LINEAR")
        : null;

    const isPublic = Boolean(req.body?.isPublic ?? false);

    const publicSlugInput = normStr(req.body?.publicSlug || "");
    const baseSlug = slugify(publicSlugInput || `${name}-${season}`);
    const publicSlug = isPublic ? baseSlug : null;

    if (!name) return res.status(400).json({ error: "Missing name" });
    if (!Number.isFinite(season) || season < 1900 || season > 2100) {
      return res.status(400).json({ error: "Invalid season" });
    }

    const league = await prisma.league.create({
      data: {
        name,
        season,
        draftMode,
        draftOrder: draftOrder ?? undefined,
        isPublic,
        publicSlug: publicSlug ?? undefined,
      },
    });

    // (Optional but recommended) auto-add creator as COMMISSIONER for this league
    await prisma.leagueMembership.upsert({
      where: {
        leagueId_userId: { leagueId: league.id, userId: req.user!.id },
      },
      create: {
        leagueId: league.id,
        userId: req.user!.id,
        role: "COMMISSIONER",
      },
      update: {
        role: "COMMISSIONER",
      },
    });

    // Handle Season Renewal (Copy Teams, Members, Rules)
    const copyFromLeagueId = Number(req.body?.copyFromLeagueId);
    if (Number.isFinite(copyFromLeagueId) && copyFromLeagueId > 0) {
        console.log(`Copying league data from ${copyFromLeagueId} to ${league.id}`);
        
        // 1. Copy Teams
        const sourceTeams = await prisma.team.findMany({ where: { leagueId: copyFromLeagueId } });
        for (const t of sourceTeams) {
            try {
                await prisma.team.create({
                    data: {
                        leagueId: league.id,
                        name: t.name,
                        code: t.code,
                        owner: t.owner,
                        ownerUserId: t.ownerUserId,
                        budget: t.budget
                    }
                });
            } catch (e) { console.warn("Failed to copy team", t.name, e); }
        }

        // 2. Copy Memberships
        const sourceMembers = await prisma.leagueMembership.findMany({ where: { leagueId: copyFromLeagueId } });
        for (const m of sourceMembers) {
            if (m.userId === req.user!.id) continue; // Already added
            try {
                await prisma.leagueMembership.create({
                    data: {
                        leagueId: league.id,
                        userId: m.userId,
                        role: m.role
                    }
                });
            } catch (e) { console.warn("Failed to copy member", m.userId, e); }
        }

        // 3. Copy Rules
        const sourceRules = await prisma.leagueRule.findMany({ where: { leagueId: copyFromLeagueId } });
        if (sourceRules.length > 0) {
            await prisma.leagueRule.createMany({
                data: sourceRules.map(r => ({
                    leagueId: league.id,
                    category: r.category,
                    key: r.key,
                    value: r.value,
                    label: r.label,
                    isLocked: false
                }))
            });
        }
    }

    return res.json({ league });
  } catch (err: any) {
    // Handle unique constraint collisions cleanly
    const msg = String(err?.message || "Create league failed");
    return res.status(400).json({ error: msg });
  }
});

/**
 * POST /api/admin/league/:leagueId/members
 * Body:
 * { userId?: number, email?: string, role: "COMMISSIONER" | "OWNER" | "VIEWER" }
 *
 * IMPORTANT constraint:
 * You can only add users who have logged in at least once,
 * because User.googleSub is required (can’t pre-create accounts without Google Sub).
 */
router.post("/admin/league/:leagueId/members", requireAuth, requireAdmin, async (req, res) => {
  try {
    const leagueId = Number(req.params.leagueId);
    if (!Number.isFinite(leagueId)) return res.status(400).json({ error: "Invalid leagueId" });

    const role = mustOneOf(normStr(req.body?.role), ["COMMISSIONER", "OWNER", "VIEWER"], "role") as
      | "COMMISSIONER"
      | "OWNER"
      | "VIEWER";

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

    // Ensure league exists
    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    if (!league) return res.status(404).json({ error: "League not found" });

    const membership = await prisma.leagueMembership.upsert({
      where: {
        leagueId_userId: { leagueId, userId },
      },
      create: {
        leagueId,
        userId,
        role,
      },
      update: {
        role,
      },
    });

    return res.json({ membership });
  } catch (err: any) {
    return res.status(400).json({ error: String(err?.message || "Add member failed") });
  }
});

// Import the service
import { CommissionerService } from "../commissioner/services/CommissionerService.js";
const commissionerService = new CommissionerService();

/**
 * POST /api/admin/league
 * Body:
 * {
 *   name: string,
 *   season: number,
 *   draftMode: "AUCTION" | "DRAFT",
 *   draftOrder?: "SNAKE" | "LINEAR",
 *   isPublic?: boolean,
 *   publicSlug?: string,
 *   copyFromLeagueId?: number
 * }
 */
router.post("/admin/league", requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = {
        name: normStr(req.body?.name),
        season: Number(req.body?.season),
        draftMode: mustOneOf(normStr(req.body?.draftMode || "AUCTION"), ["AUCTION", "DRAFT"], "draftMode") as "AUCTION" | "DRAFT",
        draftOrder: req.body?.draftMode === "DRAFT" ? (mustOneOf(normStr(req.body?.draftOrder || "SNAKE"), ["SNAKE", "LINEAR"], "draftOrder") as "SNAKE" | "LINEAR") : undefined,
        isPublic: Boolean(req.body?.isPublic ?? false),
        publicSlug: normStr(req.body?.publicSlug || ""),
        copyFromLeagueId: Number.isFinite(Number(req.body?.copyFromLeagueId)) ? Number(req.body?.copyFromLeagueId) : undefined,
        creatorUserId: (req.user as any).id
    };

    if (!data.name) return res.status(400).json({ error: "Missing name" });
    if (!Number.isFinite(data.season) || data.season < 1900 || data.season > 2100) {
      return res.status(400).json({ error: "Invalid season" });
    }

    const league = await commissionerService.createLeague(data);
    return res.json({ league });
  } catch (err: any) {
    const msg = String(err?.message || "Create league failed");
    return res.status(400).json({ error: msg });
  }
});

/**
 * POST /api/admin/league/:leagueId/members
 * Body:
 * { userId?: number, email?: string, role: "COMMISSIONER" | "OWNER" | "VIEWER" }
 */
router.post("/admin/league/:leagueId/members", requireAuth, requireAdmin, async (req, res) => {
  try {
    const leagueId = Number(req.params.leagueId);
    if (!Number.isFinite(leagueId)) return res.status(400).json({ error: "Invalid leagueId" });

    const role = mustOneOf(normStr(req.body?.role), ["COMMISSIONER", "OWNER", "VIEWER"], "role") as
      | "COMMISSIONER"
      | "OWNER"
      | "VIEWER";

    const membership = await commissionerService.addMember(leagueId, {
        userId: req.body?.userId ? Number(req.body.userId) : undefined,
        email: req.body?.email,
        role
    });

    return res.json({ membership });
  } catch (err: any) {
    return res.status(400).json({ error: String(err?.message || "Add member failed") });
  }
});

/**
 * POST /api/admin/league/:leagueId/import-rosters
 * Body: Raw CSV text or multipart (simpler: pure text/csv body for now)
 */
router.post("/admin/league/:leagueId/import-rosters", requireAuth, requireAdmin, express.text({ type: ["text/csv", "text/plain"] }), async (req, res) => {
  try {
    const leagueId = Number(req.params.leagueId);
    if (!Number.isFinite(leagueId)) return res.status(400).json({ error: "Invalid leagueId" });

    // Expect raw body for simplicity
    const csvContent = typeof req.body === "string" ? req.body : "";
    if (!csvContent) return res.status(400).json({ error: "Missing CSV body" });

    const result = await commissionerService.importRosters(leagueId, csvContent);
    
    return res.json(result);
  } catch (err: any) {
    console.error("Import failed:", err);
    return res.status(500).json({ error: String(err?.message || "Import failed") });
  }
});

export const adminRouter = router;
export default adminRouter;
