// server/src/middleware/auth.ts
import type { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma.js";
const COOKIE_NAME = "fbst_session";

export type SessionTokenPayload = {
  userId: number;
};

export type AuthedUser = {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
};

type LeagueRole = "COMMISSIONER" | "OWNER" | "VIEWER";

declare global {
  namespace Express {
    interface Request {
      user?: AuthedUser | null;
    }
  }
}

function getJwtSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("Missing SESSION_SECRET in server/.env");
  return s;
}

import { supabaseAdmin } from "../lib/supabase.js";

// ... (keep types)

export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      req.user = null;
      return next();
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      req.user = null;
      return next();
    }

    const { data: { user: sbUser }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !sbUser || !sbUser.email) {
      req.user = null;
      return next();
    }

    // Link by email
    let u = await prisma.user.findUnique({
      where: { email: sbUser.email },
      select: { id: true, email: true, name: true, avatarUrl: true, isAdmin: true },
    });

    if (!u) {
      // Auto-create user from Supabase identity
      const metadata = sbUser.user_metadata || {};
      const name = metadata.name || metadata.full_name || sbUser.email?.split("@")[0] || "New User";
      const avatarUrl = metadata.avatar_url || metadata.picture || null;
      
      const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
      const isAdmin = sbUser.email ? adminEmails.includes(sbUser.email.toLowerCase()) : false;

      try {
        u = await prisma.user.create({
          data: {
            email: sbUser.email,
            name,
            avatarUrl,
            isAdmin, // Auto-admin if in env list
          },
          select: { id: true, email: true, name: true, avatarUrl: true, isAdmin: true },
        });
      } catch (e) {
        // Race condition: user created by another request?
        u = await prisma.user.findUnique({
          where: { email: sbUser.email },
          select: { id: true, email: true, name: true, avatarUrl: true, isAdmin: true },
        });
      }
    }

    req.user = u ?? null;
    return next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    req.user = null;
    return next();
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  return next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  if (!req.user.isAdmin) return res.status(403).json({ error: "Admin only" });
  return next();
}

function normalizeRole(r: LeagueRole): number {
  if (r === "COMMISSIONER") return 3;
  if (r === "OWNER") return 2;
  return 1; // VIEWER
}

export async function requireLeagueRole(
  leagueId: number,
  minRole: LeagueRole,
  req: Request,
  res: Response
): Promise<boolean> {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }

  if (req.user.isAdmin) return true;

  const m = await prisma.leagueMembership.findUnique({
    where: { leagueId_userId: { leagueId, userId: req.user.id } },
    select: { role: true },
  });

  if (!m) {
    res.status(403).json({ error: "No access to this league" });
    return false;
  }

  const role = String(m.role) as LeagueRole;

  if (normalizeRole(role) < normalizeRole(minRole)) {
    res.status(403).json({ error: `Requires ${minRole} role` });
    return false;
  }

  return true;
}

/**
 * Middleware factory: requires the user to be a COMMISSIONER of the league
 * (identified by `leagueIdParam` in req.params) or a site admin.
 * Must be placed after `requireAuth` in the middleware chain.
 */
export function requireCommissionerOrAdmin(leagueIdParam = "leagueId"): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const leagueId = Number(req.params[leagueIdParam]);
    if (!Number.isFinite(leagueId)) {
      return res.status(400).json({ error: "Invalid leagueId" });
    }

    if (req.user!.isAdmin) return next();

    const m = await prisma.leagueMembership.findUnique({
      where: { leagueId_userId: { leagueId, userId: req.user!.id } },
      select: { role: true },
    });

    if (!m || m.role !== "COMMISSIONER") {
      return res.status(403).json({ error: "Commissioner only" });
    }

    return next();
  };
}

export function parseIntParam(v: string | number | null | undefined): number | null {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : null;
}
