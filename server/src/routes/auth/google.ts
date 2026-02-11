import { Router } from "express";
import { GoogleHandler } from "../../auth/google/handler.js";
import { AuthService } from "../../auth/shared/auth-service.js";
import { setSessionCookie } from "../../auth/shared/session.js";
import { GoogleConfig } from "../../auth/google/config.js";

const router = Router();
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// GET /api/auth/google
router.get("/", (req, res) => {
  try {
    const url = GoogleHandler.getAuthUrl();
    res.redirect(url);
  } catch (err: any) {
    console.error("Google Auth Error:", err);
    res.status(500).send("Google Auth Configuration Error");
  }
});

// GET /api/auth/google/callback
router.get("/callback", async (req, res) => {
  try {
    const code = String(req.query.code || "");
    if (!code) throw new Error("Missing code from Google");

    const profile = await GoogleHandler.verifyCode(code);
    const user = await AuthService.loginOrRegisterProvider(profile);
    
    setSessionCookie(res, user.id);
    res.redirect(CLIENT_URL);
  } catch (err: any) {
    console.error("Google Callback Error:", err);
    res.redirect(`${CLIENT_URL}/login?error=auth_failed`);
  }
});

// GET /api/auth/google/check (Dev Diagnostic)
if (process.env.NODE_ENV === "development") {
  router.get("/check", (req, res) => {
    try {
      return res.json({
        status: "diagnostic",
        provider: "Google",
        config: {
            clientId: GoogleConfig.clientId ? "PRESENT" : "MISSING",
            hasSecret: !!GoogleConfig.clientSecret,
            redirectUri: GoogleConfig.redirectUri,
        },
        instruction: "Ensure redirectUri matches Google Console.",
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });
}

export const googleRouter = router;
