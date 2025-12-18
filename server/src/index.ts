// server/src/index.ts
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

type AnyRow = Record<string, any>;

type SeasonStatRow = {
  mlb_id: string;
  player_name?: string;
  name?: string;

  ogba_team_code?: string;
  team?: string;

  positions?: string;
  pos?: string;

  is_pitcher?: boolean;
  isPitcher?: boolean;
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
  ERA?: number;
  WHIP?: number;

  // extras requested
  GS?: number; // grand slams (if you later populate)
  SO?: number; // shutouts (if you later populate)

  // mlb team abbr (optional)
  mlb_team?: string;
  mlbTeam?: string;

  [k: string]: any;
};

type CareerFantasyRowH = {
  YR: string;     // "2018"..."2025" plus "TOT"
  TM: string;     // "KC", "BAL", "TOT", etc.
  DH?: number; C?: number; "1B"?: number; "2B"?: number; "3B"?: number; SS?: number; OF?: number;
  AB: number; H: number; R: number; HR: number; RBI: number; SB: number; AVG: number;
};

type CareerFantasyRowP = {
  YR: string;
  TM: string;
  W: number; SV: number; K: number; ERA: number; WHIP: number; SO: number;
};

const PORT = Number(process.env.PORT || 4000);
const MLB_BASE = "https://statsapi.mlb.com/api/v1";

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

function resolveDataFile(filename: string): string {
  // Tries common locations
  const candidates = [
    path.join(process.cwd(), filename),
    path.join(process.cwd(), "src", "data", filename),
    path.join(process.cwd(), "data", filename),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  // Fallback (lets readFile throw a clear error)
  return candidates[0];
}

// ----------------------------
// MLB fetch with tiny cache
// ----------------------------
const mlbCache = new Map<string, { ts: number; data: any }>();
async function mlbGetJson(url: string): Promise<any> {
  const now = Date.now();
  const cached = mlbCache.get(url);
  if (cached && now - cached.ts < 10 * 60 * 1000) return cached.data; // 10 min
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`MLB API ${resp.status} for ${url}`);
  const data = await resp.json();
  mlbCache.set(url, { ts: now, data });
  return data;
}

function safeTeamAbbr(team: any): string {
  // MLB API returns team objects with abbreviation sometimes; fallback to name.
  if (!team) return "";
  return String(team.abbreviation || team.abbrev || team.teamCode || team.name || "").trim();
}

function mapPosToBucket(posAbbr: string): "DH" | "C" | "1B" | "2B" | "3B" | "SS" | "OF" | null {
  const p = posAbbr.toUpperCase();
  if (p === "DH") return "DH";
  if (p === "C") return "C";
  if (p === "1B") return "1B";
  if (p === "2B") return "2B";
  if (p === "3B") return "3B";
  if (p === "SS") return "SS";
  if (p === "OF" || p === "LF" || p === "CF" || p === "RF") return "OF";
  return null;
}

// ----------------------------
// Career builder (fantasy columns)
// ----------------------------
async function getCareerFantasyRows(mlbId: string, group: "hitting" | "pitching") {
  // One call, hydrate yearByYear for hitting/pitching/fielding
  const url =
    `${MLB_BASE}/people/${encodeURIComponent(mlbId)}` +
    `?hydrate=stats(type=[yearByYear],group=[hitting,pitching,fielding])`;

  const data = await mlbGetJson(url);
  const person = data?.people?.[0];
  const statsArr: any[] = person?.stats ?? [];

  const pick = (grpName: string) =>
    statsArr.find(
      (s) =>
        String(s?.type?.displayName || "").toLowerCase().includes("yearbyyear") &&
        String(s?.group?.displayName || "").toLowerCase() === grpName
    );

  const hitting = pick("hitting");
  const pitching = pick("pitching");
  const fielding = pick("fielding");

  // Build season -> position games map (optional)
  const posBySeason = new Map<string, { DH: number; C: number; "1B": number; "2B": number; "3B": number; SS: number; OF: number }>();
  for (const sp of fielding?.splits ?? []) {
    const season = String(sp?.season || "").trim();
    if (!season) continue;
    const posAbbr = String(sp?.position?.abbreviation || "").trim();
    const bucket = mapPosToBucket(posAbbr);
    if (!bucket) continue;
    const g = toNum(sp?.stat?.games);
    const cur =
      posBySeason.get(season) ?? { DH: 0, C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 0, OF: 0 };
    cur[bucket] += g;
    posBySeason.set(season, cur);
  }

  if (group === "hitting") {
    // Aggregate per season (year-per-line) across team stints.
    const agg = new Map<string, { teams: Set<string>; AB: number; H: number; R: number; HR: number; RBI: number; SB: number }>();
    for (const sp of hitting?.splits ?? []) {
      const season = String(sp?.season || "").trim();
      if (!season) continue;

      // Filter out non-MLB leagues when possible (AL/NL ids: 103/104). If missing, keep.
      const lgId = sp?.league?.id;
      if (lgId && lgId !== 103 && lgId !== 104) continue;

      const teamAbbr = safeTeamAbbr(sp?.team);
      const cur =
        agg.get(season) ?? { teams: new Set<string>(), AB: 0, H: 0, R: 0, HR: 0, RBI: 0, SB: 0 };
      if (teamAbbr) cur.teams.add(teamAbbr);
      cur.AB += toNum(sp?.stat?.atBats);
      cur.H += toNum(sp?.stat?.hits);
      cur.R += toNum(sp?.stat?.runs);
      cur.HR += toNum(sp?.stat?.homeRuns);
      cur.RBI += toNum(sp?.stat?.rbi);
      cur.SB += toNum(sp?.stat?.stolenBases);
      agg.set(season, cur);
    }

    // Build rows oldest -> newest
    const years = [...agg.keys()].sort((a, b) => toNum(a) - toNum(b));
    const rows: CareerFantasyRowH[] = [];

    let totAB = 0, totH = 0, totR = 0, totHR = 0, totRBI = 0, totSB = 0;

    for (const yr of years) {
      const a = agg.get(yr)!;
      const teams = [...a.teams].filter(Boolean);
      const tm = teams.length === 1 ? teams[0] : teams.length > 1 ? "TOT" : "";

      const pos = posBySeason.get(yr) ?? { DH: 0, C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 0, OF: 0 };

      totAB += a.AB; totH += a.H; totR += a.R; totHR += a.HR; totRBI += a.RBI; totSB += a.SB;

      rows.push({
        YR: yr,
        TM: tm,
        DH: pos.DH || 0,
        C: pos.C || 0,
        "1B": pos["1B"] || 0,
        "2B": pos["2B"] || 0,
        "3B": pos["3B"] || 0,
        SS: pos.SS || 0,
        OF: pos.OF || 0,
        AB: a.AB,
        H: a.H,
        R: a.R,
        HR: a.HR,
        RBI: a.RBI,
        SB: a.SB,
        AVG: a.AB ? a.H / a.AB : 0,
      });
    }

    // Career totals row at bottom
    rows.push({
      YR: "TOT",
      TM: "",
      DH: 0, C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 0, OF: 0,
      AB: totAB,
      H: totH,
      R: totR,
      HR: totHR,
      RBI: totRBI,
      SB: totSB,
      AVG: totAB ? totH / totAB : 0,
    });

    return rows;
  }

  // pitching
  {
    const agg = new Map<string, { teams: Set<string>; W: number; SV: number; K: number; ER: number; IP: number; BB: number; H: number; SO: number }>();
    for (const sp of pitching?.splits ?? []) {
      const season = String(sp?.season || "").trim();
      if (!season) continue;

      const lgId = sp?.league?.id;
      if (lgId && lgId !== 103 && lgId !== 104) continue;

      const teamAbbr = safeTeamAbbr(sp?.team);
      const cur =
        agg.get(season) ?? { teams: new Set<string>(), W: 0, SV: 0, K: 0, ER: 0, IP: 0, BB: 0, H: 0, SO: 0 };
      if (teamAbbr) cur.teams.add(teamAbbr);

      cur.W += toNum(sp?.stat?.wins);
      cur.SV += toNum(sp?.stat?.saves);
      cur.K += toNum(sp?.stat?.strikeOuts);

      cur.ER += toNum(sp?.stat?.earnedRuns);
      cur.IP += toNum(sp?.stat?.inningsPitched);

      cur.BB += toNum(sp?.stat?.baseOnBalls);
      cur.H += toNum(sp?.stat?.hits);

      cur.SO += toNum(sp?.stat?.shutouts); // shutouts
      agg.set(season, cur);
    }

    const years = [...agg.keys()].sort((a, b) => toNum(a) - toNum(b));
    const rows: CareerFantasyRowP[] = [];

    let totW = 0, totSV = 0, totK = 0, totER = 0, totIP = 0, totBB = 0, totH = 0, totSO = 0;

    for (const yr of years) {
      const a = agg.get(yr)!;
      const teams = [...a.teams].filter(Boolean);
      const tm = teams.length === 1 ? teams[0] : teams.length > 1 ? "TOT" : "";

      totW += a.W; totSV += a.SV; totK += a.K; totER += a.ER; totIP += a.IP; totBB += a.BB; totH += a.H; totSO += a.SO;

      const era = a.IP ? (a.ER * 9) / a.IP : 0;
      const whip = a.IP ? (a.BB + a.H) / a.IP : 0;

      rows.push({
        YR: yr,
        TM: tm,
        W: a.W,
        SV: a.SV,
        K: a.K,
        ERA: era,
        WHIP: whip,
        SO: a.SO,
      });
    }

    const totEra = totIP ? (totER * 9) / totIP : 0;
    const totWhip = totIP ? (totBB + totH) / totIP : 0;

    rows.push({
      YR: "TOT",
      TM: "",
      W: totW,
      SV: totSV,
      K: totK,
      ERA: totEra,
      WHIP: totWhip,
      SO: totSO,
    });

    return rows;
  }
}

// ----------------------------
// Main
// ----------------------------
async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Load your league data
  const auctionPath = resolveDataFile("ogba_auction_values_2025.csv");
  const seasonPath = resolveDataFile("ogba_player_season_totals_2025.csv");
  const periodPath = resolveDataFile("ogba_player_period_totals_2025.csv");
  const standingsPath = resolveDataFile("ogba_season_standings_2025.json");

  const auctionValues = parseCsv(fs.readFileSync(auctionPath, "utf-8"));
  const seasonStatsRaw = parseCsv(fs.readFileSync(seasonPath, "utf-8"));
  const periodStats = parseCsv(fs.readFileSync(periodPath, "utf-8"));
  const seasonStandings = JSON.parse(fs.readFileSync(standingsPath, "utf-8"));

  const seasonStats: SeasonStatRow[] = seasonStatsRaw.map((r: AnyRow) => {
    const mlb_id = String(r.mlb_id ?? r.mlbId ?? "").trim();
    const row: SeasonStatRow = {
      ...r,
      mlb_id,
      player_name: r.player_name ?? r.name ?? r.playerName ?? "",
      ogba_team_code: r.ogba_team_code ?? r.team ?? "",
      positions: r.positions ?? r.pos ?? "",
      is_pitcher: toBool(r.is_pitcher ?? r.isPitcher),
      group: (r.group === "P" || r.group === "H") ? r.group : undefined,

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

      GS: r.GS === "" || r.GS === undefined ? undefined : toNum(r.GS),
      SO: r.SO === "" || r.SO === undefined ? undefined : toNum(r.SO),

      mlb_team: String(r.mlb_team ?? r.mlbTeam ?? "").trim(),
      mlbTeam: String(r.mlbTeam ?? r.mlb_team ?? "").trim(),
    };
    return row;
  });

  console.log(`Loaded ${auctionValues.length} auction values from ${path.basename(auctionPath)}`);
  console.log(`Loaded ${seasonStats.length} season stat rows from ${path.basename(seasonPath)}`);
  console.log(`Loaded ${Array.isArray(seasonStandings) ? seasonStandings.length : 0} season standings rows from ${standingsPath}`);
  console.log(`Loaded ${periodStats.length} period stat rows from ${path.basename(periodPath)}`);

  // Existing endpoints
  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      auctionValues: auctionValues.length,
      seasonStats: seasonStats.length,
      seasonStandings: Array.isArray(seasonStandings) ? seasonStandings.length : 0,
      periodStats: periodStats.length,
    });
  });

  app.get("/api/auction-values", (_req, res) => res.json(auctionValues));
  app.get("/api/player-season-stats", (_req, res) => res.json(seasonStats));
  app.get("/api/player-period-stats", (_req, res) => res.json(periodStats));
  app.get("/api/season-standings", (_req, res) => res.json(seasonStandings));

  // NEW: Career stats (fantasy columns) with oldest->newest and totals row at bottom
  app.get("/api/player-career-stats/:mlbId", async (req, res) => {
    try {
      const mlbId = String(req.params.mlbId).trim();
      const group = (String(req.query.group || "hitting").toLowerCase() === "pitching") ? "pitching" : "hitting";
      const rows = await getCareerFantasyRows(mlbId, group);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Failed to load career stats" });
    }
  });

  app.listen(PORT, () => {
    console.log(`🔥 FBST server listening on http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error("Fatal server startup error:", e);
  process.exit(1);
});
