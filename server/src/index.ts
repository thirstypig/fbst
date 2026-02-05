
import "dotenv/config";
import { prisma } from "./db/prisma.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";

import { authRouter } from "./routes/auth.js";
import { publicRouter } from "./routes/public.js";
import { leaguesRouter } from "./routes/leagues.js";
import { adminRouter } from "./routes/admin.js";
import auctionRouter from "./routes/auction.js";
import { commissionerRouter } from "./routes/commissioner.js";
import tradesRouter from "./routes/trades.js";
import waiversRouter from "./routes/waivers.js";
import { transactionsRouter } from "./routes/transactions.js";
import standingsRouter from "./routes/standings.js";
import { archiveRouter } from "./routes/archive.js";
import rulesRouter from "./routes/rules.js";
import rosterRouter from './routes/roster.js';
import rosterImportRouter from './routes/rosterImport.js';
import teamsRouter from "./routes/teams.js";

import { attachUser } from "./middleware/auth.js";
import { toNum, toBool, normCode } from './lib/utils.js';
import { DataService } from './services/dataService.js';
import { warmMlbTeamCache } from './lib/mlbApi.js';
import { logger } from './lib/logger.js';
import { buildTeamNameMap } from './services/standingsService.js';

const PORT = Number(process.env.PORT || 4000);

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

  app.use(attachUser);

  // Health check
  // Health check
  app.get("/api/health", async (req, res) => {
    try {
      // Check DB connection
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok", db: "connected", timestamp: Date.now() });
    } catch (error) {
            console.error("Health check failed:", error);
      res.status(503).json({ status: "error", db: "disconnected", timestamp: Date.now(), error: String(error) });
    }
  });

  // Routes
  app.use("/api", authRouter);
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

  const server = app.listen(PORT, "0.0.0.0", () => {
    logger.info({ port: PORT }, '🔥 FBST server listening on 0.0.0.0');
    
    // Auth Config Check
    const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
    const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
    logger.info(
      { hasClientId, hasClientSecret, redirectUri: process.env.GOOGLE_REDIRECT_URI || "default" },
      "Auth Configuration Check"
    );

    if (!hasClientId || !hasClientSecret) {
      logger.warn({}, "⚠️  GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing. Login will fail.");
    }
  });

  server.on("error", (err: any) => {
    if (err?.code === "EADDRINUSE") {
      logger.error({ port: PORT }, 'Port already in use');
      process.exit(1);
    }
    logger.error({ error: String(err) }, 'Server listen error');
    process.exit(1);
  });
}

main().catch((e) => {
  console.error("Fatal server startup error:", e);
  process.exit(1);
});
