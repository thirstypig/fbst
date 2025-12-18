// client/src/api.ts
// Canonical client API layer for FBST.
//
// Backend endpoints (local):
// - GET /api/health
// - GET /api/auction-values
// - GET /api/player-season-stats
// - GET /api/player-period-stats
// - GET /api/season-standings
// - (optional) GET /api/period-standings?periodId=1   (if you add it server-side later)
//
// MLB Stats API (public):
// - Profile + career/year-by-year + recent date-range stats

export type HOrP = "hitting" | "pitching";

const API_BASE: string =
  (import.meta as any).env?.VITE_API_BASE ??
  (import.meta as any).env?.VITE_API_BASE_URL ??
  "http://localhost:4000/api";

const MLB_API_BASE = "https://statsapi.mlb.com/api/v1";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });

  // Try JSON first, then fall back to text (useful when server returns HTML error pages)
  const text = await res.text();
  const maybeJson = (() => {
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  })();

  if (!res.ok) {
    const msg =
      (maybeJson && (maybeJson.error || maybeJson.message)) ||
      (text ? `HTTP ${res.status} for ${url} — ${text.slice(0, 180)}` : `HTTP ${res.status} for ${url}`);
    throw new Error(msg);
  }

  return (maybeJson ?? ({} as any)) as T;
}

function toNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmt3Avg(h: number, ab: number): string {
  if (!ab) return ".000";
  const s = (h / ab).toFixed(3);
  // MLB-style leading zero drop
  return s.startsWith("0") ? s.slice(1) : s;
}

function fmt2(v: number): string {
  if (!Number.isFinite(v)) return "";
  return v.toFixed(2);
}

function yyyyMmDd(d: Date): string {
  // local date, not UTC
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(d: Date, delta: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + delta);
  return x;
}

function roleFromRow(row: any): "H" | "P" {
  // Prefer explicit group when present; else derive from is_pitcher
  const g = String(row?.group ?? "").trim().toUpperCase();
  if (g === "P") return "P";
  if (g === "H") return "H";
  return Boolean(row?.is_pitcher ?? row?.isPitcher) ? "P" : "H";
}

function normalizeTwoWayRow(row: any): PlayerSeasonStat {
  const mlb_id = String(row?.mlb_id ?? row?.mlbId ?? "").trim();
  const role = roleFromRow(row); // H or P

  // Force consistent pitcher identity (prevents "Ohtani pitcher row shows DH")
  const is_pitcher = role === "P";
  const positions = is_pitcher ? "P" : String(row?.positions ?? row?.pos ?? "").trim();

  const player_name = String(row?.player_name ?? row?.name ?? "").trim();

  const out: PlayerSeasonStat = {
    // identity
    mlb_id,
    row_id: `${mlb_id}-${role}`, // UNIQUE key per role (H/P)
    player_name,
    ogba_team_code: String(row?.ogba_team_code ?? row?.team ?? "").trim(),
    group: role,

    // flags
    is_pitcher,

    // display / misc
    positions,
    mlb_team: String(row?.mlb_team ?? row?.mlbTeam ?? "").trim(),
    mlbTeam: String(row?.mlbTeam ?? row?.mlb_team ?? "").trim(),

    // hitter stats (season totals CSV style)
    AB: row?.AB,
    H: row?.H,
    R: row?.R,
    HR: row?.HR,
    RBI: row?.RBI,
    SB: row?.SB,
    AVG: row?.AVG,

    // pitcher stats (season totals CSV style)
    W: row?.W,
    SV: row?.SV,
    K: row?.K,
    IP: row?.IP,
    ER: row?.ER,
    ERA: row?.ERA,
    BB_H: row?.BB_H,
    WHIP: row?.WHIP,

    // auction value fields (auction CSV style)
    dollar_value: row?.dollar_value ?? row?.value,
    value: row?.value,
    z_total: row?.z_total ?? row?.relValue,

    // any other passthrough
    GS: row?.GS,
    SO: row?.SO,
    pos: row?.pos,
    name: row?.name,
    team: row?.team,
    isPitcher: row?.isPitcher,
  };

  return out;
}

function dedupeByRowId(
  rows: PlayerSeasonStat[],
  mode: "season" | "auction" = "season"
): PlayerSeasonStat[] {
  // Prevent React "duplicate key" warnings and duplicate rows in tables.
  // Keep the "best" duplicate instead of arbitrarily keeping the first one.
  const m = new Map<string, PlayerSeasonStat>();

  function score(r: PlayerSeasonStat): number {
    if (mode === "auction") return toNum((r as any).dollar_value ?? (r as any).value);
    // season: prefer the row that looks more “real”
    return (
      toNum((r as any).AB) +
      toNum((r as any).H) +
      toNum((r as any).IP) +
      toNum((r as any).K) +
      toNum((r as any).R) +
      toNum((r as any).HR) +
      toNum((r as any).RBI)
    );
  }

  for (const r of rows) {
    const k =
      String(r.row_id ?? "").trim() ||
      `${r.mlb_id}-${r.group ?? (r.is_pitcher ? "P" : "H")}`;

    const prev = m.get(k);
    if (!prev) {
      m.set(k, r);
      continue;
    }
    if (score(r) >= score(prev)) m.set(k, r);
  }

  return Array.from(m.values());
}

/** ---------- Public Types ---------- */

export type PlayerSeasonStat = {
  // identity
  mlb_id: string;
  row_id: string; // unique per (mlb_id, role) — use this as React key
  player_name?: string;
  ogba_team_code?: string;

  // role flags
  group?: "H" | "P";
  is_pitcher?: boolean;

  // display / convenience (some older code uses these)
  positions?: string;
  mlb_team?: string;
  mlbTeam?: string;

  // hitters
  AB?: number | string;
  H?: number | string;
  R?: number | string;
  HR?: number | string;
  RBI?: number | string;
  SB?: number | string;
  AVG?: number | string;

  // pitchers
  W?: number | string;
  SV?: number | string;
  K?: number | string;
  IP?: number | string;
  ER?: number | string;
  ERA?: number | string;
  BB_H?: number | string;
  WHIP?: number | string;

  // auction fields
  dollar_value?: number | string;
  value?: number | string;
  z_total?: number | string;

  // misc passthroughs used in UI helpers
  GS?: any;
  SO?: any;

  // older aliases (safe to keep)
  pos?: any;
  name?: any;
  team?: any;
  isPitcher?: any;
};

export type SeasonStandingRow = Record<string, any>;
export type PeriodStatRow = Record<string, any>;

export type PlayerProfile = {
  mlbId: string;
  fullName: string;
  currentTeam?: string;
  primaryPosition?: string;
  bats?: string;
  throws?: string;
  height?: string;
  weight?: string;
  birthDate?: string;
  mlbDebutDate?: string;
};

export type CareerHittingRow = {
  year: string; // "2018"..."2025" and "TOT"
  tm: string;
  G: number;
  AB: number;
  R: number;
  H: number;
  d2B: number;
  d3B: number;
  HR: number;
  RBI: number;
  SB: number;
  CS: number;
  BB: number;
  SO: number;
  AVG: string;
  OBP: string;
  SLG: string;
};

export type CareerPitchingRow = {
  year: string; // "2018"..."2025" and "TOT"
  tm: string;
  G: number;
  GS: number;
  W: number;
  L: number;
  SV: number;
  IP: number;
  H: number;
  ER: number;
  HR: number;
  BB: number;
  SO: number;
  ERA: string;
  WHIP: string;
};

export type RecentHittingRow = {
  label: string; // Last 7 days, ...
  AB: number;
  H: number;
  R: number;
  HR: number;
  RBI: number;
  SB: number;
  AVG: string;
};

export type RecentPitchingRow = {
  label: string; // Last 7 days, ...
  IP: number;
  W: number;
  SV: number;
  K: number;
  ERA: string; // 2 decimals
  WHIP: string; // 2 decimals
};

/** ---------- Stable React key helper ---------- */

// Preferred usage: playerKey(player)
export function playerKey(p: PlayerSeasonStat): string;
// Back-compat usage: playerKey({ mlb_id, is_pitcher })
export function playerKey(p: { mlb_id: string; is_pitcher: boolean }): string;
export function playerKey(p: any): string {
  if (!p) return "—";
  if (typeof p.row_id === "string" && p.row_id.trim()) return p.row_id.trim();

  const mlb = String(p.mlb_id ?? "").trim();
  const isP = Boolean(p.is_pitcher ?? p.isPitcher);
  const role = isP ? "P" : "H";
  return `${mlb}-${role}`;
}

/** ---------- Backend: season/period/auction ---------- */

let _seasonStatsCache: Promise<PlayerSeasonStat[]> | null = null;
let _periodStatsCache: Promise<PeriodStatRow[]> | null = null;

export async function getHealth(): Promise<any> {
  return fetchJson(`${API_BASE}/health`);
}

export async function getAuctionValues(): Promise<PlayerSeasonStat[]> {
  const raw = await fetchJson<any[]>(`${API_BASE}/auction-values`);
  return dedupeByRowId((raw ?? []).map(normalizeTwoWayRow), "auction");
}

export async function getPlayerSeasonStats(): Promise<PlayerSeasonStat[]> {
  if (!_seasonStatsCache) {
    _seasonStatsCache = (async () => {
      const raw = await fetchJson<any[]>(`${API_BASE}/player-season-stats`);
      return dedupeByRowId((raw ?? []).map(normalizeTwoWayRow), "season");
    })();
  }
  return _seasonStatsCache;
}

export async function getSeasonStandings(): Promise<SeasonStandingRow[]> {
  return fetchJson(`${API_BASE}/season-standings`);
}

export async function getPlayerPeriodStats(): Promise<PeriodStatRow[]> {
  if (!_periodStatsCache) {
    _periodStatsCache = fetchJson(`${API_BASE}/player-period-stats`);
  }
  return _periodStatsCache;
}

/**
 * Team roster is derived client-side from season totals.
 * (No server /api/team-roster needed.)
 */
export async function getTeamRoster(teamCode: string): Promise<PlayerSeasonStat[]> {
  const code = String(teamCode ?? "").trim().toUpperCase();
  const all = await getPlayerSeasonStats();
  return all.filter((p) => String(p.ogba_team_code ?? "").trim().toUpperCase() === code);
}

/** ---------- Period standings (client fallback) ---------- */

type CategoryId = "R" | "HR" | "RBI" | "SB" | "AVG" | "W" | "S" | "K" | "ERA" | "WHIP";

type PeriodTeamRow = {
  teamId: number;
  teamName: string;
  stats: Record<CategoryId, number>;
  points: Record<CategoryId, number>;
  totalPoints: number;
};

type PeriodStandingsResponse = {
  periodId: number;
  periodName?: string;
  rows: PeriodTeamRow[];
};

function isFinitePos(n: number) {
  return Number.isFinite(n) && n > 0;
}

function rankPoints(
  teams: Array<{ team: string; value: number }>,
  higherIsBetter: boolean,
  totalTeams: number
): Record<string, number> {
  // Roto points: best gets N, worst gets 1. Ties average the tied point slots.
  const sorted = [...teams].sort((a, b) => {
    if (a.value === b.value) return 0;
    return higherIsBetter ? b.value - a.value : a.value - b.value;
  });

  const ptsByTeam: Record<string, number> = {};
  let i = 0;

  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].value === sorted[i].value) j++;

    // ranks are 1..N (i is 0-based)
    const rankStart = i + 1;
    const rankEnd = j + 1;

    const pointForRank = (rank: number) => totalTeams - rank + 1; // rank 1 => N points

    // average points across tied ranks
    let sum = 0;
    for (let r = rankStart; r <= rankEnd; r++) sum += pointForRank(r);
    const avg = sum / (rankEnd - rankStart + 1);

    for (let k = i; k <= j; k++) {
      ptsByTeam[sorted[k].team] = avg;
    }

    i = j + 1;
  }

  return ptsByTeam;
}

function parseIp(ip: any): number {
  const s = String(ip ?? "").trim();
  if (!s) return 0;
  const parts = s.split(".");
  const whole = Number(parts[0] ?? 0) || 0;
  const frac = Number(parts[1] ?? 0) || 0;
  if (frac === 1) return whole + 1 / 3;
  if (frac === 2) return whole + 2 / 3;
  return Number.isFinite(Number(s)) ? Number(s) : whole;
}

export async function getPeriodStandings(periodId: number): Promise<PeriodStandingsResponse> {
  const pid = Number(periodId);
  if (!Number.isFinite(pid)) throw new Error("Invalid periodId");

  // If you later add a server endpoint, this will use it automatically.
  try {
    const url = `${API_BASE}/period-standings?periodId=${pid}`;
    const serverResp = await fetchJson<any>(url);
    if (serverResp?.rows?.length) return serverResp as PeriodStandingsResponse;
  } catch {
    // fall through to client-computed standings
  }

  const raw = await getPlayerPeriodStats();

  // Filter rows for this period (try common field names)
  const rows = (raw ?? []).filter((r: any) => {
    const x = r?.period_id ?? r?.periodId ?? r?.period ?? r?.pid;
    return Number(x) === pid;
  });

  // Aggregate by team code
  const byTeam = new Map<
    string,
    {
      // counting totals
      R: number;
      HR: number;
      RBI: number;
      SB: number;
      W: number;
      S: number;
      K: number;

      // ratio components
      AB: number;
      H: number;

      IP: number;
      ER: number;
      PH: number; // pitcher hits
      PBB: number; // pitcher BB
    }
  >();

  function teamCodeOf(r: any): string {
    const code = String(r?.ogba_team_code ?? r?.team ?? r?.teamCode ?? r?.team_code ?? "").trim().toUpperCase();
    return code || "FA";
  }

  for (const r of rows as any[]) {
    const team = teamCodeOf(r);
    if (!byTeam.has(team)) {
      byTeam.set(team, {
        R: 0,
        HR: 0,
        RBI: 0,
        SB: 0,
        W: 0,
        S: 0,
        K: 0,
        AB: 0,
        H: 0,
        IP: 0,
        ER: 0,
        PH: 0,
        PBB: 0,
      });
    }
    const t = byTeam.get(team)!;

    // Counting cats
    t.R += toNum(r.R);
    t.HR += toNum(r.HR);
    t.RBI += toNum(r.RBI);
    t.SB += toNum(r.SB);

    t.W += toNum(r.W);
    t.S += toNum(r.S ?? r.SV ?? r.saves);
    t.K += toNum(r.K);

    // Hitting ratios
    const AB = toNum(r.AB ?? r.atBats);
    const H = toNum(r.H ?? r.hits);
    if (AB > 0) {
      t.AB += AB;
      t.H += H;
    } else {
      // fallback: if AVG + AB exists, derive H
      const avg = toNum(r.AVG ?? r.avg);
      const ab2 = toNum(r.AB);
      if (ab2 > 0 && avg > 0) {
        t.AB += ab2;
        t.H += avg * ab2;
      }
    }

    // Pitching ratios
    const ip = parseIp(r.IP ?? r.inningsPitched);
    if (ip > 0) {
      t.IP += ip;

      // Prefer direct ER/H/BB, else derive from ERA/WHIP
      const ER = toNum(r.ER ?? r.earnedRuns);
      if (ER > 0 || r.ER === 0) t.ER += ER;
      else {
        const era = toNum(r.ERA);
        if (era > 0) t.ER += (era * ip) / 9;
      }

      const PH = toNum(r.PH ?? r.H ?? r.hitsAllowed ?? r.hits);
      const PBB = toNum(r.BB ?? r.baseOnBalls);
      if (PH > 0 || PBB > 0 || r.BB === 0 || r.H === 0) {
        t.PH += PH;
        t.PBB += PBB;
      } else {
        const whip = toNum(r.WHIP);
        if (whip > 0) {
          const hb = whip * ip;
          // split evenly as a rough fallback
          t.PH += hb / 2;
          t.PBB += hb / 2;
        }
      }
    }
  }

  const teams = Array.from(byTeam.keys()).sort();
  const totalTeams = teams.length || 0;

  const statsByTeam: Record<string, Record<CategoryId, number>> = {};
  for (const team of teams) {
    const t = byTeam.get(team)!;

    const AVG = t.AB > 0 ? t.H / t.AB : 0;
    const ERA = isFinitePos(t.IP) ? (t.ER * 9) / t.IP : 0;
    const WHIP = isFinitePos(t.IP) ? (t.PH + t.PBB) / t.IP : 0;

    statsByTeam[team] = {
      R: t.R,
      HR: t.HR,
      RBI: t.RBI,
      SB: t.SB,
      AVG,
      W: t.W,
      S: t.S,
      K: t.K,
      ERA,
      WHIP,
    };
  }

  const cats: Array<{ id: CategoryId; higherIsBetter: boolean }> = [
    { id: "R", higherIsBetter: true },
    { id: "HR", higherIsBetter: true },
    { id: "RBI", higherIsBetter: true },
    { id: "SB", higherIsBetter: true },
    { id: "AVG", higherIsBetter: true },
    { id: "W", higherIsBetter: true },
    { id: "S", higherIsBetter: true },
    { id: "K", higherIsBetter: true },
    { id: "ERA", higherIsBetter: false },
    { id: "WHIP", higherIsBetter: false },
  ];

  const pointsByTeam: Record<string, Record<CategoryId, number>> = {};
  for (const team of teams) {
    pointsByTeam[team] = {
      R: 0,
      HR: 0,
      RBI: 0,
      SB: 0,
      AVG: 0,
      W: 0,
      S: 0,
      K: 0,
      ERA: 0,
      WHIP: 0,
    };
  }

  for (const c of cats) {
    const arr = teams.map((team) => ({ team, value: statsByTeam[team][c.id] ?? 0 }));
    const pts = rankPoints(arr, c.higherIsBetter, totalTeams);
    for (const team of teams) pointsByTeam[team][c.id] = pts[team] ?? 0;
  }

  const outRows: PeriodTeamRow[] = teams.map((team, idx) => {
    const s = statsByTeam[team];
    const p = pointsByTeam[team];
    const totalPoints = Object.values(p).reduce((a, v) => a + (Number.isFinite(v) ? v : 0), 0);

    return {
      teamId: idx + 1,
      teamName: team,
      stats: s,
      points: p,
      totalPoints,
    };
  });

  // sort high -> low
  outRows.sort((a, b) => b.totalPoints - a.totalPoints);

  return { periodId: pid, rows: outRows };
}

/** ---------- MLB Stats API: profile / career / recent ---------- */

// simple memoization to avoid re-fetching when you open/close modals a lot
const _mlbCache = new Map<string, Promise<any>>();

function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = _mlbCache.get(key);
  if (hit) return hit as Promise<T>;
  const p = fn();
  _mlbCache.set(key, p as any);
  return p;
}

export async function getPlayerProfile(mlbId: string): Promise<PlayerProfile> {
  const id = String(mlbId ?? "").trim();
  if (!id) throw new Error("Missing mlbId");

  return cached(`profile:${id}`, async () => {
    const data = await fetchJson<any>(`${MLB_API_BASE}/people/${id}`);
    const p = data?.people?.[0];
    if (!p) throw new Error(`No profile for mlbId=${id}`);

    return {
      mlbId: id,
      fullName: p.fullName ?? p.nameFirstLast ?? String(p.id ?? id),
      currentTeam: p?.currentTeam?.name,
      primaryPosition: p?.primaryPosition?.abbreviation ?? p?.primaryPosition?.name,
      bats: p?.batSide?.code,
      throws: p?.pitchHand?.code,
      height: p?.height,
      weight: p?.weight ? String(p.weight) : undefined,
      birthDate: p?.birthDate,
      mlbDebutDate: p?.mlbDebutDate,
    };
  });
}

function teamNameFromSplit(split: any): string {
  const t = split?.team;
  return t?.abbreviation || t?.teamName || t?.name || "—";
}

function ipToOneDecimal(ip: number): number {
  const whole = Math.floor(ip);
  const rem = ip - whole;
  if (Math.abs(rem - 1 / 3) < 1e-6) return Number(`${whole}.1`);
  if (Math.abs(rem - 2 / 3) < 1e-6) return Number(`${whole}.2`);
  return Number(ip.toFixed(1));
}

export async function getPlayerCareerStats(
  mlbId: string,
  group: HOrP
): Promise<{ rows: Array<CareerHittingRow | CareerPitchingRow> }> {
  const id = String(mlbId ?? "").trim();
  if (!id) throw new Error("Missing mlbId");

  return cached(`career:${id}:${group}`, async () => {
    const url = `${MLB_API_BASE}/people/${id}/stats?stats=yearByYear&group=${group}&gameType=R`;
    const data = await fetchJson<any>(url);
    const splits: any[] = data?.stats?.[0]?.splits ?? [];

    if (!splits.length) return { rows: [] };

    if (group === "hitting") {
      const rows: CareerHittingRow[] = splits
        .filter((s) => s?.season)
        .map((s) => {
          const st = s?.stat ?? {};
          const AB = toNum(st.atBats);
          const H = toNum(st.hits);
          const BB = toNum(st.baseOnBalls);
          const HBP = toNum(st.hitByPitch);
          const SF = toNum(st.sacFlies);

          const OBP = AB + BB + HBP + SF ? (H + BB + HBP) / (AB + BB + HBP + SF) : 0;

          const TB =
            toNum(st.totalBases) ||
            (H + toNum(st.doubles) + 2 * toNum(st.triples) + 3 * toNum(st.homeRuns));
          const SLG = AB ? TB / AB : 0;

          return {
            year: String(s.season),
            tm: teamNameFromSplit(s),
            G: toNum(st.gamesPlayed),
            AB,
            R: toNum(st.runs),
            H,
            d2B: toNum(st.doubles),
            d3B: toNum(st.triples),
            HR: toNum(st.homeRuns),
            RBI: toNum(st.rbi),
            SB: toNum(st.stolenBases),
            CS: toNum(st.caughtStealing),
            BB,
            SO: toNum(st.strikeOuts),
            AVG: fmt3Avg(H, AB),
            OBP: (OBP || 0).toFixed(3).replace(/^0/, ""),
            SLG: (SLG || 0).toFixed(3).replace(/^0/, ""),
          };
        });

      rows.sort((a, b) => Number(a.year) - Number(b.year));

      const totAB = rows.reduce((a, r) => a + r.AB, 0);
      const totH = rows.reduce((a, r) => a + r.H, 0);

      // TB approximation
      const totTB = rows.reduce((a, r) => a + (r.H + r.d2B + 2 * r.d3B + 3 * r.HR), 0);

      const totBB = rows.reduce((a, r) => a + r.BB, 0);
      const totOBP = totAB + totBB ? (totH + totBB) / (totAB + totBB) : 0;
      const totSLG = totAB ? totTB / totAB : 0;

      const totals: CareerHittingRow = {
        year: "TOT",
        tm: "",
        G: rows.reduce((a, r) => a + r.G, 0),
        AB: totAB,
        R: rows.reduce((a, r) => a + r.R, 0),
        H: totH,
        d2B: rows.reduce((a, r) => a + r.d2B, 0),
        d3B: rows.reduce((a, r) => a + r.d3B, 0),
        HR: rows.reduce((a, r) => a + r.HR, 0),
        RBI: rows.reduce((a, r) => a + r.RBI, 0),
        SB: rows.reduce((a, r) => a + r.SB, 0),
        CS: rows.reduce((a, r) => a + r.CS, 0),
        BB: totBB,
        SO: rows.reduce((a, r) => a + r.SO, 0),
        AVG: fmt3Avg(totH, totAB),
        OBP: totOBP.toFixed(3).replace(/^0/, ""),
        SLG: totSLG.toFixed(3).replace(/^0/, ""),
      };

      return { rows: [...rows, totals] };
    }

    // pitching
    const rows: CareerPitchingRow[] = splits
      .filter((s) => s?.season)
      .map((s) => {
        const st = s?.stat ?? {};
        const ip = parseIp(st.inningsPitched);

        const H = toNum(st.hits);
        const BB = toNum(st.baseOnBalls);
        const ER = toNum(st.earnedRuns);

        const ERA = ip ? (ER * 9) / ip : 0;
        const WHIP = ip ? (H + BB) / ip : 0;

        return {
          year: String(s.season),
          tm: teamNameFromSplit(s),
          G: toNum(st.gamesPlayed),
          GS: toNum(st.gamesStarted),
          W: toNum(st.wins),
          L: toNum(st.losses),
          SV: toNum(st.saves),
          IP: ipToOneDecimal(ip),
          H,
          ER,
          HR: toNum(st.homeRuns),
          BB,
          SO: toNum(st.strikeOuts),
          ERA: fmt2(ERA),
          WHIP: fmt2(WHIP),
        };
      });

    rows.sort((a, b) => Number(a.year) - Number(b.year));

    const totIP = rows.reduce((a, r) => a + parseIp(r.IP), 0);
    const totER = rows.reduce((a, r) => a + r.ER, 0);
    const totH = rows.reduce((a, r) => a + r.H, 0);
    const totBB = rows.reduce((a, r) => a + r.BB, 0);

    const totals: CareerPitchingRow = {
      year: "TOT",
      tm: "",
      G: rows.reduce((a, r) => a + r.G, 0),
      GS: rows.reduce((a, r) => a + r.GS, 0),
      W: rows.reduce((a, r) => a + r.W, 0),
      L: rows.reduce((a, r) => a + r.L, 0),
      SV: rows.reduce((a, r) => a + r.SV, 0),
      IP: ipToOneDecimal(totIP),
      H: totH,
      ER: totER,
      HR: rows.reduce((a, r) => a + r.HR, 0),
      BB: totBB,
      SO: rows.reduce((a, r) => a + r.SO, 0),
      ERA: fmt2(totIP ? (totER * 9) / totIP : 0),
      WHIP: fmt2(totIP ? (totH + totBB) / totIP : 0),
    };

    return { rows: [...rows, totals] };
  });
}

async function fetchDateRangeStat(mlbId: string, group: HOrP, start: string, end: string): Promise<any> {
  const url = `${MLB_API_BASE}/people/${mlbId}/stats?stats=byDateRange&group=${group}&gameType=R&startDate=${start}&endDate=${end}`;
  const data = await fetchJson<any>(url);
  const split = data?.stats?.[0]?.splits?.[0];
  return split?.stat ?? {};
}

async function fetchYtdStat(mlbId: string, group: HOrP): Promise<any> {
  const url = `${MLB_API_BASE}/people/${mlbId}/stats?stats=season&group=${group}&gameType=R`;
  const data = await fetchJson<any>(url);
  const split = data?.stats?.[0]?.splits?.[0];
  return split?.stat ?? {};
}

export async function getPlayerRecentStats(
  mlbId: string,
  group: HOrP
): Promise<{ rows: Array<RecentHittingRow | RecentPitchingRow> }> {
  const id = String(mlbId ?? "").trim();
  if (!id) throw new Error("Missing mlbId");

  return cached(`recent:${id}:${group}`, async () => {
    const today = new Date();

    const ranges: Array<{ label: string; days: number }> = [
      { label: "Last 7 days", days: 7 },
      { label: "Last 14 days", days: 14 },
      { label: "Last 21 days", days: 21 },
    ];

    const rows: any[] = [];

    for (const r of ranges) {
      const start = yyyyMmDd(addDays(today, -(r.days - 1)));
      const end = yyyyMmDd(today);

      const st = await fetchDateRangeStat(id, group, start, end);

      if (group === "hitting") {
        const AB = toNum(st.atBats);
        const H = toNum(st.hits);
        rows.push({
          label: r.label,
          AB,
          H,
          R: toNum(st.runs),
          HR: toNum(st.homeRuns),
          RBI: toNum(st.rbi),
          SB: toNum(st.stolenBases),
          AVG: fmt3Avg(H, AB),
        } satisfies RecentHittingRow);
      } else {
        const ip = parseIp(st.inningsPitched);
        const H = toNum(st.hits);
        const BB = toNum(st.baseOnBalls);
        const ER = toNum(st.earnedRuns);
        rows.push({
          label: r.label,
          IP: ipToOneDecimal(ip),
          W: toNum(st.wins),
          SV: toNum(st.saves),
          K: toNum(st.strikeOuts),
          ERA: fmt2(ip ? (ER * 9) / ip : 0),
          WHIP: fmt2(ip ? (H + BB) / ip : 0),
        } satisfies RecentPitchingRow);
      }
    }

    // YTD
    const ytd = await fetchYtdStat(id, group);
    if (group === "hitting") {
      const AB = toNum(ytd.atBats);
      const H = toNum(ytd.hits);
      rows.push({
        label: "YTD",
        AB,
        H,
        R: toNum(ytd.runs),
        HR: toNum(ytd.homeRuns),
        RBI: toNum(ytd.rbi),
        SB: toNum(ytd.stolenBases),
        AVG: fmt3Avg(H, AB),
      } satisfies RecentHittingRow);
    } else {
      const ip = parseIp(ytd.inningsPitched);
      const H = toNum(ytd.hits);
      const BB = toNum(ytd.baseOnBalls);
      const ER = toNum(ytd.earnedRuns);
      rows.push({
        label: "YTD",
        IP: ipToOneDecimal(ip),
        W: toNum(ytd.wins),
        SV: toNum(ytd.saves),
        K: toNum(ytd.strikeOuts),
        ERA: fmt2(ip ? (ER * 9) / ip : 0),
        WHIP: fmt2(ip ? (H + BB) / ip : 0),
      } satisfies RecentPitchingRow);
    }

    return { rows };
  });
}
