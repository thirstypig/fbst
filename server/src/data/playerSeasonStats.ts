// server/src/data/playerSeasonStats.ts
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

export interface PlayerSeasonRow {
  mlb_id: string;
  name: string;
  team: string; // OGBA team code or "FA" / "" for free agent
  pos: string;
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

  // derived flags
  isFreeAgent: boolean;
  isPitcher: boolean;
}

const CSV_PATH = path.join(
  __dirname,
  "ogba_player_season_totals_2025.csv"
);

let CACHE: PlayerSeasonRow[] | null = null;

function loadCsv(): PlayerSeasonRow[] {
  if (CACHE) return CACHE;

  if (!fs.existsSync(CSV_PATH)) {
    console.warn(
      `[playerSeasonStats] CSV not found at ${CSV_PATH} - returning empty array`
    );
    CACHE = [];
    return CACHE;
  }

  const raw = fs.readFileSync(CSV_PATH, "utf8");
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as any[];

  CACHE = records.map((row) => {
    const team = (row.team ?? "").trim();
    const pos = (row.pos ?? "").trim();

    const isPitcher = pos === "P";
    const isFreeAgent =
      team === "" ||
      team.toUpperCase() === "FA" ||
      team.toUpperCase() === "FREE";

    const num = (val: any): number => {
      if (val === "" || val == null) return 0;
      const n = Number(val);
      return Number.isFinite(n) ? n : 0;
    };

    return {
      mlb_id: String(row.mlb_id),
      name: String(row.name),
      team,
      pos,
      R: num(row.R),
      HR: num(row.HR),
      RBI: num(row.RBI),
      SB: num(row.SB),
      AVG: num(row.AVG),
      W: num(row.W),
      S: num(row.S),
      ERA: num(row.ERA),
      WHIP: num(row.WHIP),
      K: num(row.K),
      isFreeAgent,
      isPitcher,
    };
  });

  return CACHE;
}

export function loadPlayerSeasonStats(): PlayerSeasonRow[] {
  return loadCsv();
}

export function getPlayerByMlbId(mlbId: string): PlayerSeasonRow | undefined {
  return loadCsv().find((p) => p.mlb_id === mlbId);
}
