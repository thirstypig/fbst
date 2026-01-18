// server/src/index.ts
import "dotenv/config";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";

import { authRouter } from "./routes/auth";
import { adminRouter } from "./routes/admin";
import { leaguesRouter } from "./routes/leagues";
import { publicRouter } from "./routes/public";
import { transactionsRouter } from "./routes/transactions";
import { attachUser } from "./middleware/auth";
import {commissionerRouter} from "./routes/commissioner";
import standingsRouter from "./routes/standings";
import { tradesRouter } from "./routes/trades";
import { archiveRouter } from "./routes/archive";


type AnyRow = Record<string, any>;

type SeasonStatRow = {
  mlb_id: string;
  player_name?: string;
  ogba_team_code?: string;
  positions?: string;
  is_pitcher?: boolean;
  group?: "H" | "P";

  // hitting
  AB?: number;
  H?: number;
  R?: number;
  HR?: number;
  RBI?: number;
  SB?: number;
  AVG?: number;

  // pitching
  W?: number;
  SV?: number;
  K?: number;
  IP?: any;
  ER?: any;
  ERA?: number;
  WHIP?: number;
  BB_H?: any;

  // mlb team abbr
  mlb_team?: string;
  mlbTeam?: string;

  [k: string]: any;
};

const PORT = Number(process.env.PORT || 4000);
const MLB_BASE = "https://statsapi.mlb.com/api/v1";

// Persisted cache: mlb_id -> team abbrev (e.g., "LAD")
const TEAM_CACHE_FILE = path.join(process.cwd(), "src", "data", "mlb_team_cache.json");

// ----------------------------
// Utilities
// ----------------------------
function toNum(v: any): number {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim();
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function toBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

function norm(v: any): string {
  return String(v ?? "").trim();
}

function normCode(v: any): string {
  return norm(v).toUpperCase();
}

function resolveDataFile(filename: string): string {
  // Tries common locations relative to server/ because npm run start/dev is run inside server/
  const candidates = [
    path.join(process.cwd(), filename),
    path.join(process.cwd(), "src", "data", filename),
    path.join(process.cwd(), "data", filename),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  return candidates[0];
}

function parseIp(ip: any): number {
  const s = String(ip ?? "").trim();
  if (!s) return 0;
  const parts = s.split(".");
  const whole = Number(parts[0] ?? 0) || 0;
  const frac = Number(parts[1] ?? 0) || 0;
  if (frac === 1) return whole + 1 / 3;
  if (frac === 2) return whole + 2 / 3;
  const n = Number(s);
  return Number.isFinite(n) ? n : whole;
}

function isFinitePos(n: number) {
  return Number.isFinite(n) && n > 0;
}

/**
 * Accepts:
 * - 1
 * - "1"
 * - "P1" / "p1"
 * - "Period 1" / "period 1"
 * Returns numeric period id or null.
 */
function parsePeriodIdParam(v: any): number | null {
  if (v === null || v === undefined) return null;

  // Express can give string | string[]
  const raw = Array.isArray(v) ? v[0] : v;
  const s0 = String(raw ?? "").trim();
  if (!s0) return null;

  let s = s0;

  // remove leading "period"
  s = s.replace(/^\s*period\s*[:#-]?\s*/i, "");

  // remove leading "p" if like "P1"
  s = s.replace(/^\s*p\s*/i, "");

  // keep digits only (safe against "P01", "1)", etc.)
  const digits = s.replace(/[^0-9]/g, "");
  if (!digits) return null;

  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

// ----------------------------
// Small CSV parser (handles quotes)
// ----------------------------
function parseCsv(text: string): AnyRow[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter(Boolean);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const out: AnyRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const row: AnyRow = {};
    headers.forEach((h, idx) => (row[h] = cols[idx] ?? ""));
    out.push(row);
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  const res: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === `"` && (i === 0 || line[i - 1] !== "\\")) {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      res.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  res.push(cur);
  return res.map((s) => s.replace(/\\"/g, `"`).trim());
}

// ----------------------------
// MLB fetch (in-memory cache, 10 min)
// ----------------------------
const mlbCache = new Map<string, { ts: number; data: any }>();
async function mlbGetJson(url: string): Promise<any> {
  const now = Date.now();
  const cached = mlbCache.get(url);
  if (cached && now - cached.ts < 10 * 60 * 1000) return cached.data;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`MLB API ${resp.status} for ${url}`);
  const data = await resp.json();

  mlbCache.set(url, { ts: now, data });
  return data;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ----------------------------
// Team abbrev cache (persisted)
// ----------------------------
function readTeamCache(): Record<string, string> {
  try {
    if (!fs.existsSync(TEAM_CACHE_FILE)) return {};
    const raw = fs.readFileSync(TEAM_CACHE_FILE, "utf-8");
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object") return obj as Record<string, string>;
    return {};
  } catch {
    return {};
  }
}

function writeTeamCache(cache: Record<string, string>) {
  fs.mkdirSync(path.dirname(TEAM_CACHE_FILE), { recursive: true });
  fs.writeFileSync(TEAM_CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

async function fetchMlbTeamsMap(): Promise<Record<number, string>> {
  const url = `${MLB_BASE}/teams?sportId=1`;
  const data = await mlbGetJson(url);
  const teams: any[] = data?.teams ?? [];
  const map: Record<number, string> = {};
  for (const t of teams) {
    const id = Number(t?.id);
    const abbr = String(t?.abbreviation ?? "").trim();
    if (Number.isFinite(id) && abbr) map[id] = abbr;
  }
  return map;
}

async function warmMlbTeamCache(mlbIds: string[]): Promise<Record<string, string>> {
  const cache = readTeamCache();

  const uniq = Array.from(new Set(mlbIds.map((x) => String(x).trim()).filter(Boolean)));
  const missing = uniq.filter((id) => !cache[id]);

  if (missing.length === 0) {
    if (!fs.existsSync(TEAM_CACHE_FILE)) writeTeamCache(cache);
    return cache;
  }

  console.log(`Warming MLB team cache: ${missing.length} missing of ${uniq.length} player ids...`);

  const teamsById = await fetchMlbTeamsMap();
  const batches = chunk(missing, 50);

  for (let i = 0; i < batches.length; i++) {
    const ids = batches[i];
    const url = `${MLB_BASE}/people?personIds=${encodeURIComponent(ids.join(","))}&hydrate=currentTeam`;
    const data = await mlbGetJson(url);
    const people: any[] = data?.people ?? [];

    for (const p of people) {
      const id = String(p?.id ?? "").trim();
      if (!id) continue;

      const teamId = Number(p?.currentTeam?.id);
      const abbr = (Number.isFinite(teamId) ? teamsById[teamId] : "") || "";
      if (abbr) cache[id] = abbr;
    }

    writeTeamCache(cache);
    console.log(
      `  cache progress: batch ${i + 1}/${batches.length} saved (${Object.keys(cache).length} total entries)`
    );
  }

  return cache;
}

// ----------------------------
// Period Category Standings (server-side)
// ----------------------------
type CategoryKey = "R" | "HR" | "RBI" | "SB" | "AVG" | "W" | "SV" | "K" | "ERA" | "WHIP";

type CategoryStandingRow = {
  teamCode: string;
  teamName: string;
  value: number;
  rank: number; // 1..N after sorting (ties share rank range)
  points: number; // roto points (N..1, ties averaged)
};

type CategoryStandingTable = {
  key: CategoryKey;
  label: string;
  group: "H" | "P";
  higherIsBetter: boolean;
  rows: CategoryStandingRow[];
};

type PeriodCategoryStandingsResponse = {
  periodId: string; // canonical "P1"
  periodNum: number; // canonical 1
  teamCount: number;
  categories: CategoryStandingTable[];
};

function detectPitcherRow(r: AnyRow): boolean {
  const g = norm(r?.group).toUpperCase();
  if (g === "P") return true;
  if (g === "H") return false;

  if (typeof r?.is_pitcher === "boolean") return r.is_pitcher;
  if (typeof r?.isPitcher === "boolean") return r.isPitcher;

  const flag = norm(r?.is_pitcher ?? r?.isPitcher);
  if (flag) return toBool(flag);

  const ip = parseIp(r?.IP ?? r?.inningsPitched);
  if (ip > 0) return true;

  const pos = norm(r?.positions ?? r?.pos);
  if (pos === "P") return true;

  return false;
}

function periodIdFromRow(r: AnyRow): number | null {
  const x =
    r?.period_id ??
    r?.periodId ??
    r?.period ??
    r?.pid ??
    r?.period_code ??
    r?.periodCode ??
    r?.period_name ??
    r?.periodName ??
    r?.period_label ??
    r?.periodLabel;

  return parsePeriodIdParam(x);
}

function teamCodeFromRow(r: AnyRow): string {
  return normCode(r?.ogba_team_code ?? r?.team ?? r?.teamCode ?? r?.team_code ?? r?.code ?? "");
}

function buildTeamNameMap(seasonStandings: any, seasonStats: SeasonStatRow[]): Record<string, string> {
  const map: Record<string, string> = {};

  if (Array.isArray(seasonStandings)) {
    for (const row of seasonStandings) {
      const code = teamCodeFromRow(row);
      const name = norm(row?.teamName ?? row?.team_name ?? row?.name ?? row?.team ?? "");
      if (code && name) map[code] = name;
    }
  }

  for (const r of seasonStats) {
    const code = normCode(r?.ogba_team_code ?? "");
    if (!code) continue;
    if (!map[code]) map[code] = code;
  }

  return map;
}

function roundKey(v: number, places = 6): number {
  const p = Math.pow(10, places);
  return Math.round(v * p) / p;
}

function rankPoints(
  teams: Array<{ teamCode: string; value: number }>,
  higherIsBetter: boolean,
  totalTeams: number
): { pointsByTeam: Record<string, number>; rankByTeam: Record<string, number> } {
  const sorted = [...teams].sort((a, b) => {
    if (a.value === b.value) return 0;
    return higherIsBetter ? b.value - a.value : a.value - b.value;
  });

  const pointsByTeam: Record<string, number> = {};
  const rankByTeam: Record<string, number> = {};

  const pointForRank = (rank: number) => totalTeams - rank + 1;

  let i = 0;
  while (i < sorted.length) {
    let j = i;

    const v0 = roundKey(sorted[i].value, 6);
    while (j + 1 < sorted.length && roundKey(sorted[j + 1].value, 6) === v0) j++;

    const rankStart = i + 1;
    const rankEnd = j + 1;

    let sum = 0;
    for (let r = rankStart; r <= rankEnd; r++) sum += pointForRank(r);
    const avg = sum / (rankEnd - rankStart + 1);

    for (let k = i; k <= j; k++) {
      pointsByTeam[sorted[k].teamCode] = avg;
      rankByTeam[sorted[k].teamCode] = rankStart;
    }

    i = j + 1;
  }

  return { pointsByTeam, rankByTeam };
}

// ----------------------------
// Main
// ----------------------------
async function main() {
  const app = express();

  app.set("trust proxy", 1);

  const origin = process.env.CLIENT_URL || "http://localhost:5173";
  app.use(
    cors({
      origin,
      credentials: true,
    })
  );

  app.use(cookieParser());
  app.use(express.json());

  app.use(attachUser);

  app.use("/api", authRouter);
  app.use("/api", publicRouter);
  app.use("/api", leaguesRouter);
  app.use("/api", adminRouter);
  app.use("/api", commissionerRouter);
  app.use("/api", transactionsRouter);
  app.use("/api", standingsRouter);
  app.use("/api", tradesRouter);
  app.use("/api", archiveRouter);


  const seasonFilePreferred = "ogba_player_season_totals_2025_with_meta.csv";
  const seasonFileFallback = "ogba_player_season_totals_2025.csv";
  const seasonPath = fs.existsSync(resolveDataFile(seasonFilePreferred))
    ? resolveDataFile(seasonFilePreferred)
    : resolveDataFile(seasonFileFallback);

  const auctionPath = resolveDataFile("ogba_auction_values_2025.csv");
  const periodPath = resolveDataFile("ogba_player_period_totals_2025.csv");
  const standingsPath = resolveDataFile("ogba_season_standings_2025.json");

  const auctionValues = parseCsv(fs.readFileSync(auctionPath, "utf-8"));
  const seasonStatsRaw = parseCsv(fs.readFileSync(seasonPath, "utf-8"));
  const periodStats = parseCsv(fs.readFileSync(periodPath, "utf-8"));
  const seasonStandings = JSON.parse(fs.readFileSync(standingsPath, "utf-8"));

  const mlbIds = seasonStatsRaw.map((r) => String(r?.mlb_id ?? r?.mlbId ?? "").trim()).filter(Boolean);
  const teamCache = await warmMlbTeamCache(mlbIds);

  const seasonStats: SeasonStatRow[] = seasonStatsRaw.map((r: AnyRow) => {
    const mlb_id = String(r.mlb_id ?? r.mlbId ?? "").trim();

    const cachedTeam = teamCache[mlb_id] || "";
    const existingTeam = String(r.mlb_team ?? r.mlbTeam ?? "").trim();
    const tm = existingTeam || cachedTeam;

    return {
      ...r,
      mlb_id,
      player_name: r.player_name ?? r.name ?? r.playerName ?? "",
      ogba_team_code: r.ogba_team_code ?? r.team ?? "",
      positions: r.positions ?? r.pos ?? "",
      is_pitcher: toBool(r.is_pitcher ?? r.isPitcher),
      group: r.group === "P" || r.group === "H" ? r.group : undefined,

      AB: toNum(r.AB),
      H: toNum(r.H),
      R: toNum(r.R),
      HR: toNum(r.HR),
      RBI: toNum(r.RBI),
      SB: toNum(r.SB),
      AVG: toNum(r.AVG),

      W: toNum(r.W),
      SV: toNum(r.SV),
      K: toNum(r.K),
      ERA: toNum(r.ERA),
      WHIP: toNum(r.WHIP),

      IP: r.IP,
      ER: r.ER,
      BB_H: r.BB_H,

      mlb_team: tm,
      mlbTeam: tm,
    };
  });

  const teamNameMap = buildTeamNameMap(seasonStandings, seasonStats);

  console.log(`Loaded ${auctionValues.length} auction values from ${path.basename(auctionPath)}`);
  console.log(`Loaded ${seasonStats.length} season stat rows from ${path.basename(seasonPath)}`);
  console.log(
    `Loaded ${Array.isArray(seasonStandings) ? seasonStandings.length : 0} season standings rows from ${path.basename(
      standingsPath
    )}`
  );
  console.log(`Loaded ${periodStats.length} period stat rows from ${path.basename(periodPath)}`);
  console.log(`Team cache file: ${TEAM_CACHE_FILE}`);


  const server = app.listen(PORT, () => {
    console.log(`🔥 FBST server listening on http://localhost:${PORT}`);
  });

  server.on("error", (err: any) => {
    if (err?.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Run: lsof -nP -iTCP:${PORT} -sTCP:LISTEN`);
      process.exit(1);
    }
    console.error("Server listen error:", err);
    process.exit(1);
  });
}

main().catch((e) => {
  console.error("Fatal server startup error:", e);
  process.exit(1);
});
