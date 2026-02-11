import { Router } from "express";
import { YahooHandler } from "../../auth/yahoo/handler.js";
import { AuthService } from "../../auth/shared/auth-service.js";
import { setSessionCookie } from "../../auth/shared/session.js";
import { YahooConfig } from "../../auth/yahoo/config.js";

const router = Router();
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// GET /api/auth/yahoo
router.get("/", (req, res) => {
  try {
    const url = YahooHandler.getAuthUrl();
    res.redirect(url);
  } catch (err: any) {
    console.error("[AUTH] Yahoo Auth Error:", err);
    res.status(500).send("Yahoo Auth Configuration Error");
  }
});

// GET /api/auth/yahoo/callback
router.get("/callback", async (req, res) => {
  try {
    const code = String(req.query.code || "");
    if (!code) throw new Error("Missing code from Yahoo");

    const profile = await YahooHandler.verifyCode(code);
    const user = await AuthService.loginOrRegisterProvider(profile);

    setSessionCookie(res, user.id);
    res.redirect(CLIENT_URL);
  } catch (err: any) {
    console.error("Yahoo Callback Error:", err);
    res.redirect(`${CLIENT_URL}/login?error=auth_failed`);
  }
});

// GET /api/auth/yahoo/check (Dev Diagnostic)
if (process.env.NODE_ENV === "development") {
  router.get("/check", (req, res) => {
    try {
      return res.json({
        status: "diagnostic",
        provider: "Yahoo",
        config: {
            clientId: YahooConfig.clientId ? "PRESENT" : "MISSING",
            hasSecret: !!YahooConfig.clientSecret,
            redirectUri: YahooConfig.redirectUri,
        },
        instruction: "Ensure redirectUri matches Yahoo Console.",
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });
}

export const yahooRouter = router;
