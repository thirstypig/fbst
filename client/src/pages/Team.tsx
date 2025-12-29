// client/src/pages/Team.tsx
//
// Team detail:
// - Toggle tabs (Hitters / Pitchers) using hash: #hitters / #pitchers
// - Hitters table includes games played by position: DH, C, 1B, 2B, 3B, SS, OF
// - Clicking a player opens PlayerDetailModal.
// - Uses client/src/api.ts (canonical).
// - Uses lib/ogbaTeams for display name.

import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { getPlayerSeasonStats, type PlayerSeasonStat } from "../api";
import PlayerDetailModal from "../components/PlayerDetailModal";

import { getOgbaTeamName } from "../lib/ogbaTeams";
import { isPitcher, normalizePosition, formatAvg, getMlbTeamAbbr } from "../lib/playerDisplay";

function normCode(v: any): string {
  return String(v ?? "").trim().toUpperCase();
}

function asNum(v: any): number {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

function rowKey(p: any): string {
  return String(p?.row_id ?? p?.id ?? `${p?.mlb_id ?? p?.mlbId ?? ""}-${isPitcher(p) ? "P" : "H"}`);
}

function normalizePosList(raw: any): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";

  const parts = s.split(/[/,| ]+/).map((x) => x.trim()).filter(Boolean);
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

/**
 * Games played by position
 *
 * We don't have a single canonical data schema yet, so this checks common shapes:
 * - flat fields: G_C, G_1B, G_2B, G_3B, G_SS, G_OF, G_DH
 * - alternates: GP_C, games_C, C_G, etc.
 * - nested: posGames: { C: 12, "1B": 7, ... }
 */
function gamesAtPos(p: any, pos: "DH" | "C" | "1B" | "2B" | "3B" | "SS" | "OF"): number {
  const directKeys = [
    `G_${pos}`,
    `g_${pos}`,
    `GP_${pos}`,
    `gp_${pos}`,
    `G${pos}`, // e.g., GSS (some exports do this)
    `GP${pos}`,
    `games_${pos}`,
    `Games_${pos}`,
    `${pos}_G`,
    `${pos}_games`,
  ];

  for (const k of directKeys) {
    if (p?.[k] != null && String(p[k]).trim() !== "") return asNum(p[k]);
  }

  // nested: posGames / gamesByPos / games_by_pos
  const nested =
    p?.posGames ??
    p?.gamesByPos ??
    p?.games_by_pos ??
    p?.positionGames ??
    p?.position_games ??
    null;

  if (nested && typeof nested === "object") {
    if (nested[pos] != null) return asNum(nested[pos]);
    // some schemas use lower keys
    const low = String(pos).toLowerCase();
    if (nested[low] != null) return asNum(nested[low]);
  }

  // OF sometimes comes as LF/CF/RF
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
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<PlayerSeasonStat | null>(null);

  useEffect(() => {
    let ok = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const rows = await getPlayerSeasonStats();
        if (!ok) return;

        const filtered = rows.filter((p: any) => normCode(p?.ogba_team_code ?? p?.team ?? p?.ogbaTeamCode) === code);
        setPlayers(filtered);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load team roster");
      } finally {
        setLoading(false);
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

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <h1>{teamName}</h1>
        <div>Loading roster…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h1>{teamName}</h1>
        <div style={{ color: "crimson" }}>{error}</div>
        <div style={{ marginTop: 12 }}>
          <Link to="/season">Back to Season</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>{teamName}</h1>
          <div style={{ opacity: 0.8, marginTop: 6 }}>
            Hitters: {hitters.length} · Pitchers: {pitchers.length}
          </div>
        </div>

        <div>
          <Link to="/season">← Back to Season</Link>
        </div>
      </div>

      {/* Tabs (restores the old behavior you referenced) */}
      <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "inline-flex",
            borderRadius: 999,
            padding: 4,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            gap: 4,
          }}
        >
          <Link
            to="#hitters"
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              textDecoration: "none",
              color: activeTab === "hitters" ? "white" : "rgba(255,255,255,0.75)",
              background: activeTab === "hitters" ? "rgba(59,130,246,0.40)" : "transparent",
              border: activeTab === "hitters" ? "1px solid rgba(59,130,246,0.55)" : "1px solid transparent",
            }}
          >
            Hitters
          </Link>

          <Link
            to="#pitchers"
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              textDecoration: "none",
              color: activeTab === "pitchers" ? "white" : "rgba(255,255,255,0.75)",
              background: activeTab === "pitchers" ? "rgba(59,130,246,0.40)" : "transparent",
              border: activeTab === "pitchers" ? "1px solid rgba(59,130,246,0.55)" : "1px solid transparent",
            }}
          >
            Pitchers
          </Link>
        </div>
      </div>

      {activeTab === "hitters" ? (
        <section id="hitters" style={{ marginTop: 22 }}>
          <h2 style={{ marginBottom: 10 }}>Hitters</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">TM</th>
                  <th align="left">PLAYER</th>
                  <th align="left">ELIG</th>

                  {/* Games played by position */}
                  <th align="right">DH</th>
                  <th align="right">C</th>
                  <th align="right">1B</th>
                  <th align="right">2B</th>
                  <th align="right">3B</th>
                  <th align="right">SS</th>
                  <th align="right">OF</th>

                  {/* Core hitter stats */}
                  <th align="right">R</th>
                  <th align="right">HR</th>
                  <th align="right">RBI</th>
                  <th align="right">SB</th>
                  <th align="right">AVG</th>
                </tr>
              </thead>

              <tbody>
                {hitters.map((p: any) => {
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

                  return (
                    <tr
                      key={key}
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelected(p)}
                      title="Click for player details"
                    >
                      <td style={{ padding: "10px 8px", opacity: 0.85 }}>{tm || ""}</td>
                      <td style={{ padding: "10px 8px" }}>{p?.player_name ?? p?.name ?? p?.playerName ?? ""}</td>
                      <td style={{ padding: "10px 8px", opacity: 0.8, whiteSpace: "nowrap" }}>{elig}</td>

                      <td style={{ padding: "10px 8px" }} align="right">{gDH || ""}</td>
                      <td style={{ padding: "10px 8px" }} align="right">{gC || ""}</td>
                      <td style={{ padding: "10px 8px" }} align="right">{g1B || ""}</td>
                      <td style={{ padding: "10px 8px" }} align="right">{g2B || ""}</td>
                      <td style={{ padding: "10px 8px" }} align="right">{g3B || ""}</td>
                      <td style={{ padding: "10px 8px" }} align="right">{gSS || ""}</td>
                      <td style={{ padding: "10px 8px" }} align="right">{gOF || ""}</td>

                      <td style={{ padding: "10px 8px" }} align="right">{asNum(p?.R)}</td>
                      <td style={{ padding: "10px 8px" }} align="right">{asNum(p?.HR)}</td>
                      <td style={{ padding: "10px 8px" }} align="right">{asNum(p?.RBI)}</td>
                      <td style={{ padding: "10px 8px" }} align="right">{asNum(p?.SB)}</td>
                      <td style={{ padding: "10px 8px" }} align="right">{formatAvg(p?.AVG)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section id="pitchers" style={{ marginTop: 22 }}>
          <h2 style={{ marginBottom: 10 }}>Pitchers</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">TM</th>
                  <th align="left">PLAYER</th>
                  <th align="left">ELIG</th>
                  <th align="right">W</th>
                  <th align="right">SV</th>
                  <th align="right">K</th>
                  <th align="right">IP</th>
                  <th align="right">ERA</th>
                  <th align="right">WHIP</th>
                </tr>
              </thead>

              <tbody>
                {pitchers.map((p: any) => {
                  const key = rowKey(p);
                  const tm = getMlbTeamAbbr(p);
                  const elig = posEligible(p) || "P";

                  return (
                    <tr
                      key={key}
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelected(p)}
                      title="Click for player details"
                    >
                      <td style={{ padding: "10px 8px", opacity: 0.85 }}>{tm || ""}</td>
                      <td style={{ padding: "10px 8px" }}>{p?.player_name ?? p?.name ?? p?.playerName ?? ""}</td>
                      <td style={{ padding: "10px 8px", opacity: 0.8, whiteSpace: "nowrap" }}>{elig}</td>

                      <td style={{ padding: "10px 8px" }} align="right">{asNum(p?.W)}</td>
                      <td style={{ padding: "10px 8px" }} align="right">{asNum(p?.SV)}</td>
                      <td style={{ padding: "10px 8px" }} align="right">{asNum(p?.K)}</td>
                      <td style={{ padding: "10px 8px" }} align="right">{String(p?.IP ?? "").trim()}</td>
                      <td style={{ padding: "10px 8px" }} align="right">{String(p?.ERA ?? "").trim()}</td>
                      <td style={{ padding: "10px 8px" }} align="right">{String(p?.WHIP ?? "").trim()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selected ? <PlayerDetailModal player={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
