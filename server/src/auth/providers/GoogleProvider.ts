import { OAuth2Client } from "google-auth-library";
import type { AuthProviderProfile } from "./index.js";

/**
 * Google Auth Logic.
 * Responsible for URL generation and verifyng auth codes.
 */
export class GoogleProvider {
  private static get client(): OAuth2Client {
    return new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    });
  }

  /**
   * Generates the OAuth2 URL for the frontend to redirect to.
   */
  static getAuthUrl(redirectUri: string): string {
    return this.client.generateAuthUrl({
      redirect_uri: redirectUri,
      access_type: "offline",
      prompt: "consent",
      scope: ["openid", "email", "profile"],
    });
  }

  /**
   * Exchanges an authorization code for a user profile.
   */
  static async verifyCode(code: string, redirectUri: string): Promise<AuthProviderProfile> {
    const client = this.client;
    
    // The client needs the redirect URI set to verify the code
    // (It doesn't actually redirect, but it's part of the check)
    // We create a new client instance or clone/set options to avoid race conditions if singleton
    // But OAuth2Client is stateful.
    
    // Better: Just pass redirect_uri to getToken options if possible? 
    // No, google-auth-library usually wants it in constructor or set explicitly.
    // Let's create a fresh instance to be safe (cheap).
    const instance = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: redirectUri,
    });

    const { tokens } = await instance.getToken(code);
    const idToken = tokens.id_token;

    if (!idToken) {
      throw new Error("Google did not return an ID Token");
    }

    const ticket = await instance.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) throw new Error("Invalid Google ID Token payload");
    if (!payload.sub || !payload.email) throw new Error("Google profile missing sub/email");

    return {
      provider: "google",
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.picture,
    };
  }
}
