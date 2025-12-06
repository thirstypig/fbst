// server/src/routes/players.ts
import { Router } from "express";
import {
  loadPlayerSeasonStats,
  getPlayerByMlbId,
  PlayerSeasonRow,
} from "../data/playerSeasonStats";

const router = Router();

/**
 * GET /players
 * Optional query params:
 *   - availability: "all" | "available" | "owned"
 *   - type: "all" | "hitters" | "pitchers"
 */
router.get("/", (req, res) => {
  const availability = String(req.query.availability ?? "all") as
    | "all"
    | "available"
    | "owned";
  const type = String(req.query.type ?? "all") as
    | "all"
    | "hitters"
    | "pitchers";

  let players: PlayerSeasonRow[] = loadPlayerSeasonStats();

  // availability filter
  if (availability === "available") {
    players = players.filter((p) => p.isFreeAgent);
  } else if (availability === "owned") {
    players = players.filter((p) => !p.isFreeAgent);
  }

  // hitter/pitcher filter
  if (type === "hitters") {
    players = players.filter((p) => !p.isPitcher);
  } else if (type === "pitchers") {
    players = players.filter((p) => p.isPitcher);
  }

  res.json(players);
});

/**
 * GET /players/:mlbId
 */
router.get("/:mlbId", (req, res) => {
  const player = getPlayerByMlbId(req.params.mlbId);
  if (!player) {
    return res.status(404).json({ error: "Not found" });
  }
  res.json(player);
});

export default router;
