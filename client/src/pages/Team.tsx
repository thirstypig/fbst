// client/src/pages/Team.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getTeamRoster, playerKey, type PlayerSeasonStat } from "../api";
import PlayerDetailModal from "../components/PlayerDetailModal";

import { getOgbaTeamName } from "../lib/ogbaTeams";
import {
  isPitcher as isPitcherHelper,
  normalizePosition,
  formatAvg,
  getMlbTeamAbbr,
  getGrandSlams,
  getShutouts,
} from "../lib/playerDisplay";

function normCode(v: any): string {
  return String(v ?? "").trim().toUpperCase();
}

function fmt2(v: any): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return n.toFixed(2);
}

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function rowIsPitcher(p: PlayerSeasonStat): boolean {
  const v = (p as any).is_pitcher;
  if (typeof v === "boolean") return v;
  return isPitcherHelper(p);
}

function splitTwoWay(rows: PlayerSeasonStat[]): PlayerSeasonStat[] {
  const out: PlayerSeasonStat[] = [];

  for (const p of rows) {
    const hasBat =
      num((p as any).AB) > 0 ||
      num((p as any).H) > 0 ||
      num((p as any).HR) > 0 ||
      num((p as any).RBI) > 0 ||
      num((p as any).SB) > 0;

    const hasPitch =
      num((p as any).W) > 0 ||
      num((p as any).SV) > 0 ||
      num((p as any).K) > 0 ||
      num((p as any).ER) > 0 ||
      num((p as any).IP) > 0 ||
      num((p as any).ERA) > 0 ||
      num((p as any).WHIP) > 0;

    if (!(hasBat && hasPitch)) {
      out.push(p);
      continue;
    }

    const hitter: PlayerSeasonStat = {
      ...p,
      is_pitcher: false,
      IP: 0,
      ER: 0,
      K: 0,
      W: 0,
      SV: 0,
      ERA: 0,
      WHIP: 0,
      SO: 0,
    };

    const pitcher: PlayerSeasonStat = {
      ...p,
      is_pitcher: true,
      positions: "P",
      AB: 0,
      H: 0,
      R: 0,
      HR: 0,
      RBI: 0,
      SB: 0,
      AVG: 0,
      GS: 0,
    };

    out.push(hitter, pitcher);
  }

  return out;
}

function dedupeByKey(rows: PlayerSeasonStat[]): PlayerSeasonStat[] {
  const m = new Map<string, PlayerSeasonStat>();
  for (const r of rows) {
    const k = playerKey({ mlb_id: r.mlb_id, is_pitcher: rowIsPitcher(r) });
    if (!m.has(k)) m.set(k, r);
  }
  return Array.from(m.values());
}

export default function Team() {
  const { teamCode } = useParams();
  const code = normCode(teamCode);

  const [players, setPlayers] = useState<PlayerSeasonStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"H" | "P">("H");
  const [selected, setSelected] = useState<PlayerSeasonStat | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const roster = await getTeamRoster(code);
        const normalized = dedupeByKey(splitTwoWay(roster));
        if (!cancelled) setPlayers(normalized);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load team roster");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (code) run();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const hitters = useMemo(
    () =>
      players
        .filter((p) => !rowIsPitcher(p))
        .sort((a, b) => (a.player_name ?? "").localeCompare(b.player_name ?? "")),
    [players]
  );

  const pitchers = useMemo(
    () =>
      players
        .filter((p) => rowIsPitcher(p))
        .sort((a, b) => (a.player_name ?? "").localeCompare(b.player_name ?? "")),
    [players]
  );

  const teamName = code ? getOgbaTeamName(code) : "Team";

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">{teamName}</h1>
            <div className="mt-1 text-sm text-white/60">
              Hitters: {hitters.length} · Pitchers: {pitchers.length}
            </div>
          </div>

          <Link to="/teams" className="text-white/70 hover:text-white">
            ← Back to Teams
          </Link>
        </div>

        <div className="mb-6 inline-flex rounded-full bg-white/10 p-1">
          <button
            className={`rounded-full px-4 py-2 text-sm ${
              activeTab === "H" ? "bg-sky-500/80 text-white" : "text-white/70 hover:text-white"
            }`}
            onClick={() => setActiveTab("H")}
          >
            Hitters
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm ${
              activeTab === "P" ? "bg-sky-500/80 text-white" : "text-white/70 hover:text-white"
            }`}
            onClick={() => setActiveTab("P")}
          >
            Pitchers
          </button>
        </div>

        {loading && <div className="text-white/70">Loading…</div>}
        {error && <div className="text-red-300">{error}</div>}

        {!loading && !error && activeTab === "H" && (
          <div className="rounded-2xl bg-white/5 p-6 shadow-lg ring-1 ring-white/10">
            <div className="mb-4 text-center text-2xl font-semibold text-white/80">Hitters</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-white/70">
                  <tr className="border-b border-white/10">
                    {/* MLB column removed */}
                    <th className="px-3 py-3 text-left">TM</th>
                    <th className="px-3 py-3 text-left">PLAYER</th>
                    <th className="px-3 py-3 text-left">POS</th>
                    <th className="px-3 py-3 text-right">R</th>
                    <th className="px-3 py-3 text-right">HR</th>
                    <th className="px-3 py-3 text-right">RBI</th>
                    <th className="px-3 py-3 text-right">SB</th>
                    <th className="px-3 py-3 text-right">GS</th>
                    <th className="px-3 py-3 text-right">AVG</th>
                  </tr>
                </thead>
                <tbody>
                  {hitters.map((p) => (
                    <tr
                      key={playerKey({ mlb_id: p.mlb_id, is_pitcher: rowIsPitcher(p) })}
                      className="cursor-pointer border-b border-white/5 hover:bg-white/5"
                      onClick={() => setSelected(p)}
                    >
                      {/* MLB cell removed */}
                      <td className="px-3 py-3 text-white/70">{getMlbTeamAbbr(p)}</td>
                      <td className="px-3 py-3">{p.player_name}</td>
                      <td className="px-3 py-3 text-white/70">{normalizePosition(p.positions)}</td>
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
            </div>
          </div>
        )}

        {!loading && !error && activeTab === "P" && (
          <div className="rounded-2xl bg-white/5 p-6 shadow-lg ring-1 ring-white/10">
            <div className="mb-4 text-center text-2xl font-semibold text-white/80">Pitchers</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-white/70">
                  <tr className="border-b border-white/10">
                    {/* MLB column removed */}
                    <th className="px-3 py-3 text-left">TM</th>
                    <th className="px-3 py-3 text-left">PLAYER</th>
                    <th className="px-3 py-3 text-left">POS</th>
                    <th className="px-3 py-3 text-right">W</th>
                    <th className="px-3 py-3 text-right">SV</th>
                    <th className="px-3 py-3 text-right">K</th>
                    <th className="px-3 py-3 text-right">SO</th>
                    <th className="px-3 py-3 text-right">ERA</th>
                    <th className="px-3 py-3 text-right">WHIP</th>
                  </tr>
                </thead>
                <tbody>
                  {pitchers.map((p) => (
                    <tr
                      key={playerKey({ mlb_id: p.mlb_id, is_pitcher: rowIsPitcher(p) })}
                      className="cursor-pointer border-b border-white/5 hover:bg-white/5"
                      onClick={() => setSelected(p)}
                    >
                      {/* MLB cell removed */}
                      <td className="px-3 py-3 text-white/70">{getMlbTeamAbbr(p)}</td>
                      <td className="px-3 py-3">{p.player_name}</td>
                      <td className="px-3 py-3 text-white/70">{normalizePosition(p.positions)}</td>
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
            </div>
          </div>
        )}

        <PlayerDetailModal open={!!selected} player={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  );
}
