// client/src/pages/Players.tsx
import React, { useEffect, useMemo, useState } from "react";

import { getPlayerSeasonStats, type PlayerSeasonStat } from "../api";
import PlayerDetailModal from "../components/PlayerDetailModal";
import { formatAvg } from "../lib/playerDisplay";
import { TableCard, Table, THead, Tr, Th, Td } from "../components/ui/TableCard";

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
  return (p as any).row_id ?? `${(p as any).mlb_id ?? (p as any).mlbId ?? ""}-${rowIsPitcher(p) ? "P" : "H"}`;
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

function numFromAny(p: any, ...keys: string[]) {
  for (const k of keys) {
    const v = p?.[k];
    if (v != null && String(v).trim() !== "") {
      const n = Number(String(v).trim());
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
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

    out.sort((a, b) => playerName(a).localeCompare(playerName(b)));
    return out;
  }, [rows, group, scope]);

  return (
    <div className="px-10 py-8">
      <div className="mb-6 text-center">
        <div className="text-4xl font-semibold text-white">Players</div>
        <div className="mt-2 text-sm text-white/60">Player pool and season totals from ogba_player_season_totals_*.csv.</div>
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

      <div className="mx-auto max-w-6xl">
        <TableCard>
          {group === "hitters" ? (
            <Table className="min-w-[1400px] w-full">
              <THead>
                <Tr className="text-xs text-white/60">
                  <Th align="left">PLAYER</Th>
                  <Th w={80} align="center">
                    TEAM
                  </Th>
                  <Th w={70} align="center">
                    TM
                  </Th>

                  <Th w={60} align="center">
                    DH
                  </Th>
                  <Th w={60} align="center">
                    C
                  </Th>
                  <Th w={60} align="center">
                    1B
                  </Th>
                  <Th w={60} align="center">
                    2B
                  </Th>
                  <Th w={60} align="center">
                    3B
                  </Th>
                  <Th w={60} align="center">
                    SS
                  </Th>
                  <Th w={60} align="center">
                    OF
                  </Th>

                  <Th w={90} align="center">
                    POS
                  </Th>

                  <Th w={70} align="center">
                    AB
                  </Th>
                  <Th w={70} align="center">
                    H
                  </Th>
                  <Th w={70} align="center">
                    R
                  </Th>
                  <Th w={70} align="center">
                    HR
                  </Th>
                  <Th w={70} align="center">
                    RBI
                  </Th>
                  <Th w={70} align="center">
                    SB
                  </Th>
                  <Th w={90} align="center">
                    AVG
                  </Th>
                  <Th w={70} align="center">
                    GS
                  </Th>
                </Tr>
              </THead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={20} className="px-4 py-6 text-center text-sm text-white/60">
                      Loading…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={20} className="px-4 py-6 text-center text-sm text-red-300">
                      {error}
                    </td>
                  </tr>
                ) : (
                  filtered.map((p, idx) => {
                    const avg = formatAvg((p as any).AVG ?? 0);
                    const gs = (p as any).GS ?? "";
                    return (
                      <Tr
                        key={rowKey(p)}
                        className={[
                          "border-t border-white/10 cursor-pointer hover:bg-white/5",
                          idx % 2 === 0 ? "bg-slate-950" : "bg-slate-950/60",
                        ].join(" ")}
                        onClick={() => setSelected(p)}
                        title="Click for player details"
                      >
                        <Td align="left" className="font-medium">
                          {playerName(p)}
                        </Td>
                        <Td align="center" className="text-white/80">
                          {ogbaTeam(p) || "FA"}
                        </Td>
                        <Td align="center" className="text-white/80">
                          {mlbTeam(p) || "—"}
                        </Td>

                        <Td align="center" className="text-white/40">
                          —
                        </Td>
                        <Td align="center" className="text-white/40">
                          —
                        </Td>
                        <Td align="center" className="text-white/40">
                          —
                        </Td>
                        <Td align="center" className="text-white/40">
                          —
                        </Td>
                        <Td align="center" className="text-white/40">
                          —
                        </Td>
                        <Td align="center" className="text-white/40">
                          —
                        </Td>
                        <Td align="center" className="text-white/40">
                          —
                        </Td>

                        <Td align="center" className="text-white/80">
                          {posStr(p)}
                        </Td>

                        <Td align="center" className="tabular-nums">
                          {(p as any).AB ?? 0}
                        </Td>
                        <Td align="center" className="tabular-nums">
                          {(p as any).H ?? 0}
                        </Td>
                        <Td align="center" className="tabular-nums">
                          {(p as any).R ?? 0}
                        </Td>
                        <Td align="center" className="tabular-nums">
                          {(p as any).HR ?? 0}
                        </Td>
                        <Td align="center" className="tabular-nums">
                          {(p as any).RBI ?? 0}
                        </Td>
                        <Td align="center" className="tabular-nums">
                          {(p as any).SB ?? 0}
                        </Td>
                        <Td align="center" className="tabular-nums">
                          {avg}
                        </Td>
                        <Td align="center" className="tabular-nums">
                          {gs === "" ? "—" : String(gs)}
                        </Td>
                      </Tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          ) : (
            <Table className="min-w-[1180px] w-full">
              <THead>
                <Tr className="text-xs text-white/60">
                  <Th align="left">PLAYER</Th>
                  <Th w={80} align="center">
                    TEAM
                  </Th>
                  <Th w={70} align="center">
                    TM
                  </Th>
                  <Th w={90} align="center">
                    POS
                  </Th>
                  <Th w={70} align="center">
                    W
                  </Th>
                  <Th w={70} align="center">
                    SV
                  </Th>
                  <Th w={70} align="center">
                    K
                  </Th>
                  <Th w={90} align="center">
                    ERA
                  </Th>
                  <Th w={90} align="center">
                    WHIP
                  </Th>
                  <Th w={70} align="center">
                    SO
                  </Th>
                </Tr>
              </THead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-sm text-white/60">
                      Loading…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-sm text-red-300">
                      {error}
                    </td>
                  </tr>
                ) : (
                  filtered.map((p, idx) => {
                    const so = numFromAny(p as any, "SHO", "sho", "SO", "so");
                    return (
                      <Tr
                        key={rowKey(p)}
                        className={[
                          "border-t border-white/10 cursor-pointer hover:bg-white/5",
                          idx % 2 === 0 ? "bg-slate-950" : "bg-slate-950/60",
                        ].join(" ")}
                        onClick={() => setSelected(p)}
                        title="Click for player details"
                      >
                        <Td align="left" className="font-medium">
                          {playerName(p)}
                        </Td>
                        <Td align="center" className="text-white/80">
                          {ogbaTeam(p) || "FA"}
                        </Td>
                        <Td align="center" className="text-white/80">
                          {mlbTeam(p) || "—"}
                        </Td>
                        <Td align="center" className="text-white/80">
                          {posStr(p) || "P"}
                        </Td>
                        <Td align="center" className="tabular-nums">
                          {(p as any).W ?? 0}
                        </Td>
                        <Td align="center" className="tabular-nums">
                          {(p as any).SV ?? 0}
                        </Td>
                        <Td align="center" className="tabular-nums">
                          {(p as any).K ?? 0}
                        </Td>
                        <Td align="center" className="tabular-nums">
                          {fmt2((p as any).ERA)}
                        </Td>
                        <Td align="center" className="tabular-nums">
                          {fmt2((p as any).WHIP)}
                        </Td>
                        <Td align="center" className="tabular-nums">
                          {so}
                        </Td>
                      </Tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          )}
        </TableCard>
      </div>

      <PlayerDetailModal open={!!selected} onClose={() => setSelected(null)} player={selected} />
    </div>
  );
}
