// server/index.js
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// GET /api/teams?leagueId=1&season=2025
app.get("/api/teams", async (req, res) => {
  try {
    // leagueId is a STRING in the DB
    const leagueId =
      typeof req.query.leagueId === "string" && req.query.leagueId.trim() !== ""
        ? req.query.leagueId.trim()
        : "1"; // default leagueId "1"

    // season is an Int in the DB
    const seasonParam =
      typeof req.query.season === "string" && req.query.season.trim() !== ""
        ? req.query.season.trim()
        : "2025";
    const season = parseInt(seasonParam, 10);

    const where = { leagueId };
    if (!Number.isNaN(season)) {
      where.season = season;
    }

    const teams = await prisma.team.findMany({
      where,
      orderBy: { id: "asc" },
    });

    console.log("Fetched teams:", teams.length);
    res.json(teams);
  } catch (err) {
    console.error("Error fetching teams", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/teams/:id  (team detail + roster)
app.get("/api/teams/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Same defaults as list endpoint
    const leagueId =
      typeof req.query.leagueId === "string" && req.query.leagueId.trim() !== ""
        ? req.query.leagueId.trim()
        : "1";

    const seasonParam =
      typeof req.query.season === "string" && req.query.season.trim() !== ""
        ? req.query.season.trim()
        : "2025";
    const season = parseInt(seasonParam, 10);

    const teamWhere = { id, leagueId };
    if (!Number.isNaN(season)) {
      teamWhere.season = season;
    }

    const team = await prisma.team.findFirst({ where: teamWhere });

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const rosterWhere = { teamId: id };
    if (!Number.isNaN(season)) {
      rosterWhere.season = season;
    }

    const roster = await prisma.teamRosterSlot.findMany({
      where: rosterWhere,
      include: {
        player: true,
      },
      orderBy: { slot: "asc" },
    });

    res.json({ team, roster });
  } catch (err) {
    console.error("Error fetching team by id", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/players  (for roster dropdown)
app.get("/api/players", async (req, res) => {
  try {
    const players = await prisma.player.findMany({
      orderBy: { name: "asc" },
    });
    res.json(players);
  } catch (err) {
    console.error("Error fetching players", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/teams/:id/roster  (create a roster slot)
app.post("/api/teams/:id/roster", async (req, res) => {
  try {
    const { id: teamId } = req.params;
    const {
      playerId,
      slot,
      isHitter,
      isPitcher,
      salary,
      contractType,
      contractYear,
      season,
    } = req.body;

    if (!playerId || !slot) {
      return res
        .status(400)
        .json({ error: "playerId and slot are required fields" });
    }

    const seasonNum =
      typeof season === "number"
        ? season
        : parseInt(season ?? "2025", 10) || 2025;

    const created = await prisma.teamRosterSlot.create({
      data: {
        teamId,
        playerId,
        slot,
        season: seasonNum,
        isHitter: !!isHitter,
        isPitcher: !!isPitcher,
        salary: salary ?? null,
        contractType: contractType ?? null,
        contractYear: contractYear ?? null,
      },
      include: {
        player: true,
      },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("Error creating roster slot", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`FBST API server listening on port ${PORT}`);
});
