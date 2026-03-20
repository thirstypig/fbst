import { prisma } from "../../../db/prisma.js";
import { logger } from "../../../lib/logger.js";

// Lazy-load xlsx (2.3MB) — only imported when file import is used
let _xlsxModule: typeof import("xlsx") | null = null;
let readFile: any = null;
let xlsxUtils: any = null;

async function ensureXlsx() {
  if (_xlsxModule) return;
  _xlsxModule = await import("xlsx");
  readFile =
    _xlsxModule.readFile || (_xlsxModule as any).default?.readFile;
  xlsxUtils =
    _xlsxModule.utils || (_xlsxModule as any).default?.utils;
}

// ─── Header Normalization ────────────────────────────────────────────────────

const NAME_KEYS = new Set([
  "name", "player", "player_name", "player name", "playername",
]);
const VALUE_KEYS = new Set([
  "$", "value", "dollar", "dollar_value", "dollar value", "dollars",
  "dollarvalue", "val",
]);
const POS_KEYS = new Set([
  "pos", "position", "positions",
]);
const MLBID_KEYS = new Set([
  "#", "mlb_id", "mlbid", "mlb id", "id",
]);
const TEAM_KEYS = new Set([
  "team", "mlb team", "mlb_team", "mlbteam",
]);

interface NormalizedRow {
  name: string;
  value: number;
  position?: string;
  mlbId?: number;
  team?: string;
}

function normalizeHeaders(
  rows: Record<string, any>[],
): NormalizedRow[] {
  if (rows.length === 0) return [];

  const rawKeys = Object.keys(rows[0]);
  const mapping: Record<string, string> = {};

  for (const key of rawKeys) {
    const k = key.toLowerCase().trim();
    if (NAME_KEYS.has(k)) mapping[key] = "name";
    else if (VALUE_KEYS.has(k)) mapping[key] = "value";
    else if (POS_KEYS.has(k)) mapping[key] = "position";
    else if (MLBID_KEYS.has(k)) mapping[key] = "mlbId";
    else if (TEAM_KEYS.has(k)) mapping[key] = "team";
  }

  if (!mapping[rawKeys.find((k) => mapping[k] === "name") ?? ""])
    throw new Error(
      "Could not find a Name/Player column. Expected one of: Name, Player, Player Name",
    );
  if (!mapping[rawKeys.find((k) => mapping[k] === "value") ?? ""])
    throw new Error(
      "Could not find a Value/Dollar column. Expected one of: $, Value, Dollar, Dollars",
    );

  return rows
    .map((row) => {
      const out: Record<string, any> = {};
      for (const [rawKey, canonical] of Object.entries(mapping)) {
        out[canonical] = row[rawKey];
      }
      const name = String(out.name ?? "").trim();
      if (!name) return null;

      // Parse value: strip "$", commas
      const rawVal = String(out.value ?? "0")
        .replace(/[$,]/g, "")
        .trim();
      const value = Math.round(Number(rawVal));
      if (!Number.isFinite(value)) return null;

      return {
        name,
        value,
        position: out.position ? String(out.position).trim() : undefined,
        mlbId: out.mlbId ? Number(out.mlbId) || undefined : undefined,
        team: out.team ? String(out.team).trim() : undefined,
      } satisfies NormalizedRow;
    })
    .filter(Boolean) as NormalizedRow[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

export interface ImportResult {
  matched: number;
  unmatched: number;
  total: number;
  unmatchedNames: string[];
}

export class PlayerValueService {
  /**
   * Import player values from an uploaded file (xlsx/xls/csv).
   * Deletes existing values for the league, then bulk inserts.
   */
  async importFromFile(
    leagueId: number,
    filePath: string,
  ): Promise<ImportResult> {
    const ext = filePath.toLowerCase().split(".").pop();
    let rawRows: Record<string, any>[];

    if (ext === "csv") {
      const { parse } = await import("csv-parse/sync");
      const fs = await import("fs");
      const content = fs.readFileSync(filePath, "utf-8");
      rawRows = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } else {
      // Excel
      await ensureXlsx();
      const workbook = readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      rawRows = xlsxUtils.sheet_to_json(workbook.Sheets[sheetName]);
    }

    const rows = normalizeHeaders(rawRows);
    if (rows.length === 0) {
      throw new Error("No valid rows found in the uploaded file.");
    }

    // Build player lookup maps
    const allPlayers = await prisma.player.findMany({
      select: { id: true, name: true, mlbId: true },
    });

    const byMlbId = new Map<number, number>();
    const byNameLower = new Map<string, number>();
    for (const p of allPlayers) {
      if (p.mlbId) byMlbId.set(p.mlbId, p.id);
      byNameLower.set(p.name.toLowerCase().trim(), p.id);
    }

    // Also load aliases for fallback matching
    const aliases = await prisma.playerAlias.findMany({
      select: { alias: true, playerId: true },
    });
    const byAlias = new Map<string, number>();
    for (const a of aliases) {
      byAlias.set(a.alias.toLowerCase().trim(), a.playerId);
    }

    // Match rows to players
    let matched = 0;
    let unmatched = 0;
    const unmatchedNames: string[] = [];

    const createData: Array<{
      leagueId: number;
      playerId: number | null;
      mlbId: number | null;
      playerName: string;
      position: string | null;
      value: number;
      source: string;
    }> = [];

    for (const row of rows) {
      let playerId: number | null = null;

      // Tier 1: by mlbId
      if (row.mlbId && byMlbId.has(row.mlbId)) {
        playerId = byMlbId.get(row.mlbId)!;
      }

      // Tier 2: exact name match
      if (!playerId) {
        playerId =
          byNameLower.get(row.name.toLowerCase().trim()) ?? null;
      }

      // Tier 3: alias match
      if (!playerId) {
        playerId =
          byAlias.get(row.name.toLowerCase().trim()) ?? null;
      }

      if (playerId) {
        matched++;
      } else {
        unmatched++;
        unmatchedNames.push(row.name);
      }

      createData.push({
        leagueId,
        playerId,
        mlbId: row.mlbId ?? null,
        playerName: row.name,
        position: row.position ?? null,
        value: row.value,
        source: "upload",
      });
    }

    // Delete existing values, then bulk insert
    await prisma.$transaction(async (tx) => {
      await tx.playerValue.deleteMany({ where: { leagueId } });

      // Use createMany for performance — skip duplicates on playerName
      await tx.playerValue.createMany({
        data: createData,
        skipDuplicates: true,
      });
    });

    logger.info(
      { leagueId, total: rows.length, matched, unmatched },
      "Player values imported",
    );

    return { matched, unmatched, total: rows.length, unmatchedNames };
  }

  /**
   * Get all values for a league, ordered by value descending.
   */
  async getValues(leagueId: number) {
    return prisma.playerValue.findMany({
      where: { leagueId },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            posPrimary: true,
            mlbTeam: true,
          },
        },
      },
      orderBy: { value: "desc" },
    });
  }

  /**
   * Get a Map<playerId, value> for enriching roster responses.
   */
  async getValueMap(
    leagueId: number,
  ): Promise<Map<number, number>> {
    const values = await prisma.playerValue.findMany({
      where: { leagueId, playerId: { not: null } },
      select: { playerId: true, value: true },
    });
    const map = new Map<number, number>();
    for (const v of values) {
      if (v.playerId) map.set(v.playerId, v.value);
    }
    return map;
  }

  /**
   * Clear all values for a league.
   */
  async clearValues(leagueId: number): Promise<number> {
    const result = await prisma.playerValue.deleteMany({
      where: { leagueId },
    });
    return result.count;
  }
}
