import { GoogleConfig } from "../google/config.js";
import { YahooConfig } from "../yahoo/config.js";

export function validateAuthConfig() {
  console.log("🔐 Validating Auth Configuration...");
  try {
    GoogleConfig.validate();
    YahooConfig.validate();
    console.log("✅ Auth Configuration Valid.");
  } catch (error: any) {
    console.error("❌ Auth Config Error:", error.message);
    // We explicitly DO NOT throw here to allow server to start in dev mode 
    // functionality might be degraded but we don't want to crash everything if one key is missing in dev.
    // In production, you might want to throw.
    if (process.env.NODE_ENV === "production") {
        throw error;
    }
  }
}
