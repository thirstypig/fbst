import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import fs from "fs";

let commitHash = "unknown";
try {
  commitHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch (e) {
  console.warn("Could not determine commit hash", e);
}

let httpsConfig: false | { key: Buffer; cert: Buffer } = false;
try {
  httpsConfig = {
    key: fs.readFileSync("../server/certs/key.pem"),
    cert: fs.readFileSync("../server/certs/cert.pem"),
  };
} catch {
  // Certs not available — run without HTTPS (e.g. CI, preview tools)
}
const useHttps = httpsConfig !== false;

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [react()],
  server: {
    https: httpsConfig,
    hmr: useHttps ? { protocol: 'wss' } : undefined,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4001",
        secure: false,
        changeOrigin: true,
      },
    },
  },
});
