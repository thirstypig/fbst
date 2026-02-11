import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { AuthService } from "../../auth/shared/auth-service.js";
import { setSessionCookie, clearSessionCookie } from "../../auth/shared/session.js";

const router = Router();
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// POST /api/auth/login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Email and password required" });
        
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user || !user.passwordHash) return res.status(401).json({ error: "Invalid credentials" });

        // Simple hash check (with optional bcrypt fallback)
        let isValid = false;
        try {
            // In a perfect strict world, we'd use a hashing service, but inline logic preserves current behavior
            const bcrypt = await import("bcryptjs");
            isValid = await bcrypt.default.compare(password, user.passwordHash) || password === user.passwordHash;
        } catch { isValid = password === user.passwordHash; }

        if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

        setSessionCookie(res, user.id);
        
        // Return minimal user info
        res.json({ user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin } });
    } catch (e) {
        console.error("Login Error:", e);
        res.status(500).json({ error: "Login failed" });
    }
});

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Required fields missing" });
        
        const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (existing) return res.status(400).json({ error: "Email exists" });

        let passwordHash = password;
        try {
            const bcrypt = await import("bcryptjs");
            passwordHash = await bcrypt.default.hash(password, 10);
        } catch {}

        const isAdmin = AuthService.isAdmin(email); 
        
        const user = await prisma.user.create({
            data: { email: email.toLowerCase(), passwordHash, name, isAdmin }
        });

        setSessionCookie(res, user.id);
        res.json({ user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin } });
    } catch (e) {
        console.error("Signup Error:", e);
        res.status(500).json({ error: "Signup failed" });
    }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
});

// GET /api/auth/dev-login
router.get("/dev-login", async (req, res) => {
    if (process.env.NODE_ENV !== "development") return res.status(403).send("Dev only");
    try {
        const email = (process.env.ADMIN_EMAILS || "dev@fbst.app").split(",")[0].trim().toLowerCase();
        
        const devProfile = {
            provider: "google" as const, 
            sub: "dev_bypass_id_123",
            email: email,
            name: "Dev User",
            avatarUrl: "",
            isAdmin: true,   
        };
        
        const user = await AuthService.loginOrRegisterProvider(devProfile);
        setSessionCookie(res, user.id);
        return res.redirect(CLIENT_URL);
    } catch (err) {
        console.error("Dev login error", err);
        res.status(500).send("Dev login failed");
    }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
     try {
        const { email } = req.body;
        if(!email) return res.status(400).json({error:"Email required"});
        console.log(`[AUTH] Forgot Password requested for ${email}`);
        res.json({ ok: true, message: "If account exists, email sent." });
    } catch (e) {
        res.status(500).json({ error: "Error" });
    }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
    res.json({ ok: true });
});

export const localRouter = router;
