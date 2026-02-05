import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { getPlayerSeasonStats, type PlayerSeasonStat, getTeamDetails, getTeams } from "../api";
import PlayerDetailModal from "../components/PlayerDetailModal";
import TeamRosterManager from "../components/TeamRosterManager";

import { getOgbaTeamName } from "../lib/ogbaTeams";
import { isPitcher, normalizePosition, formatAvg, getMlbTeamAbbr } from "../lib/playerDisplay";
import { classNames } from "../lib/classNames";
import { TableCard, Table, THead, Tr, Th, Td } from "../components/ui/TableCard";

function normCode(v: any): string {
  return String(v ?? "").trim().toUpperCase();
}

function asNum(v: any): number {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

function numFromAny(p: any, ...keys: string[]): number {
  for (const k of keys) {
    if (p?.[k] != null && String(p[k]).trim() !== "") return asNum(p[k]);
  }
  return 0;
}

function rowKey(p: any): string {
  return String(p?.row_id ?? p?.id ?? `${p?.mlb_id ?? p?.mlbId ?? ""}-${isPitcher(p) ? "P" : "H"}`);
}

function normalizePosList(raw: any): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";

  const parts = s
    .split(/[/,| ]+/)
    .map((x) => x.trim())
    .filter(Boolean);

  const out: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const n = normalizePosition(part);
    if (!n) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }

  return out.join("/");
}

function posEligible(p: any): string {
  const raw = p?.positions ?? p?.pos ?? p?.position ?? p?.positionEligible ?? p?.position_eligible ?? "";
  return normalizePosList(raw);
}

function gamesAtPos(p: any, pos: "DH" | "C" | "1B" | "2B" | "3B" | "SS" | "OF"): number {
  const directKeys = [
    `G_${pos}`,
    `g_${pos}`,
    `GP_${pos}`,
    `gp_${pos}`,
    `G${pos}`,
    `GP${pos}`,
    `games_${pos}`,
    `Games_${pos}`,
    `${pos}_G`,
    `${pos}_games`,
  ];

  for (const k of directKeys) {
    if (p?.[k] != null && String(p[k]).trim() !== "") return asNum(p[k]);
  }

  const nested =
    p?.posGames ??
    p?.gamesByPos ??
    p?.games_by_pos ??
    p?.positionGames ??
    p?.position_games ??
    null;

  if (nested && typeof nested === "object") {
    if (nested[pos] != null) return asNum(nested[pos]);
    const low = String(pos).toLowerCase();
    if (nested[low] != null) return asNum(nested[low]);
  }

  if (pos === "OF") {
    const lf = asNum(p?.G_LF ?? p?.GP_LF ?? p?.games_LF ?? p?.LF_G ?? 0);
    const cf = asNum(p?.G_CF ?? p?.GP_CF ?? p?.games_CF ?? p?.CF_G ?? 0);
    const rf = asNum(p?.G_RF ?? p?.GP_RF ?? p?.games_RF ?? p?.RF_G ?? 0);
    const sum = lf + cf + rf;
    if (sum > 0) return sum;
  }

  return 0;
}

export default function Team() {
  const { teamCode } = useParams();
  const code = normCode(teamCode);

  const loc = useLocation();
  const activeTab: "hitters" | "pitchers" = loc.hash === "#pitchers" ? "pitchers" : "hitters";

  const [players, setPlayers] = useState<PlayerSeasonStat[]>([]);
  const [loading, setLoading] = useState(true);
  // Roster Manager State
  const [isManaging, setIsManaging] = useState(false);
  const [dbTeamId, setDbTeamId] = useState<number | null>(null);
  const [currentRoster, setCurrentRoster] = useState<any[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PlayerSeasonStat | null>(null);

  useEffect(() => {
    let ok = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // 1. Load Scraper Stats
        const rows = await getPlayerSeasonStats();
        if (!ok) return;

        const filtered = (rows ?? []).filter(
          (p: any) => normCode(p?.ogba_team_code ?? p?.team ?? p?.ogbaTeamCode) === code
        );
        setPlayers(filtered);

        // 2. Load DB Team ID & Roster
        // We need to find the team ID from the code
        const allTeams = await getTeams();
        const team = allTeams.find((t: any) => normCode(t.name) === code || normCode(t.secondary_code) === code || t.name.toLowerCase().includes(code.toLowerCase())); 
        // Note: teamCode param might be 'KAN' but name is 'Kansai'. 
        // existing logic uses `getOgbaTeamName(code)` which maps 'KAN' -> 'Kansai ...'
        // Let's rely on standard code match if possible.
        // The `getOgbaTeamName` utility suggests 'KAN' is the standard key.
        // Let's assume the DB `Team` model might not have 'KAN' code populated?
        // Let's try to match loosely or use `getOgbaTeamName` to find the full name then match?
        
        let foundId = 0;
        if (team) {
             foundId = team.id;
        } else {
            // Fallback: Try to match by name
            const fullName = getOgbaTeamName(code);
            const teamByName = allTeams.find((t: any) => t.name === fullName);
            if (teamByName) foundId = teamByName.id;
        }

        if (foundId) {
            setDbTeamId(foundId);
            const details = await getTeamDetails(foundId);
            setCurrentRoster(details.currentRoster || []);
        }

      } catch (e: any) {
        if (!ok) return;
        setError(e?.message ?? "Failed to load team roster");
        setPlayers([]);
      } finally {
        if (ok) setLoading(false);
      }
    }

    load();
    return () => {
      ok = false;
    };
  }, [code]);

  const teamName = useMemo(() => getOgbaTeamName(code) || code, [code]);

  const hitters = useMemo(() => players.filter((p) => !isPitcher(p)), [players]);
  const pitchers = useMemo(() => players.filter((p) => isPitcher(p)), [players]);

  return (
    <div className="flex-1 min-h-screen bg-slate-950 text-slate-50">
      <main className="max-w-6xl mx-auto px-6 py-10">
        <header className="mb-6 text-center relative">
          <h1 className="text-3xl font-semibold tracking-tight">{teamName}</h1>
          <div className="mt-2 text-sm text-slate-400">
            Hitters: {hitters.length} · Pitchers: {pitchers.length}
          </div>
          
          <div className="mt-3 flex justify-center gap-4">
             <Link className="text-sm text-sky-300 hover:text-sky-200" to="/season">
               ← Back to Season
             </Link>
             
             {/* Manage Button - Only show if DB data loaded */}
             {dbTeamId && (
                 <button 
                    onClick={() => setIsManaging(true)}
                    className="text-sm bg-sky-600 hover:bg-sky-500 text-white px-3 py-1 rounded transition-colors flex items-center gap-1"
                 >
                    <span>⚡ Manage Lineup</span>
                 </button>
             )}
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mb-6 flex justify-center">
          <div className="inline-flex rounded-full bg-white/5 p-1 border border-white/10">
            <Link
              to="#hitters"
              className={classNames(
                "rounded-full px-4 py-2 text-sm transition",
                activeTab === "hitters" ? "bg-sky-600/80 text-white" : "text-white/70 hover:bg-white/10"
              )}
            >
              Hitters
            </Link>
            <Link
              to="#pitchers"
              className={classNames(
                "rounded-full px-4 py-2 text-sm transition",
                activeTab === "pitchers" ? "bg-sky-600/80 text-white" : "text-white/70 hover:bg-white/10"
              )}
            >
              Pitchers
            </Link>
          </div>
        </div>

        {activeTab === "hitters" ? (
          <section id="hitters">
            <TableCard>
              <Table>
                <THead>
                  <Tr>
                    <Th align="center">TM</Th>
                    <Th align="center">PLAYER</Th>
                    <Th align="center">ELIG</Th>

                    <Th align="center">DH</Th>
                    <Th align="center">C</Th>
                    <Th align="center">1B</Th>
                    <Th align="center">2B</Th>
                    <Th align="center">3B</Th>
                    <Th align="center">SS</Th>
                    <Th align="center">OF</Th>

                    <Th align="center">R</Th>
                    <Th align="center">HR</Th>
                    <Th align="center">RBI</Th>
                    <Th align="center">SB</Th>
                    <Th align="center">AVG</Th>
                    <Th align="center">GS</Th>
                  </Tr>
                </THead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={16} className="px-4 py-8 text-center text-sm text-slate-400">
                        Loading roster…
                      </td>
                    </tr>
                  ) : hitters.length === 0 ? (
                    <tr>
                      <td colSpan={16} className="px-4 py-8 text-center text-sm text-slate-400">
                        No hitters found for this roster.
                      </td>
                    </tr>
                  ) : (
                    hitters.map((p: any, idx: number) => {
                      const key = rowKey(p);
                      const tm = getMlbTeamAbbr(p);
                      const elig = posEligible(p);

                      const gDH = gamesAtPos(p, "DH");
                      const gC = gamesAtPos(p, "C");
                      const g1B = gamesAtPos(p, "1B");
                      const g2B = gamesAtPos(p, "2B");
                      const g3B = gamesAtPos(p, "3B");
                      const gSS = gamesAtPos(p, "SS");
                      const gOF = gamesAtPos(p, "OF");

                      // Grand Slams (supports multiple common key names)
                      const gs = numFromAny(p, "GS", "gs", "GSL", "gsl", "grandSlams", "grand_slams");

                      return (
                        <Tr
                          key={key}
                          className={[
                            "border-t border-slate-800/70 cursor-pointer hover:bg-white/5",
                            idx % 2 === 0 ? "bg-slate-950" : "bg-slate-950/60",
                          ].join(" ")}
                          onClick={() => setSelected(p)}
                          title="Click for player details"
                        >
                          <Td align="center" className="text-slate-500">
                            {tm || "—"}
                          </Td>
                          <Td align="center">{p?.player_name ?? p?.name ?? p?.playerName ?? ""}</Td>
                          <Td align="center" className="text-slate-500">
                            {elig || "—"}
                          </Td>

                          <Td align="center" className="text-slate-500">
                            {gDH ? gDH : "—"}
                          </Td>
                          <Td align="center" className="text-slate-500">
                            {gC ? gC : "—"}
                          </Td>
                          <Td align="center" className="text-slate-500">
                            {g1B ? g1B : "—"}
                          </Td>
                          <Td align="center" className="text-slate-500">
                            {g2B ? g2B : "—"}
                          </Td>
                          <Td align="center" className="text-slate-500">
                            {g3B ? g3B : "—"}
                          </Td>
                          <Td align="center" className="text-slate-500">
                            {gSS ? gSS : "—"}
                          </Td>
                          <Td align="center" className="text-slate-500">
                            {gOF ? gOF : "—"}
                          </Td>

                          <Td align="center" className="tabular-nums">
                            {asNum(p?.R)}
                          </Td>
                          <Td align="center" className="tabular-nums">
                            {asNum(p?.HR)}
                          </Td>
                          <Td align="center" className="tabular-nums">
                            {asNum(p?.RBI)}
                          </Td>
                          <Td align="center" className="tabular-nums">
                            {asNum(p?.SB)}
                          </Td>
                          <Td align="center" className="tabular-nums">
                            {formatAvg(p?.AVG)}
                          </Td>
                          <Td align="center" className="tabular-nums">
                            {gs}
                          </Td>
                        </Tr>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </TableCard>
          </section>
        ) : (
          <section id="pitchers">
            <TableCard>
              <Table>
                <THead>
                  <Tr>
                    <Th align="center">TM</Th>
                    <Th align="center">PLAYER</Th>
                    <Th align="center">ELIG</Th>
                    <Th align="center">W</Th>
                    <Th align="center">SV</Th>
                    <Th align="center">K</Th>
                    <Th align="center">IP</Th>
                    <Th align="center">ERA</Th>
                    <Th align="center">WHIP</Th>
                    <Th align="center">SO</Th>
                  </Tr>
                </THead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-400">
                        Loading roster…
                      </td>
                    </tr>
                  ) : pitchers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-400">
                        No pitchers found for this roster.
                      </td>
                    </tr>
                  ) : (
                    pitchers.map((p: any, idx: number) => {
                      const key = rowKey(p);
                      const tm = getMlbTeamAbbr(p);
                      const elig = posEligible(p) || "P";

                      // Shutouts (commonly "SHO"; sometimes "SO" in custom datasets)
                      const so = numFromAny(p, "SHO", "sho", "SO", "so", "shutouts", "shut_outs");

                      return (
                        <Tr
                          key={key}
                          className={[
                            "border-t border-slate-800/70 cursor-pointer hover:bg-white/5",
                            idx % 2 === 0 ? "bg-slate-950" : "bg-slate-950/60",
                          ].join(" ")}
                          onClick={() => setSelected(p)}
                          title="Click for player details"
                        >
                          <Td align="center" className="text-slate-500">
                            {tm || "—"}
                          </Td>
                          <Td align="center">{p?.player_name ?? p?.name ?? p?.playerName ?? ""}</Td>
                          <Td align="center" className="text-slate-500">
                            {elig}
                          </Td>

                          <Td align="center" className="tabular-nums">
                            {asNum(p?.W)}
                          </Td>
                          <Td align="center" className="tabular-nums">
                            {asNum(p?.SV)}
                          </Td>
                          <Td align="center" className="tabular-nums">
                            {asNum(p?.K)}
                          </Td>
                          <Td align="center" className="tabular-nums">
                            {String(p?.IP ?? "").trim() || "—"}
                          </Td>
                          <Td align="center" className="tabular-nums">
                            {String(p?.ERA ?? "").trim() || "—"}
                          </Td>
                          <Td align="center" className="tabular-nums">
                            {String(p?.WHIP ?? "").trim() || "—"}
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
            </TableCard>
          </section>
        )}

        {selected ? <PlayerDetailModal player={selected} onClose={() => setSelected(null)} /> : null}

        {/* Roster Manager Modal */}
        {isManaging && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                 <div className="w-full max-w-7xl h-[90vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
                     <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900">
                         <h2 className="text-xl font-bold text-white">Manage Lineup</h2>
                         <button 
                            onClick={() => { setIsManaging(false); window.location.reload(); }}
                            className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                         >
                            ✕
                         </button>
                     </div>
                     <div className="flex-1 overflow-hidden p-6 bg-slate-950/50">
                         <TeamRosterManager 
                            teamId={dbTeamId || 0}
                            roster={currentRoster} 
                            onUpdate={() => {}} 
                         />
                     </div>
                 </div>
             </div>
        )}
      </main>
    </div>
  );
}
