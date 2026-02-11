import jwt from "jsonwebtoken";
import type { Response } from "express";

const COOKIE_NAME = "fbst_session";
// Fallback only for safety, but plan expects env var.
const SESSION_SECRET = process.env.SESSION_SECRET || "default_unsafe_secret_for_dev_only";

export type SessionTokenPayload = {
  uid: string;
};

export function signSessionToken(payload: SessionTokenPayload): string {
  if (!process.env.SESSION_SECRET) {
      console.warn("WARNING: SESSION_SECRET is missing. Using unsafe default.");
  }
  return jwt.sign(payload, SESSION_SECRET, { expiresIn: "30d" });
}

export function verifySessionToken(token: string): SessionTokenPayload {
  const decoded = jwt.verify(token, SESSION_SECRET) as any;
  if (!decoded.uid) throw new Error("Invalid session token payload");
  return { uid: String(decoded.uid) };
}

export function setSessionCookie(res: Response, userId: string | number) {
  const token = signSessionToken({ uid: String(userId) });
  const isProd = (process.env.APP_ENV || "").toLowerCase() === "production";
  
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd, // Secure only in production to allow localhost HTTP dev
    sameSite: "lax",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}
