import { YahooConfig } from "./config.js";
import type { AuthProviderProfile } from "../providers/index.js";
import jwt from "jsonwebtoken";

export class YahooHandler {
  /**
   * Generates the Yahoo OAuth URL.
   */
  static getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: YahooConfig.clientId,
      redirect_uri: YahooConfig.redirectUri,
      response_type: "code",
      scope: "openid email profile",
    });
    return `https://api.login.yahoo.com/oauth2/request_auth?${params.toString()}`;
  }

  /**
   * Exchanges code for tokens and extracts user profile.
   */
  static async verifyCode(code: string): Promise<AuthProviderProfile> {
    const params = new URLSearchParams({
      client_id: YahooConfig.clientId,
      client_secret: YahooConfig.clientSecret,
      redirect_uri: YahooConfig.redirectUri,
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
    const idToken = data.id_token; 

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
      name: payload.name || payload.nickname, 
      avatarUrl: payload.picture,
    };
  }
}
