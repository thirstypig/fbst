export interface AuthProviderProfile {
  provider: "google" | "yahoo";
  sub: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  isAdmin?: boolean; // Sometimes inferred from email allowlist
}

export * from "./GoogleProvider.js";
export * from "./YahooProvider.js";
