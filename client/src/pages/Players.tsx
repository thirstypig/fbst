// client/src/pages/Players.tsx
import React, { useEffect, useMemo, useState } from "react";

import { getPlayerSeasonStats, type PlayerSeasonStat } from "../api";
import PlayerDetailModal from "../components/PlayerDetailModal";
import { formatAvg } from "../lib/playerDisplay";

function norm(v: any) {
  return String(v ?? "").trim();
}

function rowIsPitcher(p: PlayerSeasonStat) {
  const v = (p as any).is_pitcher;
  if (typeof v === "boolean") return v;
  if ((p as any).group === "P") return true;
  if ((p as any).group === "H") return false;
  return Boolean((p as any).isPitcher);
}

function rowKey(p: PlayerSeasonStat): string {
  return (p as any).row_id ?? `${p.mlb_id}-${rowIsPitcher(p) ? "P" : "H"}`;
}

function ogbaTeam(p: PlayerSeasonStat) {
  return norm((p as any).ogba_team_code ?? (p as any).team);
}

function mlbTeam(p: PlayerSeasonStat) {
  return norm((p as any).mlbTeam ?? (p as any).mlb_team);
}

function playerName(p: PlayerSeasonStat) {
  return norm((p as any).player_name ?? (p as any).name);
}

function posStr(p: PlayerSeasonStat) {
  return norm((p as any).positions ?? (p as any).pos);
}

function isFreeAgent(p: PlayerSeasonStat) {
  const t = ogbaTeam(p).toUpperCase();
  return !t || t === "FA";
}

function fmt2(v: any): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return n.toFixed(2);
}

export default function Players() {
  const [rows, setRows] = useState<PlayerSeasonStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [group, setGroup] = useState<"hitters" | "pitchers">("hitters");
  const [scope, setScope] = useState<"all" | "fa">("all");

  const [selected, setSelected] = useState<PlayerSeasonStat | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPlayerSeasonStats();
        if (!mounted) return;
        setRows(data ?? []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load players.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const wantPitchers = group === "pitchers";
    let out = (rows ?? []).filter((p) => (wantPitchers ? rowIsPitcher(p) : !rowIsPitcher(p)));

    if (scope === "fa") out = out.filter(isFreeAgent);

    // Stable ordering: player name asc
    out.sort((a, b) => playerName(a).localeCompare(playerName(b)));
    return out;
  }, [rows, group, scope]);

  return (
    <div className="px-10 py-8">
      <div className="mb-6 text-center">
        <div className="text-4xl font-semibold text-white">Players</div>
        <div className="mt-2 text-sm text-white/60">
          Player pool and season totals from ogba_player_season_totals_*.csv.
        </div>
      </div>

      <div className="mb-6 flex items-center justify-center gap-3">
        <div className="rounded-full bg-white/5 p-1">
          <button
            className={`rounded-full px-4 py-2 text-sm ${
              group === "hitters" ? "bg-sky-600/80 text-white" : "text-white/70 hover:bg-white/10"
            }`}
            onClick={() => setGroup("hitters")}
          >
            Hitters
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm ${
              group === "pitchers" ? "bg-sky-600/80 text-white" : "text-white/70 hover:bg-white/10"
            }`}
            onClick={() => setGroup("pitchers")}
          >
            Pitchers
          </button>
        </div>

        <div className="rounded-full bg-white/5 p-1">
          <button
            className={`rounded-full px-4 py-2 text-sm ${
              scope === "all" ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/10"
            }`}
            onClick={() => setScope("all")}
          >
            All players
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm ${
              scope === "fa" ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/10"
            }`}
            onClick={() => setScope("fa")}
          >
            Free agents only
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
        {group === "hitters" ? (
          <table className="min-w-[1400px] w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-xs text-white/60">
                <Th>PLAYER</Th>
                <Th w={80}>TEAM</Th>
                <Th w={70}>TM</Th>

                {/* placeholders for future position-games columns */}
                <Th w={60}>DH</Th>
                <Th w={60}>C</Th>
                <Th w={60}>1B</Th>
                <Th w={60}>2B</Th>
                <Th w={60}>3B</Th>
                <Th w={60}>SS</Th>
                <Th w={60}>OF</Th>

                <Th w={90}>POS</Th>

                <Th w={70}>AB</Th>
                <Th w={70}>H</Th>
                <Th w={70}>R</Th>
                <Th w={70}>HR</Th>
                <Th w={70}>RBI</Th>
                <Th w={70}>SB</Th>
                <Th w={90}>AVG</Th>
                <Th w={70}>GS</Th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-white/60" colSpan={20}>
                    Loading…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-red-300" colSpan={20}>
                    {error}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const avg = formatAvg((p as any).AVG ?? 0);
                  const gs = (p as any).GS ?? "";
                  return (
                    <tr
                      key={rowKey(p)}
                      className="cursor-pointer text-sm text-white/90 hover:bg-white/5"
                      onClick={() => setSelected(p)}
                    >
                      <Td className="font-medium">{playerName(p)}</Td>
                      <Td className="text-white/80">{ogbaTeam(p) || "FA"}</Td>
                      <Td className="text-white/80">{mlbTeam(p) || "—"}</Td>

                      <Td className="text-white/40">—</Td>
                      <Td className="text-white/40">—</Td>
                      <Td className="text-white/40">—</Td>
                      <Td className="text-white/40">—</Td>
                      <Td className="text-white/40">—</Td>
                      <Td className="text-white/40">—</Td>
                      <Td className="text-white/40">—</Td>

                      <Td className="text-white/80">{posStr(p)}</Td>

                      <Td className="tabular-nums">{(p as any).AB ?? 0}</Td>
                      <Td className="tabular-nums">{(p as any).H ?? 0}</Td>
                      <Td className="tabular-nums">{(p as any).R ?? 0}</Td>
                      <Td className="tabular-nums">{(p as any).HR ?? 0}</Td>
                      <Td className="tabular-nums">{(p as any).RBI ?? 0}</Td>
                      <Td className="tabular-nums">{(p as any).SB ?? 0}</Td>
                      <Td className="tabular-nums">{avg}</Td>
                      <Td className="tabular-nums">{gs === "" ? "—" : String(gs)}</Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          <table className="min-w-[1100px] w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-xs text-white/60">
                <Th>PLAYER</Th>
                <Th w={80}>TEAM</Th>
                <Th w={70}>TM</Th>
                <Th w={90}>POS</Th>
                <Th w={70}>W</Th>
                <Th w={70}>SV</Th>
                <Th w={70}>K</Th>
                <Th w={90}>ERA</Th>
                <Th w={90}>WHIP</Th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-white/60" colSpan={9}>
                    Loading…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-red-300" colSpan={9}>
                    {error}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={rowKey(p)}
                    className="cursor-pointer text-sm text-white/90 hover:bg-white/5"
                    onClick={() => setSelected(p)}
                  >
                    <Td className="font-medium">{playerName(p)}</Td>
                    <Td className="text-white/80">{ogbaTeam(p) || "FA"}</Td>
                    <Td className="text-white/80">{mlbTeam(p) || "—"}</Td>
                    <Td className="text-white/80">{posStr(p) || "P"}</Td>
                    <Td className="tabular-nums">{(p as any).W ?? 0}</Td>
                    <Td className="tabular-nums">{(p as any).SV ?? 0}</Td>
                    <Td className="tabular-nums">{(p as any).K ?? 0}</Td>
                    <Td className="tabular-nums">{fmt2((p as any).ERA)}</Td>
                    <Td className="tabular-nums">{fmt2((p as any).WHIP)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <PlayerDetailModal open={!!selected} onClose={() => setSelected(null)} player={selected} />
    </div>
  );
}

function Th({ children, w }: { children: React.ReactNode; w?: number }) {
  return (
    <th
      style={w ? { width: w } : undefined}
      className="border-b border-white/10 px-3 py-3 text-left font-medium"
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`border-b border-white/10 px-3 py-3 ${className ?? ""}`}>{children}</td>;
}
