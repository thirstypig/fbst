import crypto from "crypto";
import dotenv from "dotenv";
import path from "path";

// Explicitly load .env from the server root
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { prisma } from "./db/prisma.js";
import express from "express";
import https from "https";
import cors from "cors";
import cookieParser from "cookie-parser";
import fs from "fs";

import { authRouter } from "./features/auth/index.js";
import { publicRouter } from "./routes/public.js";
import { leaguesRouter } from "./features/leagues/index.js";
import { rulesRouter } from "./features/leagues/index.js";
import { adminRouter } from "./features/admin/index.js";
import { auctionRouter } from "./features/auction/index.js";
import { commissionerRouter } from "./features/commissioner/index.js";
import { tradesRouter } from "./features/trades/index.js";
import { waiversRouter } from "./features/waivers/index.js";
import { transactionsRouter } from "./features/transactions/index.js";
import { standingsRouter } from "./features/standings/index.js";
import { archiveRouter } from "./features/archive/index.js";
import { rosterRouter, rosterImportRouter } from "./features/roster/index.js";
import { teamsRouter } from "./features/teams/index.js";
import { keeperPrepRouter } from "./features/keeper-prep/index.js";
import { periodsRouter } from "./features/periods/index.js";
import { playersRouter } from "./features/players/index.js";

import rateLimit from "express-rate-limit";
import { attachUser } from "./middleware/auth.js";
import { supabaseAdmin } from "./lib/supabase.js";
import { toNum, toBool, normCode } from './lib/utils.js';
import { DataService } from './features/players/services/dataService.js';
import { warmMlbTeamCache } from './lib/mlbApi.js';
import { logger } from './lib/logger.js';
import { buildTeamNameMap } from './features/standings/services/standingsService.js';

// Validate required env vars at startup
const REQUIRED_ENV = ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SESSION_SECRET"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`FATAL: Missing required env var: ${key}`);
    process.exit(1);
  }
}

const PORT = Number(process.env.PORT || 4001);

async function main() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:4173",
        process.env.CLIENT_URL || ""
      ].filter(Boolean),
      credentials: true,
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Request ID tracking
  app.use((req, _res, next) => {
    (req as any).requestId = req.headers["x-request-id"] || crypto.randomUUID();
    next();
  });

  // Rate limiting
  const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
  });
  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many auth attempts, please try again later" },
  });
  app.use("/api", globalLimiter);
  app.use("/api/auth", authLimiter);

  app.use(attachUser);

  // Health check
  app.get("/api/health", async (req, res) => {
    const checks: Record<string, string> = {};
    let healthy = true;

    // DB check
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.db = "ok";
    } catch {
      checks.db = "error";
      healthy = false;
    }

    // Supabase check
    try {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 });
      checks.supabase = error ? "error" : "ok";
      if (error) healthy = false;
    } catch {
      checks.supabase = "error";
      healthy = false;
    }

    const status = healthy ? 200 : 503;
    res.status(status).json({ status: healthy ? "ok" : "degraded", checks, timestamp: Date.now() });
  });

  // Routes
  app.use("/api/auth", authRouter);
  app.use("/api", publicRouter);
  app.use("/api", leaguesRouter);
  app.use("/api", adminRouter);
  app.use("/api", commissionerRouter);
  app.use("/api/trades", tradesRouter);
  app.use("/api/waivers", waiversRouter);
  app.use("/api", transactionsRouter);
  app.use("/api", standingsRouter);
  app.use("/api", archiveRouter);
  app.use("/api/leagues", rulesRouter);
  app.use("/api/auction", auctionRouter);
  app.use("/api/teams", teamsRouter);
  app.use(rosterRouter);
  app.use('/api/roster', rosterImportRouter);
  app.use('/api', keeperPrepRouter);
  app.use('/api/periods', periodsRouter);
  app.use('/api/players', playersRouter);


  // Data Initialization
  const dataService = DataService.getInstance();
  const seasonFile = "ogba_player_season_totals_2026.csv";
  await dataService.loadAllData(seasonFile);

  const normalizedSeasonStats = await dataService.getNormalizedSeasonStats();
  const normalizedPeriodStats = dataService.getNormalizedPeriodStats();

  // Endpoints using memory data
  app.get("/api/player-season-stats", (req, res) => {
    res.json(normalizedSeasonStats);
  });
  
  app.get("/api/player-period-stats", (req, res) => {
      res.json(normalizedPeriodStats);
  });

  app.get("/api/auction-values", (req, res) => {
    res.json(dataService.getAuctionValues());
  });

  // --- 1. Static Assets (Frontend) ---
  // Resolve path to client/dist relative to this file (server/src/index.ts -> server/src -> server -> root -> client/dist)
  // Or more robustly: server/src/index.ts is compiled to server/src/index.js (usually?) or run via tsx.
  // We'll assume process.cwd() is server root or repo root. Let's send a safer path.
  // If running from 'server' dir: ../client/dist
  // If running from root: ./client/dist
  const clientDistPath = path.resolve(process.cwd(), '../client/dist');
  
  if (fs.existsSync(clientDistPath)) {
    logger.info({ path: clientDistPath }, "Serving static frontend assets");
    app.use(express.static(clientDistPath));
  } else {
    // try alternative (repo root)
    const altPath = path.resolve(process.cwd(), 'client/dist');
    if (fs.existsSync(altPath)) {
        logger.info({ path: altPath }, "Serving static frontend assets (alt path)");
        app.use(express.static(altPath));
    } else {
       logger.warn({ checked: [clientDistPath, altPath] }, "⚠️ Frontend build not found. API mode only.");
    }
  }

  // --- 2. 404 Handler for API routes (Keep this Strict) ---
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "API endpoint not found", path: req.originalUrl });
  });

  // --- 4. Global Error Handler ---
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ error: String(err?.message), path: req.path }, "Unhandled error");
    res.status(500).json({ error: "Internal Server Error" });
  });

  // --- 3. SPA Catch-All (For React Routing) ---
  // If it's not an API route and not a static file, serve index.html
  app.get("*", (req, res) => {
     // Try primary path
     let index = path.join(clientDistPath, 'index.html');
     if (!fs.existsSync(index)) {
         index = path.join(process.cwd(), 'client/dist/index.html');
     }

     if (fs.existsSync(index)) {
        res.sendFile(index);
     } else {
        res.status(404).send("FBST UI not built or found.");
     }
  });

  // Determine if we should use HTTPS locally
  let server: import("http").Server | import("https").Server;
  const keyPath = path.resolve(process.cwd(), "certs", "key.pem");
  const certPath = path.resolve(process.cwd(), "certs", "cert.pem");

  const onListen = async () => {
    const protocol = fs.existsSync(keyPath) ? "HTTPS" : "HTTP";
    logger.info({ port: PORT, protocol }, `🔥 FBST server listening on 0.0.0.0 (${protocol})`);
    
  };

  const isDev = process.env.NODE_ENV === "development";
  const hasCerts = fs.existsSync(keyPath) && fs.existsSync(certPath);

  // Hardened: Always use HTTP for local development and Production (Render/Heroku handles SSL termination).
  // Only use HTTPS if specifically configured via env var or similar, but for now, default to HTTP.
  if (isDev || process.env.NODE_ENV === "production") {
    server = app.listen(PORT, "0.0.0.0", onListen);
    logger.info({ port: PORT }, `🚀 Server started on port ${PORT} (HTTP)`);
  } else if (hasCerts) {
    const options = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
    server = https.createServer(options, app).listen(PORT, "0.0.0.0", onListen);
  } else {
    server = app.listen(PORT, "0.0.0.0", onListen);
  }

  server.on("error", (err: any) => {
    if (err?.code === "EADDRINUSE") {
      logger.error({ port: PORT }, 'Port already in use');
      process.exit(1);
    }
    logger.error({ error: String(err) }, 'Server listen error');
    process.exit(1);
  });

  // Graceful shutdown
  function shutdown(signal: string) {
    logger.info({ signal }, "Shutdown signal received");
    server.close(() => {
      prisma.$disconnect().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000);
  }
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((e) => {
  console.error("Fatal server startup error:", e);
  process.exit(1);
});
