// server/src/auth/google.ts
import { OAuth2Client } from "google-auth-library";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export type GoogleVerifiedUser = {
  googleSub: string;
  email: string;
  name?: string;
  avatarUrl?: string;
};

export async function verifyGoogleCredential(credential: string): Promise<GoogleVerifiedUser> {
  if (!GOOGLE_CLIENT_ID) throw new Error("Missing GOOGLE_CLIENT_ID on server");
  if (!credential) throw new Error("Missing Google credential");

  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const sub = payload?.sub;
  const email = payload?.email;

  if (!sub) throw new Error("Google token missing sub");
  if (!email) throw new Error("Google token missing email");

  return {
    googleSub: sub,
    email,
    name: payload?.name || undefined,
    avatarUrl: payload?.picture || undefined,
  };
}
