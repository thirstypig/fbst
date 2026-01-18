// server/src/scripts/import_onroto_transactions.ts
//
// Import OnRoto "Year to Date Transactions" JSON (from fbst-stats-worker)
// into Prisma TransactionEvent rows.
//
// Usage (from repo root):
//   cd server
//   LEAGUE_NAME="OGBA" SEASON=2025 INFILE="../../fbst-stats-worker/ogba_transactions_2025.json" npx tsx src/scripts/import_onroto_transactions.ts
//
// Defaults:
// - LEAGUE_NAME defaults to "OGBA" but also falls back to "OGBA 2025" for the same season
// - SEASON defaults to 2025
// - INFILE attempts common relative paths if not provided

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

type OgbaTxnRow = {
  season: number;
  eff_date?: string | null; // "YYYY-MM-DD"
  eff_date_raw?: string | null; // "MM.DD"
  league?: string | null; // often blank in OGBA export
  team?: string | null; // OGBA team name
  player?: string | null; // OnRoto alias like "NArenado"
  mlb_tm?: string | null; // "StL"
  transaction?: string | null; // "Release", "Change Position to MI", etc.
  submitted_at?: string | null; // "YYYY-MM-DDTHH:MM"
  submitted_raw?: string | null; // "MM.DD @ HH:MM"
  row_hash: string; // md5
};

function norm(s: any): string {
  return String(s ?? "").trim();
}

function parseTxnType(raw: string): { transactionType?: string; toPosition?: string } {
  const s = norm(raw);
  if (!s) return {};

  const m = s.match(/^Change Position to\s+(.+)$/i);
  if (m) return { transactionType: "CHANGE_POSITION", toPosition: norm(m[1]).toUpperCase() };

  const map: Record<string, string> = {
    "release": "RELEASE",
    "add to actives": "ADD_TO_ACTIVES",
    "activate": "ACTIVATE",
    "disable": "DISABLE",
  };

  const key = s.toLowerCase();
  if (map[key]) return { transactionType: map[key] };

  // fallback: keep raw only
  return {};
}

function resolveInfile(explicit?: string): string {
  if (explicit) {
    const p = path.resolve(process.cwd(), explicit);
    if (!fs.existsSync(p)) throw new Error(`INFILE does not exist: ${p}`);
    return p;
  }

  // When you run from /server, cwd is ".../fbst/server"
  // Common locations we should try:
  const candidates = [
    path.resolve(process.cwd(), "../../fbst-stats-worker/ogba_transactions_2025.json"),
    path.resolve(process.cwd(), "../fbst-stats-worker/ogba_transactions_2025.json"),
    path.resolve(process.cwd(), "ogba_transactions_2025.json"),
    // If someone runs from repo root:
    path.resolve(process.cwd(), "fbst-stats-worker/ogba_transactions_2025.json"),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  throw new Error(
    `Could not find ogba_transactions_2025.json. Set INFILE explicitly.\nTried:\n- ${candidates.join("\n- ")}`
  );
}

async function main() {
  const prisma = new PrismaClient();

  const season = Number(process.env.SEASON || "2025");

  // You said: league name in DB should be "OGBA" (season-specific row is League.season)
  // We will default to "OGBA" but also accept "OGBA 2025" automatically.
  const leagueName = norm(process.env.LEAGUE_NAME) || "OGBA";

  const infile = resolveInfile(process.env.INFILE);

  const league = await prisma.league.findFirst({
    where: {
      season,
      OR: [{ name: leagueName }, { name: `${leagueName} ${season}` }, { name: `OGBA ${season}` }],
    },
    include: { teams: true },
  });

  if (!league) {
    throw new Error(
      `League not found. Tried season=${season} with names: "${leagueName}", "${leagueName} ${season}", "OGBA ${season}"`
    );
  }

  // Build a normalized Team.name -> id map for this league
  const teamIdByName = new Map<string, number>();
  for (const t of league.teams) {
    teamIdByName.set(norm(t.name).toLowerCase(), t.id);
  }

  // Build a normalized Player.name -> id map (for linking "NArenado" -> "N. Arenado")
  // Strategy: remove dots/spaces, lowercase. e.g. "J. Naylor" -> "jnaylor" == "jnaylor"
  const allPlayers = await prisma.player.findMany();
  const playerIdByNorm = new Map<string, number>();

  function normalizeName(n: string): string {
    return n.replace(/[\.\s]/g, "").toLowerCase();
  }

  for (const p of allPlayers) {
    // 1. Full name: "Mookie Betts" -> "mookiebetts"
    const full = normalizeName(p.name);
    if (full) playerIdByNorm.set(full, p.id);

    // 2. Initial + Last: "Mookie Betts" -> "mbetts"
    // Useful for OnRoto aliases like "MBetts" or "FFreeman"
    const parts = p.name.split(" ");
    if (parts.length >= 2) {
      const first = parts[0];
      const last = parts.slice(1).join(""); // "De La Cruz" -> "DeLaCruz"
      const initialLast = (first[0] + last).replace(/[\.\s]/g, "").toLowerCase();
      
      // Only set if not already set (full name takes precedence if collision, 
      // though unlikely to collide with *another* player's initial+last in this small set)
      if (!playerIdByNorm.has(initialLast)) {
        playerIdByNorm.set(initialLast, p.id);
      }
    }
  }
  
  const raw = fs.readFileSync(infile, "utf-8");
  const rows: OgbaTxnRow[] = JSON.parse(raw);

  let upserts = 0;
  let missingTeam = 0;
  let missingPlayer = 0;

  for (const r of rows) {
    const ogbaTeamName = norm(r.team) || null;
    const playerAliasRaw = norm(r.player) || null;
    const mlbTeamAbbr = norm(r.mlb_tm) || null;
    const transactionRaw = norm(r.transaction) || null;

    const effDate = r.eff_date ? new Date(r.eff_date) : null;
    const submittedAt = r.submitted_at ? new Date(r.submitted_at) : null;

    const { transactionType, toPosition } = parseTxnType(transactionRaw || "");

    const teamId = ogbaTeamName ? teamIdByName.get(ogbaTeamName.toLowerCase()) ?? null : null;
    if (ogbaTeamName && !teamId) missingTeam++;

    // Try to find player: 1) simple norm match 2) future: aliases table
    let playerId: number | null = null;
    if (playerAliasRaw) {
      const key = normalizeName(playerAliasRaw);
      playerId = playerIdByNorm.get(key) ?? null;
      if (!playerId && playerAliasRaw !== "Empty") {
         // "Empty" spots often show up in valid rosters but maybe not transactions? 
         // For transactions, missing matches usually mean unmapped rookies or minor naming diffs.
         missingPlayer++;
      }
    }

    await prisma.transactionEvent.upsert({
      where: { rowHash: r.row_hash },
      create: {
        rowHash: r.row_hash,
        leagueId: league.id,
        season: r.season,

        effDate,
        submittedAt,

        effDateRaw: norm(r.eff_date_raw) || null,
        submittedRaw: norm(r.submitted_raw) || null,

        ogbaTeamName,
        playerAliasRaw,
        mlbTeamAbbr,
        transactionRaw,

        transactionType: transactionType ?? null,
        toPosition: toPosition ?? null,

        teamId,
        playerId,
      },
      update: {
        // idempotent refresh
        effDate,
        submittedAt,

        effDateRaw: norm(r.eff_date_raw) || null,
        submittedRaw: norm(r.submitted_raw) || null,

        ogbaTeamName,
        playerAliasRaw,
        mlbTeamAbbr,
        transactionRaw,

        transactionType: transactionType ?? null,
        toPosition: toPosition ?? null,

        teamId,
        playerId,
      },
    });

    upserts++;
  }

  console.log(`OK: upserted ${upserts} TransactionEvent rows into leagueId=${league.id} (name="${league.name}" season=${league.season})`);
  console.log(`Team mapping misses (Team.name not found in league): ${missingTeam}`);
  console.log(`INFILE: ${infile}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
