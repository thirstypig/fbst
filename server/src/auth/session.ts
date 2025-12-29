// server/src/auth/session.ts
import jwt from "jsonwebtoken";
import type { Response } from "express";

const COOKIE_NAME = "fbst_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "";

export function assertSessionConfig() {
  if (!SESSION_SECRET) throw new Error("Missing SESSION_SECRET on server");
}

export type SessionTokenPayload = {
  uid: string;
};

export function signSessionToken(payload: SessionTokenPayload): string {
  assertSessionConfig();
  // 30 days
  return jwt.sign(payload, SESSION_SECRET, { expiresIn: "30d" });
}

export function verifySessionToken(token: string): SessionTokenPayload {
  assertSessionConfig();
  const decoded = jwt.verify(token, SESSION_SECRET) as any;
  return { uid: String(decoded?.uid ?? "") };
}

export function setSessionCookie(res: Response, token: string) {
  const isProd = (process.env.APP_ENV || "").toLowerCase() === "production";
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
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
