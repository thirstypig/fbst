
import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';
import { chunk } from './utils.js';

const MLB_BASE = "https://statsapi.mlb.com/api/v1";
const TEAM_CACHE_FILE = path.join(process.cwd(), "src", "data", "mlb_team_cache.json");

const mlbCache = new Map<string, { ts: number; data: any }>();

export async function mlbGetJson(url: string): Promise<any> {
  const hit = mlbCache.get(url);
  if (hit && Date.now() - hit.ts < 600 * 1000) return hit.data;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`MLB API error ${res.status} for ${url}`);
  const data = await res.json();
  mlbCache.set(url, { ts: Date.now(), data });
  return data;
}

export function readTeamCache(): Record<string, string> {
  if (!fs.existsSync(TEAM_CACHE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(TEAM_CACHE_FILE, "utf-8"));
  } catch (err) {
    logger.error({ error: String(err) }, "Failed to read team cache");
    return {};
  }
}

export function writeTeamCache(cache: Record<string, string>) {
  try {
    fs.mkdirSync(path.dirname(TEAM_CACHE_FILE), { recursive: true });
    fs.writeFileSync(TEAM_CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (err) {
    logger.error({ error: String(err) }, "Failed to write team cache");
  }
}

export async function fetchMlbTeamsMap(): Promise<Record<number, string>> {
  const url = `${MLB_BASE}/teams?sportId=1`;
  const data = await mlbGetJson(url);
  const map: Record<number, string> = {};
  for (const t of data.teams || []) {
    map[t.id] = t.abbreviation || t.teamCode || t.name;
  }
  return map;
}

export async function warmMlbTeamCache(mlbIds: string[]): Promise<Record<string, string>> {
  const cache = readTeamCache();
  const missing = mlbIds.filter((id) => !cache[id]);

  if (missing.length === 0) return cache;

  logger.info({ count: missing.length, total: mlbIds.length }, "Warming MLB team cache");

  const teamsMap = await fetchMlbTeamsMap();
  const batches = chunk(missing, 50);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const url = `${MLB_BASE}/people?personIds=${batch.join(",")}`;
    const data = await mlbGetJson(url);

    for (const p of data.people || []) {
      const id = String(p.id);
      const teamId = p.currentTeam?.id;
      if (teamId && teamsMap[teamId]) {
        cache[id] = teamsMap[teamId];
      }
    }
    writeTeamCache(cache);
    logger.info({ batch: i + 1, total: batches.length }, "Cache progress");
  }

  return cache;
}
