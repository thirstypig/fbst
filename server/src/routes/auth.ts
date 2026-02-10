// server/src/routes/auth.ts
import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { clearSessionCookie, setSessionCookie } from "../middleware/auth.js";
import { OAuth2Client } from "google-auth-library";

const router = Router();

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in server/.env`);
  return v;
}

const GOOGLE_CLIENT_ID = () => mustEnv("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = () => mustEnv("GOOGLE_CLIENT_SECRET");
const YAHOO_CLIENT_ID = () => mustEnv("YAHOO_CLIENT_ID");
const YAHOO_CLIENT_SECRET = () => mustEnv("YAHOO_CLIENT_SECRET");
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

function getRedirectUri(req: any): string {
  // 1. Explicit environment variable (Production/Render)
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  
  // 2. Local Development (Deterministic)
  // We want the client-side proxy URL (port 5173) for OAuth callbacks
  // to ensure cookies are set on the correct domain.
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:5173/api/auth/google/callback";
  }

  // 3. Fallback to current host
  const protocol = req.protocol === "https" ? "https" : "http";
  const host = req.get("host");
  return `${protocol}://${host}/api/auth/google/callback`;
}

function oauthClient(redirectUri: string): OAuth2Client {
  return new OAuth2Client({
    clientId: GOOGLE_CLIENT_ID(),
    clientSecret: GOOGLE_CLIENT_SECRET(),
    redirectUri,
  });
}

function adminEmailSet(): Set<string> {
  return new Set(
    String(process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

function allowedEmailSet(): Set<string> {
  const env = process.env.ALLOWED_EMAILS;
  if (!env) return new Set();
  return new Set(
    env
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isEmailAllowed(email: string): boolean {
  const set = allowedEmailSet();
  if (set.size === 0) return true; // Default to all if not configured
  return set.has(email.toLowerCase());
}

/**
 * Deterministic: your schema is `model User`, so delegate must be `prisma.user`.
 */
function userDelegate() {
  const p: any = prisma as any;
  if (p?.user) return p.user;

  const keys = Object.keys(p).filter((k) => typeof (p as any)[k]?.findUnique === "function");
  throw new Error(
    `Prisma Client has no user delegate. Check prisma/schema.prisma model name. ` +
      `Client delegates found: ${keys.join(", ")}`
  );
}

/**
 * Sanitize what we return to the client.
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
              }
            : undefined,
        }))
      : [],
  };
}

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
            league: {
              select: { id: true, name: true, season: true },
            },
          },
        },
      },
    });

    return res.json({ user: toClientUser(full) });
  } catch (err: any) {
    console.error("GET /auth/me error:", err);
    return res.status(500).json({ error: "Auth check failed" });
  }
});

/**
 * Diagnostic route for debugging Auth configuration.
 */
// --- Yahoo Auth ---

function getYahooRedirectUri(req: any): string {
  if (process.env.YAHOO_REDIRECT_URI) return process.env.YAHOO_REDIRECT_URI;
  if (process.env.NODE_ENV === "development") {
    return "https://localhost:4000/api/auth/yahoo/callback";
  }
  const protocol = req.protocol === "https" ? "https" : "http";
  const host = req.get("host");
  return `${protocol}://${host}/api/auth/yahoo/callback`;
}

router.get("/yahoo/test", (req, res) => res.send("Yahoo route registered"));

router.get("/yahoo", (req, res) => {
  try {
    const redirectUri = getYahooRedirectUri(req);
    console.log(`[AUTH] Initiating Yahoo Login. Redirect URI: ${redirectUri}`);
    const params = new URLSearchParams({
      client_id: YAHOO_CLIENT_ID(),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
    });
    return res.redirect(`https://api.login.yahoo.com/oauth2/request_auth?${params.toString()}`);
  } catch (err: any) {
    console.error("Error generating Yahoo Auth URL:", err);
    return res.status(500).send("Auth configuration error");
  }
});

router.get("/yahoo/callback", async (req, res) => {
  const redirectUri = getYahooRedirectUri(req);
  try {
    const code = String(req.query.code || "").trim();
    if (!code) return res.status(400).send("Missing code");

    const { getYahooToken, verifyYahooIdToken } = await import("../auth/yahoo.js");
    const tokens = await getYahooToken(code, redirectUri);
    const yahooUser = await verifyYahooIdToken((tokens as any).id_token);

    const email = yahooUser.email.toLowerCase();

    if (!isEmailAllowed(email)) {
      console.warn(`[AUTH] Yahoo login denied: ${email} not in allowlist`);
      return res.redirect(`${CLIENT_URL}/login?error=not_approved`);
    }

    const yahooSub = yahooUser.yahooSub;
    const name = yahooUser.name || null;
    const avatarUrl = yahooUser.avatarUrl || null;
    const isAdmin = adminEmailSet().has(email);

    const User = userDelegate();
    let user = await User.findUnique({ where: { yahooSub } });

    if (!user) {
      const byEmail = await User.findUnique({ where: { email } });
      if (byEmail) {
        user = await User.update({
          where: { id: byEmail.id },
          data: { yahooSub, name, avatarUrl, isAdmin },
        });
      } else {
        user = await User.create({
          data: { email, yahooSub, name, avatarUrl, isAdmin },
        });
      }
    } else {
      user = await User.update({
        where: { id: user.id },
        data: { email, name, avatarUrl, isAdmin },
      });
    }

    setSessionCookie(res, user.id);
    return res.redirect(CLIENT_URL);
  } catch (err: any) {
    console.error("Yahoo callback error:", err);
    return res.status(500).send("Authentication failed");
  }
});

router.get("/google/check", (req, res) => {
  try {
    const redirectUri = getRedirectUri(req);
    const clientId = process.env.GOOGLE_CLIENT_ID || "MISSING";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET ? "PRESENT (Masked)" : "MISSING";
    
    return res.json({
      status: "diagnostic",
      instruction: "Ensure the 'Computed Redirect URI' below is added to Google Cloud Console.",
      env: process.env.NODE_ENV,
      computedRedirectUri: redirectUri,
      clientId: clientId.length > 10 ? `${clientId.substring(0, 10)}...` : clientId,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      clientUrl: process.env.CLIENT_URL || "http://localhost:5173"
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/google", (req, res) => {
  try {
    const redirectUri = getRedirectUri(req);
    console.log(`[AUTH] Generating Google Auth URL. Redirecting through: ${redirectUri}`);
    
    const client = oauthClient(redirectUri);
    const url = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["openid", "email", "profile"],
    });
    return res.redirect(url);
  } catch (err: any) {
    console.error("Error generating Google Auth URL:", err);
    return res.status(500).send("Auth configuration error");
  }
});

router.get("/google/callback", async (req, res) => {
  const redirectUri = getRedirectUri(req);
  console.log(`[AUTH] Callback received. Exchanging code using Redirect URI: ${redirectUri}`);
  
  try {
    const code = String(req.query.code || "").trim();
    if (!code) return res.status(400).send("Missing code");

    const client = oauthClient(redirectUri);
    const { tokens } = await client.getToken(code);
    const idToken = tokens.id_token;

    if (!idToken) return res.status(400).send("No ID Token");

    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID(),
    });

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload?.email) return res.status(400).send("Invalid payload");

    const email = payload.email.toLowerCase();

    if (!isEmailAllowed(email)) {
      console.warn(`[AUTH] Google login denied: ${email} not in allowlist`);
      return res.redirect(`${CLIENT_URL}/login?error=not_approved`);
    }

    const googleSub = payload.sub;
    const name = payload.name || null;
    const avatarUrl = payload.picture || null;
    const isAdmin = adminEmailSet().has(email);

    const User = userDelegate();
    let user = await User.findUnique({ where: { googleSub } });

    if (!user) {
      // Try linking by email if user exists without googleSub
      const byEmail = await User.findUnique({ where: { email } });
      if (byEmail) {
        user = await User.update({
          where: { id: byEmail.id },
          data: { googleSub, name, avatarUrl, isAdmin },
        });
      } else {
        user = await User.create({
          data: { email, googleSub, name, avatarUrl, isAdmin },
        });
      }
    } else {
      user = await User.update({
        where: { id: user.id },
        data: { email, name, avatarUrl, isAdmin },
      });
    }

    setSessionCookie(res, user.id);
    return res.redirect(CLIENT_URL);
  } catch (err: any) {
    console.error("Google callback error:", err);
    return res.status(500).send("Authentication failed");
  }
});


// --- Email/Password Auth ---

router.post("/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const emailLower = email.toLowerCase();
    const User = userDelegate();
    const existing = await User.findUnique({ where: { email: emailLower } });
    if (existing) return res.status(400).json({ error: "Email already in use" });

    // Use simple hash for now if bcrypt is missing, but try to use it if available
    let passwordHash = password;
    try {
      const bcrypt = await import("bcryptjs");
      passwordHash = await bcrypt.default.hash(password, 10);
    } catch {
      console.warn("bcryptjs not found, storing password as-is (DEBUG ONLY)");
    }

    const isAdmin = adminEmailSet().has(emailLower);
    const user = await User.create({
      data: { email: emailLower, passwordHash, name, isAdmin },
    });

    setSessionCookie(res, user.id);
    return res.json({ user: toClientUser(user) });
  } catch (err: any) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Signup failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const emailLower = email.toLowerCase();
    const User = userDelegate();
    const user = await User.findUnique({ where: { email: emailLower } });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    let isValid = false;
    try {
      const bcrypt = await import("bcryptjs");
      isValid = await bcrypt.default.compare(password, user.passwordHash);
    } catch {
      isValid = password === user.passwordHash;
    }

    if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

    setSessionCookie(res, user.id);
    return res.json({ user: toClientUser(user) });
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

// --- Password Reset ---

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    const emailLower = email.toLowerCase();
    const User = userDelegate();
    const user = await User.findUnique({ where: { email: emailLower } });

    if (!user) {
      // Don't leak user existence
      return res.json({ ok: true, message: "Check your email for reset instructions" });
    }

    const crypto = await import("crypto");
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    await User.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpires },
    });

    const resetLink = `${CLIENT_URL}/reset-password?token=${resetToken}`;
    console.log(`[AUTH] Password reset requested for ${emailLower}. Link: ${resetLink}`);

    return res.json({ ok: true, message: "Check your email for reset instructions" });
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ error: "Request failed" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: "Token and password required" });

    const User = userDelegate();
    const user = await User.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: { gt: new Date() },
      },
    });

    if (!user) return res.status(400).json({ error: "Invalid or expired token" });

    let passwordHash = password;
    try {
      const bcrypt = await import("bcryptjs");
      passwordHash = await bcrypt.default.hash(password, 10);
    } catch {
      console.warn("bcryptjs not found, storing password as-is (DEBUG ONLY)");
    }

    await User.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return res.json({ ok: true });
  } catch (err: any) {
    console.error("Reset password error:", err);
    return res.status(500).json({ error: "Reset failed" });
  }
});

router.get("/dev-login", async (req, res) => {
  if (process.env.NODE_ENV !== "development") {
    return res.status(403).send("Developer login only available in development mode.");
  }

  try {
    const email = (process.env.ADMIN_EMAILS || "dev@fbst.app").split(",")[0].trim().toLowerCase();
    const name = "Dev User";
    const googleSub = "dev_bypass_id_123";
    const avatarUrl = null;
    const isAdmin = true;

    const User = userDelegate();

    let user = await User.findUnique({ where: { googleSub } });

    if (!user) {
      const byEmail = await User.findUnique({ where: { email } });
      if (byEmail) {
        user = await User.update({
          where: { id: byEmail.id },
          data: { googleSub, name, avatarUrl, isAdmin },
        });
      } else {
        user = await User.create({
          data: { email, googleSub, name, avatarUrl, isAdmin },
        });
      }
    } else {
      user = await User.update({
        where: { id: user.id },
        data: { email, name, avatarUrl, isAdmin },
      });
    }

    setSessionCookie(res, user.id);
    console.log(`[AUTH] Developer login successful for ${email}`);
    return res.redirect(CLIENT_URL);
  } catch (err: any) {
    console.error("Dev login error:", err);
    return res.status(500).json({ error: err?.message || "Dev login error", stack: err?.stack });
  }
});

router.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

export const authRouter = router;
export default authRouter;
