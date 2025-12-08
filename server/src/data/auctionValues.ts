// server/src/data/auctionValues.ts
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

export interface AuctionValue {
  mlb_id: string;
  name: string;
  team: string;
  pos: string;
  value: number;
  relValue: number;
  isPitcher: boolean;
}

let auctionValuesCache: AuctionValue[] | null = null;

function loadAuctionValues(): AuctionValue[] {
  if (auctionValuesCache) return auctionValuesCache;

  // CSV you copied into src/data/
  const csvPath = path.join(__dirname, "ogba_auction_values_2025.csv");
  const csvRaw = fs.readFileSync(csvPath, "utf8");

  const records = parse(csvRaw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as any[];

  const values: AuctionValue[] = records.map((row) => {
    const mlb_id = String(row.mlb_id ?? "").trim();

    const name = String(row.player_name ?? "").trim();
    const team = String(row.ogba_team_code ?? "").trim();
    const pos = String(row.positions ?? "").trim();

    const valueRaw = Number(row.dollar_value ?? 0);
    const relRaw = Number(row.z_total ?? 0);

    const isPitcher =
      String(row.is_pitcher ?? "").trim() === "1" ||
      String(row.group ?? "").trim().toUpperCase() === "P" ||
      pos === "P" ||
      pos === "SP" ||
      pos === "RP";

    return {
      mlb_id,
      name,
      team,
      pos,
      value: Number.isFinite(valueRaw) ? valueRaw : 0,
      relValue: Number.isFinite(relRaw) ? relRaw : 0,
      isPitcher,
    };
  });

  console.log(
    `Loaded ${values.length} auction values from ogba_auction_values_2025.csv`
  );
  console.log("Sample auction value row:", values[0]);

  auctionValuesCache = values;
  return values;
}

export function getAuctionValues(): AuctionValue[] {
  return loadAuctionValues();
}
