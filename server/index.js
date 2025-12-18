// server/index.js
// Simple FBST API server that serves dummy data for the client.
// Uses ES modules – make sure "type": "module" is set in package.json.

import express from "express";
import cors from "cors";

import {
  dummySeasonStandings,
  dummyPeriodStandingsById,
  dummyPlayers,
} from "./src/dummyData.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Optional: tiny logger to see traffic in your server console
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check / root
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "FBST API running" });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// ---- Season standings ----
// Used by /season and /teams pages in the client.
app.get("/api/season-standings", (_req, res) => {
  res.json(dummySeasonStandings);
});

// ---- Period standings ----
// Used by /period and /teams pages. periodId is required by the client
// but we default to 1 if it's missing.
app.get("/api/period-standings", (req, res) => {
  const periodIdRaw = req.query.periodId;
  const periodId = periodIdRaw ? Number(periodIdRaw) : 1;

  const data = dummyPeriodStandingsById[periodId];

  if (!data) {
    return res.status(404).json({
      error: "Period not found",
      periodId,
    });
  }

  res.json(data);
});

// ---- Players ----
// Used by /players page.
app.get("/api/players", (_req, res) => {
  res.json(dummyPlayers);
});

// ---- Auction values (stub) ----
// So hitting /auction doesn't 404 the API. You can replace later.
app.get("/api/auction-values", (_req, res) => {
  res.json({
    leagueId: 1,
    seasonYear: 2025,
    players: [],
  });
});

// 404 handler for any unknown route
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

// Start server
app.listen(PORT, () => {
  console.log(`FBST API server listening on http://localhost:${PORT}`);
});
