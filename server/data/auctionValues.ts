import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

export type AuctionRow = {
  mlb_id: string;
  name: string;
  team: string;
  pos: string;
  auction_value: number;
  // add any other columns you have
};

let cache: AuctionRow[] | null = null;

export function loadAuctionValues(): AuctionRow[] {
  if (cache) return cache;

  const csvPath = path.join(__dirname, "..", "data", "ogba_auction_values_2025.csv");
  const raw = fs.readFileSync(csvPath, "utf-8");

  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as any[];

  cache = rows.map((r) => ({
    mlb_id: r.mlb_id,
    name: r.name,
    team: r.team,
    pos: r.pos,
    auction_value: Number(r.auction_value),
  }));

  return cache;
}
