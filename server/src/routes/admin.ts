// server/src/routes/admin.ts
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
        leagueId_userId: { leagueId: league.id, userId: req.user.id },
      },
      create: {
        leagueId: league.id,
        userId: req.user.id,
        role: "COMMISSIONER",
      },
      update: {
        role: "COMMISSIONER",
      },
    });

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

export const adminRouter = router;
export default adminRouter;
