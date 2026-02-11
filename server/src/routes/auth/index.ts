import { Router } from "express";
import { googleRouter } from "./google.js";
import { yahooRouter } from "./yahoo.js";
import { localRouter } from "./local.js";
import { GoogleConfig } from "../../auth/google/config.js";
import { YahooConfig } from "../../auth/yahoo/config.js";
import { prisma } from "../../db/prisma.js";

const router = Router();

// Mount strategies
router.use("/google", googleRouter);
router.use("/yahoo", yahooRouter);
router.use("/", localRouter); 

// Global Auth Health Check
router.get("/health", (req, res) => {
    const googleOk = !!(GoogleConfig.clientId && GoogleConfig.clientSecret && GoogleConfig.redirectUri);
    const yahooOk = !!(YahooConfig.clientId && YahooConfig.clientSecret && YahooConfig.redirectUri);

    const status = (googleOk && yahooOk) ? "ok" : "degraded";

    res.json({ 
        status,
        providers: {
            google: googleOk ? "configured" : "missing_config",
            yahoo: yahooOk ? "configured" : "missing_config"
        },
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
