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

// IMPORTANT: these must be /auth/* because server mounts this router at "/api"
router.get("/auth/me", (req, res) => {
  res.json({ user: (req as any).user ?? null });
});

router.get("/auth/google", (_req, res) => {
  const client = oauthClient();
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["openid", "email", "profile"],
  });
  return res.redirect(url);
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

    // Upsert safely given unique(email) + unique(googleSub)
    let user = await prisma.user.findUnique({ where: { googleSub } });

    if (!user) {
      const byEmail = await prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: { googleSub, name, avatarUrl, isAdmin },
        });
      } else {
        user = await prisma.user.create({
          data: { email, googleSub, name, avatarUrl, isAdmin },
        });
      }
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { email, name, avatarUrl, isAdmin },
      });
    }

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

// FIX: provide the NAMED export that server/src/index.ts imports
export const authRouter = router;
// optional default export if you ever want it
export default authRouter;
