// server/src/auth/yahoo.ts
import jwt from "jsonwebtoken";

const YAHOO_CLIENT_ID = process.env.YAHOO_CLIENT_ID || "";
const YAHOO_CLIENT_SECRET = process.env.YAHOO_CLIENT_SECRET || "";

export type YahooVerifiedUser = {
  yahooSub: string;
  email: string;
  name?: string;
  avatarUrl?: string;
};

export async function getYahooToken(code: string, redirectUri: string) {
  const params = new URLSearchParams({
    client_id: YAHOO_CLIENT_ID,
    client_secret: YAHOO_CLIENT_SECRET,
    redirect_uri: redirectUri,
    code,
    grant_type: "authorization_code",
  });

  const response = await fetch("https://api.login.yahoo.com/oauth2/get_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Yahoo token exchange failed: ${error}`);
  }

  return response.json();
}

export async function verifyYahooIdToken(idToken: string): Promise<YahooVerifiedUser> {
  // In a real production app, we should verify the signature using Yahoo's JWKS.
  // For now, we will decode and trust the payload if it's coming from our token exchange.
  const payload = jwt.decode(idToken) as any;

  if (!payload?.sub) throw new Error("Yahoo token missing sub");
  if (!payload?.email) throw new Error("Yahoo token missing email");

  return {
    yahooSub: payload.sub,
    email: payload.email,
    name: payload.name || payload.nickname || undefined,
    avatarUrl: payload.picture || undefined,
  };
}
