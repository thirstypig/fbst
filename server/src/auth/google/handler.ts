import { OAuth2Client } from "google-auth-library";
import { GoogleConfig } from "./config.js";
import type { AuthProviderProfile } from "../providers/index.js"; 
// Note: We might want to move AuthProviderProfile to shared/types someday, 
// strictly keeping it in providers for now to avoid breaking too many imports.

export class GoogleHandler {
  private static get client(): OAuth2Client {
    return new OAuth2Client({
      clientId: GoogleConfig.clientId,
      clientSecret: GoogleConfig.clientSecret,
      redirectUri: GoogleConfig.redirectUri,
    });
  }

  static getAuthUrl(): string {
    return this.client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["openid", "email", "profile"],
    });
  }

  static async verifyCode(code: string): Promise<AuthProviderProfile> {
    const { tokens } = await this.client.getToken(code);
    const idToken = tokens.id_token;

    if (!idToken) throw new Error("Google response missing id_token");

    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: GoogleConfig.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload?.email) {
      throw new Error("Google ID Token missing sub/email claim");
    }

    return {
      provider: "google",
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.picture,
    };
  }
}
