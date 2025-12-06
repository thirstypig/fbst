// server/src/data/players.ts
import fs from "fs";
import path from "path";
import Papa from "papaparse";

export interface PlayerSeasonRow {
  mlb_id: string;
  name: string;
  team: string; // OGBA fantasy team name (e.g. "Los Doyers")
  pos: string;  // 1B, 2B, OF, P, etc.
  R: number;
  HR: number;
  RBI: number;
  SB: number;
  AVG: number;
  W: number;
  S: number;
  ERA: number;
  WHIP: number;
  K: number;
  isFreeAgent: boolean;
  isPitcher: boolean;
}

// This must match where the CSV actually lives:
//   server/src/data/ogba_player_season_totals_2025.csv
const SEASON_STATS_CSV = path.join(
  __dirname,
  "ogba_player_season_totals_2025.csv"
);

type RawCsvRow = {
  mlb_id?: string;
  name?: string;
  R?: number | string;
  HR?: number | string;
  RBI?: number | string;
  SB?: number | string;
  AVG?: number | string;
  W?: number | string;
  S?: number | string;
  ERA?: number | string;
  WHIP?: number | string;
  K?: number | string;
  // we’ll ignore any extra columns
};

type RosterEntry = {
  mlb_id: string;
  team: string;
  pos: string;
};

/**
 * Manual OGBA roster mapping:
 * - Add entries here to assign players to fantasy teams.
 * - `mlb_id` must match the ID in the CSV.
 *
 * Example (you should replace with real IDs / teams / positions):
 *
 * { mlb_id: "660271", team: "Los Doyers", pos: "OF" },
 */
const OGBA_ROSTERS_2025: RosterEntry[] = [
    // Los Doyers – sample hitters
    { mlb_id: "660271", team: "Los Doyers", pos: "OF" }, // Shohei type
    { mlb_id: "592885", team: "Los Doyers", pos: "OF" },
    { mlb_id: "518692", team: "Los Doyers", pos: "1B" },
  
    // Demolition Lumber Co. – sample hitters
    { mlb_id: "647304", team: "Demolition Lumber Co.", pos: "1B" },
    { mlb_id: "683737", team: "Demolition Lumber Co.", pos: "3B" },
  
    // Sample pitchers
    { mlb_id: "694973", team: "Los Doyers", pos: "P" },
    { mlb_id: "554430", team: "Demolition Lumber Co.", pos: "P" },
  ];
  

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function isPitcherRow(row: { W: number; S: number; ERA: number; WHIP: number; K: number }): boolean {
  // Simple heuristic: if they have meaningful pitching stats, treat as pitcher
  return (
    row.ERA > 0 ||
    row.WHIP > 0 ||
    row.W > 0 ||
    row.S > 0 ||
    row.K > 0
  );
}

let cachedPlayers: PlayerSeasonRow[] | null = null;

export function loadPlayers(): PlayerSeasonRow[] {
  if (cachedPlayers) {
    return cachedPlayers;
  }

  // 1) Read and parse the CSV
  const csvText = fs.readFileSync(SEASON_STATS_CSV, "utf8");

  const parsed = Papa.parse<RawCsvRow>(csvText, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length) {
    // Log parse errors but still try to continue with what we have
    console.error("Errors while parsing player CSV:", parsed.errors);
  }

  // Build a quick lookup map from mlb_id -> roster entry
  const rosterById = new Map<string, RosterEntry>();
  for (const r of OGBA_ROSTERS_2025) {
    rosterById.set(r.mlb_id, r);
  }

  const players: PlayerSeasonRow[] = [];

  for (const row of parsed.data) {
    const mlb_id = (row.mlb_id ?? "").toString().trim();
    if (!mlb_id) continue; // skip bad rows

    const base: PlayerSeasonRow = {
      mlb_id,
      name: (row.name ?? "").toString().trim(), // will be "" until CSV has names
      team: "",
      pos: "",
      R: toNumber(row.R),
      HR: toNumber(row.HR),
      RBI: toNumber(row.RBI),
      SB: toNumber(row.SB),
      AVG: toNumber(row.AVG),
      W: toNumber(row.W),
      S: toNumber(row.S),
      ERA: toNumber(row.ERA),
      WHIP: toNumber(row.WHIP),
      K: toNumber(row.K),
      isFreeAgent: true,
      isPitcher: false,
    };

    // 2) Overlay OGBA roster assignment if present
    const rosterEntry = rosterById.get(mlb_id);
    if (rosterEntry) {
      base.team = rosterEntry.team;
      base.pos = rosterEntry.pos;
      base.isFreeAgent = false;
    }

    // 3) Infer hitter vs pitcher
    base.isPitcher = isPitcherRow(base);

    players.push(base);
  }

  cachedPlayers = players;
  return players;
}
