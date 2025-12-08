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

const csvPath = path.join(__dirname, "ogba_auction_values_2025.csv");

let auctionValues: AuctionValue[] = [];

try {
  const csvText = fs.readFileSync(csvPath, "utf8");
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
  });

  auctionValues = records.map((row: any) => ({
    mlb_id: row.mlb_id,
    name: row.name,
    team: row.team,
    pos: row.pos,
    value: Number(row.value),
    // adjust field name if your CSV uses something like "rel_value"
    relValue: Number(row.rel_value ?? row.relValue ?? 0),
    isPitcher:
      row.isPitcher === "true" ||
      row.pos === "P" ||
      row.pos === "SP" ||
      row.pos === "RP",
  }));
} catch (err) {
  console.error("Failed to load auction values CSV:", err);
  auctionValues = [];
}

export { auctionValues };
