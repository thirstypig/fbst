import { useEffect, useState } from "react";
import type { AuctionRow } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const AuctionValues = () => {
  const [rows, setRows] = useState<AuctionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/auction-values`)
      .then((res) => res.json())
      .then((data) => setRows(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4">Loading auction values…</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">OGBA 2025 Auction Values</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="border px-2 py-1 text-left">Player</th>
              <th className="border px-2 py-1 text-left">Team</th>
              <th className="border px-2 py-1 text-left">Pos</th>
              <th className="border px-2 py-1 text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.mlb_id}>
                <td className="border px-2 py-1">{r.name}</td>
                <td className="border px-2 py-1">{r.team}</td>
                <td className="border px-2 py-1">{r.pos}</td>
                <td className="border px-2 py-1 text-right">${r.auction_value.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuctionValues;
