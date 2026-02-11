
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Minimal script to help user configure Render
const __dirname = dirname(fileURLToPath(import.meta.url));

console.log("\n🔑 --- PROD CONFIGURATION GUIDE ---\n");
console.log("For your Render Environment (Production), ensures these are set:\n");

console.log("NODE_ENV=production");
console.log("CLIENT_URL=https://fbst.onrender.com");
console.log("SERVER_ORIGIN=https://fbst-api.onrender.com");
console.log("\nREDIRECT URIs (Must match Google/Yahoo Consoles exactly):");
console.log("GOOGLE_REDIRECT_URI=https://fbst-api.onrender.com/api/auth/google/callback");
console.log("YAHOO_REDIRECT_URI=https://fbst-api.onrender.com/api/auth/yahoo/callback");

console.log("\n---\n");
console.log("✅ Local Environment is configured via scripts/dev.sh");
