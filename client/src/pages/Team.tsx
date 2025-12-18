// client/src/pages/Auction.tsx
import React, { useEffect, useMemo, useState } from "react";

import { getAuctionValues, type PlayerSeasonStat } from "../api";
import PlayerDetailModal from "../components/PlayerDetailModal";

import {
  isPitcher as isPitcherHelper,
  normalizePosition,
  formatAvg,
  getMlbTeamAbbr,
  getGrandSlams,
  getShutouts,
} from "../lib/playerDisplay";

function fmt2(v: any): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return n.toFixed(2);
}

function fmtMoney(v: any): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return n.toFixed(1);
}

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function rowIsPitcher(p: PlayerSeasonStat): boolean {
  const v = (p as any).is_pitcher;
  if (typeof v === "boolean") return v;
  if ((p as any).group === "P") return true;
  if ((p as any).group === "H") return false;
  return isPitcherHelper(p);
}

function rowKey(p: PlayerSeasonStat): string {
  return (p as any).row_id ?? `${p.mlb_id}-${rowIsPitcher(p) ? "P" : "H"}`;
}

/**
 * Safety de-dupe: if duplicates exist, keep the higher $ row.
 * Keyed by row_id (mlb_id + role).
 */
function dedupeAuction(rows: PlayerSeasonStat[]): PlayerSeasonStat[] {
  const m = new Map<string, PlayerSeasonStat>();
  for (const r of rows) {
    const k = rowKey(r);
    const prev = m.get(k);
    if (!prev) {
      m.set(k, r);
      continue;
    }
    const prevVal = num((prev as any).dollar_value ?? (prev as any).value);
    const curVal = num((r as any).dollar_value ?? (r as any).value);
    if (curVal >= prevVal) m.set(k, r);
  }
  return Array.from(m.values());
}

export default function Auction() {
  const [rows, setRows] = useState<PlayerSeasonStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [group, setGroup] = useState<"H" | "P">("H");
  const [selected, setSelected] = useState<PlayerSeasonStat | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const data = await getAuctionValues();
        const normalized = dedupeAuction(data ?? []);
        if (!cancelled) setRows(normalized);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load auction values");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const wantPitchers = group === "P";
    const f = (rows ?? []).filter((r) => (wantPitchers ? rowIsPitcher(r) : !rowIsPitcher(r)));

    return f.sort((a, b) => {
      const va = num((a as any).dollar_value ?? (a as any).value);
      const vb = num((b as any).dollar_value ?? (b as any).value);
      return vb - va;
    });
  }, [rows, group]);

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="mb-6 text-4xl font-semibold tracking-tight text-center">Auction</h1>

        <div className="mb-6 flex justify-center">
          <div className="inline-flex rounded-full bg-white/10 p-1">
            <button
              className={`rounded-full px-4 py-2 text-sm ${
                group === "H" ? "bg-sky-500/80 text-white" : "text-white/70 hover:text-white"
              }`}
              onClick={() => setGroup("H")}
            >
              Hitters
            </button>
            <button
              className={`rounded-full px-4 py-2 text-sm ${
                group === "P" ? "bg-sky-500/80 text-white" : "text-white/70 hover:text-white"
              }`}
              onClick={() => setGroup("P")}
            >
              Pitchers
            </button>
          </div>
        </div>

        {loading && <div className="text-white/70">Loading…</div>}
        {error && <div className="text-red-300">{error}</div>}

        {!loading && !error && (
          <div className="rounded-2xl bg-white/5 p-6 shadow-lg ring-1 ring-white/10">
            <div className="overflow-x-auto">
              {group === "H" ? (
                <table className="w-full text-sm">
                  <thead className="text-white/70">
                    <tr className="border-b border-white/10">
                      <th className="px-3 py-3 text-left">TEAM</th>
                      <th className="px-3 py-3 text-left">MLB</th>
                      <th className="px-3 py-3 text-left">TM</th>
                      <th className="px-3 py-3 text-left">PLAYER</th>
                      <th className="px-3 py-3 text-left">POS</th>
                      <th className="px-3 py-3 text-right">$</th>
                      <th className="px-3 py-3 text-right">R</th>
                      <th className="px-3 py-3 text-right">HR</th>
                      <th className="px-3 py-3 text-right">RBI</th>
                      <th className="px-3 py-3 text-right">SB</th>
                      <th className="px-3 py-3 text-right">GS</th>
                      <th className="px-3 py-3 text-right">AVG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr
                        key={rowKey(p)}
                        className="cursor-pointer border-b border-white/5 hover:bg-white/5"
                        onClick={() => setSelected(p)}
                      >
                        <td className="px-3 py-3 text-white/70">{(p as any).ogba_team_code}</td>
                        <td className="px-3 py-3 text-white/70">{p.mlb_id}</td>
                        <td className="px-3 py-3 text-white/70">{getMlbTeamAbbr(p)}</td>
                        <td className="px-3 py-3">{(p as any).player_name}</td>
                        <td className="px-3 py-3 text-white/70">{normalizePosition((p as any).positions)}</td>
                        <td className="px-3 py-3 text-right">{fmtMoney((p as any).dollar_value ?? (p as any).value)}</td>
                        <td className="px-3 py-3 text-right">{(p as any).R ?? ""}</td>
                        <td className="px-3 py-3 text-right">{(p as any).HR ?? ""}</td>
                        <td className="px-3 py-3 text-right">{(p as any).RBI ?? ""}</td>
                        <td className="px-3 py-3 text-right">{(p as any).SB ?? ""}</td>
                        <td className="px-3 py-3 text-right">{getGrandSlams(p)}</td>
                        <td className="px-3 py-3 text-right">{formatAvg((p as any).AVG)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-white/70">
                    <tr className="border-b border-white/10">
                      <th className="px-3 py-3 text-left">TEAM</th>
                      <th className="px-3 py-3 text-left">MLB</th>
                      <th className="px-3 py-3 text-left">TM</th>
                      <th className="px-3 py-3 text-left">PLAYER</th>
                      <th className="px-3 py-3 text-left">POS</th>
                      <th className="px-3 py-3 text-right">$</th>
                      <th className="px-3 py-3 text-right">W</th>
                      <th className="px-3 py-3 text-right">SV</th>
                      <th className="px-3 py-3 text-right">K</th>
                      <th className="px-3 py-3 text-right">SO</th>
                      <th className="px-3 py-3 text-right">ERA</th>
                      <th className="px-3 py-3 text-right">WHIP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr
                        key={rowKey(p)}
                        className="cursor-pointer border-b border-white/5 hover:bg-white/5"
                        onClick={() => setSelected(p)}
                      >
                        <td className="px-3 py-3 text-white/70">{(p as any).ogba_team_code}</td>
                        <td className="px-3 py-3 text-white/70">{p.mlb_id}</td>
                        <td className="px-3 py-3 text-white/70">{getMlbTeamAbbr(p)}</td>
                        <td className="px-3 py-3">{(p as any).player_name}</td>
                        <td className="px-3 py-3 text-white/70">{normalizePosition((p as any).positions)}</td>
                        <td className="px-3 py-3 text-right">{fmtMoney((p as any).dollar_value ?? (p as any).value)}</td>
                        <td className="px-3 py-3 text-right">{(p as any).W ?? ""}</td>
                        <td className="px-3 py-3 text-right">{(p as any).SV ?? ""}</td>
                        <td className="px-3 py-3 text-right">{(p as any).K ?? ""}</td>
                        <td className="px-3 py-3 text-right">{getShutouts(p)}</td>
                        <td className="px-3 py-3 text-right">{fmt2((p as any).ERA)}</td>
                        <td className="px-3 py-3 text-right">{fmt2((p as any).WHIP)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        <PlayerDetailModal open={!!selected} player={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  );
}
