
import jwt from "jsonwebtoken";

// Use same interface from GoogleProvider or put in a shared file?
// Let's create `auth/providers/index.ts` later for shared types.
import type { AuthProviderProfile } from "./index.js";

export class YahooProvider {
    
  private static get clientId() {
    return process.env.YAHOO_CLIENT_ID || "";
  }
  
  private static get clientSecret() {
    return process.env.YAHOO_CLIENT_SECRET || "";
  }

  /**
   * Generates the Yahoo OAuth URL.
   */
  static getAuthUrl(redirectUri: string): string {
    console.log("[DEBUG] YahooProvider.getAuthUrl called with:", redirectUri);
    console.log("[DEBUG] Client ID:", this.clientId ? "PRESENT" : "MISSING");
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
    });
    const url = `https://api.login.yahoo.com/oauth2/request_auth?${params.toString()}`;
    console.log("[DEBUG] YahooProvider generated URL:", url);
    return url;
  }

  /**
   * Exchanges code for tokens and extracts user profile.
   */
  static async verifyCode(code: string, redirectUri: string): Promise<AuthProviderProfile> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
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
      const errorText = await response.text();
      throw new Error(`Yahoo token exchange failed: ${errorText}`);
    }

    const data = await response.json() as any;
    const idToken = data.id_token; // Yahoo returns "id_token" in JSON

    if (!idToken) throw new Error("Yahoo response missing id_token");

    // Decoding WITHOUT verification for now (as trusted source).
    // Ideally verify signature with Yahoo JWKS.
    const payload = jwt.decode(idToken) as any;
    
    if (!payload?.sub || !payload?.email) {
      throw new Error("Yahoo ID Token missing sub/email claim");
    }

    return {
      provider: "yahoo",
      sub: payload.sub,
      email: payload.email,
      name: payload.name || payload.nickname, // Yahoo uses nickname often
      avatarUrl: payload.picture,
    };
  }
}
