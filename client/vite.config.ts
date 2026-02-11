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
    https: {
      key: fs.readFileSync("../server/certs/key.pem"),
      cert: fs.readFileSync("../server/certs/cert.pem"),
    },
    hmr: {
      protocol: 'wss'
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4001",
        secure: false,
        changeOrigin: true,
      },
    },
  },
});
