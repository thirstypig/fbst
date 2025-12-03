// server/src/data/auctionValues.ts
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

export type AuctionRow = {
  mlb_id: string;
  name: string;
  team: string;
  pos: string;
  auction_value: number;
};

type HeaderMap = {
  nameKey?: string;
  teamKey?: string;
  posKey?: string;
  valueKey?: string;
};

let cache: AuctionRow[] | null = null;
let headerMap: HeaderMap | null = null;

function buildHeaderMap(sample: Record<string, any>): HeaderMap {
  const keys = Object.keys(sample);

  const findKey = (predicates: ((k: string) => boolean)[]): string | undefined =>
    keys.find((k) => predicates.some((p) => p(k.toLowerCase())));

  const nameKey = findKey([
    (k) => k === "name",
    (k) => k.includes("player"),
    (k) => k.includes("fullname"),
  ]);

  const teamKey = findKey([
    (k) => k === "team",
    (k) => k.includes("mlb_team"),
    (k) => k.includes("club"),
  ]);

  const posKey = findKey([
    (k) => k === "pos",
    (k) => k.includes("position"),
  ]);

  const valueKey = findKey([
    (k) => k === "auction_value",
    (k) => k.includes("auction"),
    (k) => k === "value",
    (k) => k.includes("dollar"),
  ]);

  console.log("Detected auction CSV headers:", {
    nameKey,
    teamKey,
    posKey,
    valueKey,
  });

  return { nameKey, teamKey, posKey, valueKey };
}

export function loadAuctionValues(): AuctionRow[] {
  if (cache) return cache;

  const csvPath = path.join(
    __dirname,
    "..",
    "..",
    "data",
    "ogba_auction_values_2025.csv"
  );

  if (!fs.existsSync(csvPath)) {
    throw new Error(`Auction values CSV not found at ${csvPath}`);
  }

  const raw = fs.readFileSync(csvPath, "utf-8");

  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, any>[];

  if (!rows.length) {
    cache = [];
    return cache;
  }

  // Build header map from first row
  if (!headerMap) {
    headerMap = buildHeaderMap(rows[0]);
  }

  cache = rows.map((r) => {
    // mlb_id is special – we know this one already works
    const mlb_id =
      String(
        r.mlb_id ??
          r.MLB_ID ??
          r.mlbId ??
          r.id ??
          r.player_id ??
          ""
      ) || "";

    const name =
      (headerMap!.nameKey ? String(r[headerMap!.nameKey] ?? "") : "") || "";

    const team =
      (headerMap!.teamKey ? String(r[headerMap!.teamKey] ?? "") : "") || "";

    const pos =
      (headerMap!.posKey ? String(r[headerMap!.posKey] ?? "") : "") || "";

    let auction_value = 0;
    if (headerMap!.valueKey && r[headerMap!.valueKey] != null) {
      const v = Number(r[headerMap!.valueKey]);
      if (!Number.isNaN(v)) auction_value = v;
    }

    return {
      mlb_id,
      name,
      team,
      pos,
      auction_value,
    };
  });

  return cache;
}
