// server/src/middleware/auth.ts
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma";

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

export function setSessionCookie(res: Response, userId: number) {
  const token = jwt.sign({ userId } satisfies SessionTokenPayload, getJwtSecret(), {
    expiresIn: "30d",
  });

  const isProd = process.env.NODE_ENV === "production";

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

function readToken(req: Request): string | null {
  const t = (req as any)?.cookies?.[COOKIE_NAME];
  return typeof t === "string" && t.trim() ? t.trim() : null;
}

export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = readToken(req);
    if (!token) {
      req.user = null;
      return next();
    }

    const payload = jwt.verify(token, getJwtSecret()) as SessionTokenPayload;
    const userId = Number(payload?.userId);
    if (!Number.isFinite(userId)) {
      req.user = null;
      return next();
    }

    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, avatarUrl: true, isAdmin: true },
    });

    req.user = u ?? null;
    return next();
  } catch {
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

export function parseIntParam(v: any): number | null {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : null;
}
