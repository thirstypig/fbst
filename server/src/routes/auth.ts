// server/src/routes/auth.ts
import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../db/prisma";
import { clearSessionCookie, setSessionCookie } from "../middleware/auth";

const router = Router();

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in server/.env`);
  return v;
}

const GOOGLE_CLIENT_ID = () => mustEnv("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = () => mustEnv("GOOGLE_CLIENT_SECRET");

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const SERVER_ORIGIN = process.env.SERVER_ORIGIN || "http://localhost:4000";
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || `${SERVER_ORIGIN}/api/auth/google/callback`;

function adminEmailSet(): Set<string> {
  return new Set(
    String(process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

function oauthClient(): OAuth2Client {
  return new OAuth2Client({
    clientId: GOOGLE_CLIENT_ID(),
    clientSecret: GOOGLE_CLIENT_SECRET(),
    redirectUri: GOOGLE_REDIRECT_URI,
  });
}

/**
 * Deterministic: your schema is `model User`, so delegate must be `prisma.user`.
 * If it isn’t, you want to fail loudly (this indicates schema/client mismatch).
 */
function userDelegate() {
  const p: any = prisma as any;
  if (p?.user) return p.user;

  const keys = Object.keys(p).filter((k) => typeof (p as any)[k]?.findUnique === "function");
  throw new Error(
    `Prisma Client has no user delegate. Check prisma/schema.prisma model name (e.g., "model User"). ` +
      `Client delegates found: ${keys.join(", ")}`
  );
}

/**
 * Sanitize what we return to the client.
 * (No googleSub, no internal fields, no raw session info.)
 */
function toClientUser(u: any) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    isAdmin: !!u.isAdmin,
    memberships: Array.isArray(u.memberships)
      ? u.memberships.map((m: any) => ({
          leagueId: m.leagueId,
          role: m.role,
          league: m.league
            ? {
                id: m.league.id,
                name: m.league.name,
                season: m.league.season,
                isPublic: m.league.isPublic,
                publicSlug: m.league.publicSlug,
              }
            : undefined,
        }))
      : [],
  };
}

// IMPORTANT: these must be /auth/* because server mounts this router at "/api"
router.get("/auth/me", async (req, res) => {
  try {
    // Your auth middleware sets (req as any).user when cookie is valid.
    const sessionUser = (req as any).user ?? null;
    const userId = sessionUser?.id ?? null;

    if (!userId) return res.json({ user: null });

    // Always fetch fresh from DB so roles/memberships are accurate.
    const full = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          select: {
            leagueId: true,
            role: true,
            league: {
              select: { id: true, name: true, season: true, isPublic: true, publicSlug: true },
            },
          },
        },
      },
    });

    return res.json({ user: toClientUser(full) });
  } catch (err: any) {
    console.error("GET /auth/me error:", err);
    return res.status(500).json({ error: err?.message || "Auth me error" });
  }
});

router.get("/auth/google", (_req, res) => {
  try {
    // 1. Check Config
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error("Missing Google Auth Env Vars");
      return res.status(500).send("Server Authentication Configuration is missing. Please contact administrator.");
    }

    const client = oauthClient();
    const url = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["openid", "email", "profile"],
    });
    return res.redirect(url);
  } catch (err: any) {
    console.error("Error generating Google Auth URL:", err);
    return res.status(500).send("Internal Server Error during Auth Handshake: " + (err.message || String(err)));
  }
});

router.get("/auth/google/callback", async (req, res) => {
  try {
    const code = String(req.query.code || "").trim();
    if (!code) return res.status(400).send("Missing ?code");

    const client = oauthClient();
    const { tokens } = await client.getToken(code);

    const idToken = tokens.id_token;
    if (!idToken) return res.status(400).send("Missing id_token from Google");

    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID(),
    });

    const payload = ticket.getPayload();
    if (!payload) return res.status(400).send("Missing Google payload");

    const googleSub = String(payload.sub || "").trim();
    const email = String(payload.email || "").trim().toLowerCase();
    const name = payload.name ? String(payload.name) : null;
    const avatarUrl = payload.picture ? String(payload.picture) : null;

    if (!googleSub || !email) return res.status(400).send("Google payload missing sub/email");

    const isAdmin = adminEmailSet().has(email);

    const User = userDelegate();

    // 1) Prefer lookup by googleSub (unique)
    let user = await User.findUnique({ where: { googleSub } });

    if (!user) {
      // 2) If not found, try email (unique). If found, link googleSub.
      const byEmail = await User.findUnique({ where: { email } });

      if (byEmail) {
        user = await User.update({
          where: { id: byEmail.id },
          data: { googleSub, name, avatarUrl, isAdmin },
        });
      } else {
        // 3) Otherwise create new
        user = await User.create({
          data: { email, googleSub, name, avatarUrl, isAdmin },
        });
      }
    } else {
      // 4) Existing user by googleSub: refresh fields
      user = await User.update({
        where: { id: user.id },
        data: { email, name, avatarUrl, isAdmin },
      });
    }

    // MUST happen after successful DB write
    setSessionCookie(res, user.id);

    // Return to UI
    return res.redirect(CLIENT_URL);
  } catch (err: any) {
    console.error("Google callback error:", err);
    return res.status(500).send(err?.message || "Auth error");
  }
});

router.post("/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

export const authRouter = router;
export default authRouter;
