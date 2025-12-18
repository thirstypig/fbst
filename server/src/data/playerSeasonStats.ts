// server/src/data/playerSeasonStats.ts
import fs from "fs";
import path from "path";

export type SeasonTotalsRow = {
  [key: string]: string;
};

const SEASON_TOTALS_FILE = path.join(
  __dirname,
  "ogba_player_season_totals_2025.csv"
);

let cachedRows: SeasonTotalsRow[] | null = null;

function parseCsv(text: string): SeasonTotalsRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row: SeasonTotalsRow = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] ?? "").trim();
    });
    return row;
  });
}

function loadAllSeasonTotals(): SeasonTotalsRow[] {
  if (cachedRows) return cachedRows;

  const raw = fs.readFileSync(SEASON_TOTALS_FILE, "utf-8");
  const records = parseCsv(raw);

  cachedRows = records;
  console.log(
    `Loaded ${records.length} season total rows from ${SEASON_TOTALS_FILE}`
  );
  return records;
}

/**
 * Look up a player's season totals by mlbId (string of the mlb_id column).
 */
export function getPlayerSeasonStatsByMlbId(mlbId: string) {
  const all = loadAllSeasonTotals();
  const target = mlbId.trim();

  const row = all.find((r) => {
    const id = String(r.mlb_id ?? r.mlbId ?? "").trim();
    return id === target;
  });

  if (!row) {
    return null;
  }

  const numericKeys = [
    "G",
    "AB",
    "R",
    "H",
    "HR",
    "RBI",
    "SB",
    "AVG",
    "GS",
    "IP",
    "ER",
    "BB",
    "SO",
    "W",
    "S",
    "ERA",
    "WHIP",
  ];

  const result: Record<string, number | string | null> = {};

  for (const [key, value] of Object.entries(row)) {
    if (numericKeys.includes(key)) {
      const num = Number(value);
      result[key] = Number.isNaN(num) ? null : num;
    } else {
      result[key] = value;
    }
  }

  return result;
}
