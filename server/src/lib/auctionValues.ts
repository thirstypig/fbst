/**
 * Shared auction values loader — reads ogba_auction_values CSV once and caches in memory.
 * Used by draft-report, ai-advice, weekly insights, waiver analysis, keeper-prep endpoints.
 */
import fs from "fs";
import path from "path";
import { logger } from "./logger.js";

export interface AuctionValueEntry {
  value: number;
  stats: string;
}

let _cache: Map<string, AuctionValueEntry> | null = null;
let _normalizedCache: Map<string, AuctionValueEntry> | null = null;

/** Strip diacritics (ñ→n, é→e, etc.) and lowercase for fuzzy name matching. */
function normalizeName(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/**
 * Returns a Map of player name → { value, stats } from the auction values CSV.
 * Reads the CSV on first call, then caches in memory for the process lifetime.
 * The CSV is static for the season and never changes at runtime.
 */
export function getAuctionValueMap(): Map<string, AuctionValueEntry> {
  if (_cache) return _cache;

  _cache = new Map();
  _normalizedCache = new Map();

  const csvPath = path.join(process.cwd(), "data", "ogba_auction_values_2026.csv");
  try {
    const csvText = fs.readFileSync(csvPath, "utf-8");
    const lines = csvText.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim());
    const nameIdx = headers.indexOf("player_name");
    const valIdx = headers.indexOf("dollar_value");
    const statKeys = ["R", "HR", "RBI", "SB", "AVG", "W", "SV", "ERA", "WHIP", "K"];
    const statIdxs = statKeys.map(k => headers.indexOf(k));

    if (nameIdx >= 0 && valIdx >= 0) {
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",");
        const name = cols[nameIdx]?.trim();
        const val = parseFloat(cols[valIdx]?.trim());
        if (!name || isNaN(val)) continue;
        const statParts = statKeys.map((k, si) => {
          const v = cols[statIdxs[si]]?.trim();
          return v && v !== "" ? `${k}:${v}` : null;
        }).filter(Boolean);
        const entry = { value: val, stats: statParts.join(", ") };
        _cache.set(name, entry);
        _normalizedCache.set(normalizeName(name), entry);
      }
    }
    logger.info({ count: _cache.size }, "Loaded auction values (cached)");
  } catch {
    logger.warn({}, "Could not load auction values CSV — surplus will not be calculated");
  }

  return _cache;
}

/**
 * Look up a player's projected value by name.
 * Tries exact match first, then falls back to diacritics-stripped normalized match.
 * Handles: "Ronald Acuña Jr." → "Ronald Acuna Jr." (CSV uses ASCII names).
 */
export function lookupAuctionValue(playerName: string): AuctionValueEntry | undefined {
  const map = getAuctionValueMap();
  const exact = map.get(playerName);
  if (exact) return exact;
  // Fallback: strip diacritics and try normalized match
  return _normalizedCache?.get(normalizeName(playerName));
}

/**
 * Parse a stats string like "R:12.6, HR:12.5, SB:5.5" into a numeric map.
 * Returns only categories that have values in the string.
 */
export function parseStatsString(stats: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const part of stats.split(",")) {
    const [key, val] = part.trim().split(":");
    if (key && val) {
      const num = parseFloat(val);
      if (!isNaN(num)) result[key.trim()] = num;
    }
  }
  return result;
}

/** Clear the cached values (for testing or season rollover). */
export function clearAuctionValueCache(): void {
  _cache = null;
  _normalizedCache = null;
}
