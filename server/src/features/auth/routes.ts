import { Router, Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { logger } from "../../lib/logger.js";

const router = Router();

// --- Types ---

type MembershipResponse = {
  leagueId: number;
  role: string;
  league?: { id: number; name: string; season: number };
};

type AuthMeResponse = {
  user: {
    id: number;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    isAdmin: boolean;
    memberships: MembershipResponse[];
  } | null;
};

type HealthResponse = {
  status: "ok" | "degraded";
  provider: string;
  env: string | undefined;
};

// --- Routes ---

// GET /api/auth/health - Auth health check
router.get("/health", (_req: Request, res: Response<HealthResponse>) => {
  const status = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    ? "ok" as const
    : "degraded" as const;

  res.json({
    status,
    provider: "supabase",
    env: process.env.NODE_ENV,
  });
});

// GET /api/auth/me - Current user session
router.get("/me", async (req: Request, res: Response<AuthMeResponse | { error: string }>) => {
  try {
    const userId = req.user?.id ?? null;

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
      memberships: full.memberships.map((m) => ({
        leagueId: m.leagueId,
        role: String(m.role),
        league: m.league
          ? { id: m.league.id, name: m.league.name, season: m.league.season }
          : undefined,
      })),
    };

    return res.json({ user });
  } catch (e) {
    logger.error({ err: String(e) }, "GET /auth/me failed");
    return res.status(500).json({ error: "Auth check failed" });
  }
});

export const authRouter = router;
