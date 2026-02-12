import { Router } from "express";
import { prisma } from "../../db/prisma.js";

const router = Router();

// Global Auth Health Check
router.get("/health", (req, res) => {
    // Supabase auth is handled via middleware/external service
    // We can check if SUPABASE_URL is set
    const status = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) ? "ok" : "degraded";

    res.json({ 
        status,
        provider: "supabase",
        env: process.env.NODE_ENV
    });
});

// GET /api/auth/me (User Session)
router.get("/me", async (req, res) => {
  try {
    const sessionUser = (req as any).user ?? null;
    const userId = sessionUser?.id ?? null;

    if (!userId) return res.json({ user: null });

    const full = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          select: {
            leagueId: true,
            role: true,
            league: { select: { id: true, name: true, season: true } },
          },
        },
      },
    });

    if (!full) return res.json({ user: null });

    const user = {
      id: full.id,
      email: full.email,
      name: full.name,
      avatarUrl: full.avatarUrl,
      isAdmin: full.isAdmin,
      memberships: full.memberships.map((m: any) => ({
        leagueId: m.leagueId,
        role: m.role,
        league: m.league ? { id: m.league.id, name: m.league.name, season: m.league.season } : undefined,
      })),
    };

    return res.json({ user });
  } catch (err: any) {
    console.error("GET /auth/me error:", err);
    return res.status(500).json({ error: "Auth check failed" });
  }
});

export const authRouter = router;
