// server/src/index.ts
import express from "express";
import cors from "cors";
import { getAuctionValues } from "./data/auctionValues";



import teamsRouter from "./routes/teams";
import standingsRouter from "./routes/standings";
import auctionRouter from "./routes/auction";
import periodsRouter from "./routes/periods";
import playersRouter from "./routes/players";
import { loadAuctionValues } from "./data/auctionValues";
import { loadPlayers } from "./data/players";


const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

app.use(cors());
app.use(express.json());

// Simple logger
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Healthcheck
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Auction values from CSV
app.get("/api/auction-values", (_req, res) => {
  try {
    const values = getAuctionValues();
    console.log(
      `/api/auction-values -> ${Array.isArray(values) ? values.length : 0} rows`
    );
    res.json(values);
  } catch (err) {
    console.error("Error in /api/auction-values", err);
    res.status(500).json({ error: "Failed to load auction values" });
  }
});


app.get("/api/auction-values/:mlbId", (req, res) => {
  try {
    const rows = loadAuctionValues();
    const row = rows.find((r) => r.mlb_id === req.params.mlbId);
    if (!row) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json(row);
  } catch (err) {
    console.error("Error loading auction values", err);
    res.status(500).json({ error: "Failed to load auction values" });
  }
});

app.get("/api/players", async (_req, res) => {
  const players = await loadPlayers();
  res.json(players);
});


// Routers
app.use("/api/teams", teamsRouter);
app.use("/api/standings", standingsRouter);
app.use("/api/auction", auctionRouter);
app.use("/api/periods", periodsRouter);
app.use("/api/players", playersRouter);

// Catch-all 404
app.use((req, res) => {
  console.log("404 for", req.method, req.url);
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`🔥 FBST server listening on http://localhost:${PORT}`);
});

export default app;
