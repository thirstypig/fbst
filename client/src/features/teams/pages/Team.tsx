import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { getPlayerSeasonStats, type PlayerSeasonStat, getTeamDetails, getTeams, getTeamAiInsights, TeamInsightsResult } from "../../../api";
import { getTeamAiInsightsHistory, type WeeklyInsightEntry } from "../api";
import PlayerDetailModal from "../../../components/shared/PlayerDetailModal";
import PlayerExpandedRow from "../../auction/components/PlayerExpandedRow";
import { useLeague } from "../../../contexts/LeagueContext";
import { getTradeBlock } from "../api";

import { getOgbaTeamName } from "../../../lib/ogbaTeams";
import { isPitcher, normalizePosition, formatAvg, getMlbTeamAbbr, sortByPosition } from "../../../lib/playerDisplay";
import { mapPosition, positionToSlots } from "../../../lib/sportConfig";
import { fetchJsonApi, API_BASE } from "../../../api/base";
import { TableCard, Table, THead, Tr, Th, Td } from "../../../components/ui/TableCard";
import { Button } from "../../../components/ui/button";
import { Sparkles, Loader2, ArrowLeftRight, ChevronDown, ChevronUp } from "lucide-react";

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

function normalizePosList(raw: any, ofMode: string = "OF"): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";

  const parts = s
    .split(/[/,| ]+/)
    .map((x) => x.trim())
    .filter(Boolean);

  const out: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const n = mapPosition(normalizePosition(part), ofMode);
    if (!n) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }

  return out.join("/");
}

function posEligible(p: any, ofMode: string = "OF"): string {
  const raw = p?.positions ?? p?.pos ?? p?.position ?? p?.positionEligible ?? p?.position_eligible ?? "";
  return normalizePosList(raw, ofMode);
}


export default function Team() {
  const { teamCode } = useParams();
  const code = normCode(teamCode);
  const { leagueId, outfieldMode, seasonStatus } = useLeague();
  // Positions are locked on the Team page during the season for everyone.
  // Commissioners manage position changes from the Commissioner page Roster tab.
  const positionsLocked = seasonStatus === "IN_SEASON" || seasonStatus === "COMPLETED";

  const loc = useLocation();
  const activeTab: "hitters" | "pitchers" = loc.hash === "#pitchers" ? "pitchers" : "hitters";

  const [players, setPlayers] = useState<PlayerSeasonStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbTeamId, setDbTeamId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PlayerSeasonStat | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Position editing state
  const MATRIX_POSITIONS = ["C", "1B", "2B", "3B", "SS", "MI", "CM", "OF", "DH", "P"];
  const [positionOverrides, setPositionOverrides] = useState<Record<number, string>>({});
  const handlePositionSwap = React.useCallback(async (teamId: number, rosterId: number, newPos: string) => {
    setPositionOverrides(prev => ({ ...prev, [rosterId]: newPos }));
    try {
      await fetchJsonApi(`${API_BASE}/teams/${teamId}/roster/${rosterId}`, {
        method: 'PATCH',
        body: JSON.stringify({ assignedPosition: newPos }),
      });
      setPositionOverrides(prev => { const n = { ...prev }; delete n[rosterId]; return n; });
    } catch {
      setPositionOverrides(prev => { const n = { ...prev }; delete n[rosterId]; return n; });
    }
  }, []);

  // AI Insights state
  const [aiInsights, setAiInsights] = useState<TeamInsightsResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiExpanded, setAiExpanded] = useState(false);

  // Weekly insights history (tab-based)
  const [insightHistory, setInsightHistory] = useState<WeeklyInsightEntry[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [selectedWeekKey, setSelectedWeekKey] = useState<string | null>(null);

  // Trade block state
  const [tradeBlockIds, setTradeBlockIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    let ok = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // 1. Load teams + CSV stats in parallel (independent calls)
        const [allTeams, csvRows] = await Promise.all([
          getTeams(leagueId),
          getPlayerSeasonStats(),
        ]);
        if (!ok) return;

        const ogbaName = getOgbaTeamName(code);
        const team = allTeams.find((t: any) => normCode(t.code) === code)
          || allTeams.find((t: any) => normCode(t.name) === code)
          || allTeams.find((t: any) => t.name.trim() === ogbaName);

        const foundId = team?.id || 0;

        if (foundId) {
          setDbTeamId(foundId);

          // 3. Load DB roster + trade block in parallel
          const [details, tradeBlockData] = await Promise.all([
            getTeamDetails(foundId),
            getTradeBlock(foundId).catch(() => ({ playerIds: [] as number[] })),
          ]);
          if (!ok) return;
          setTradeBlockIds(new Set(tradeBlockData.playerIds));

          // 4. Build player list from DB roster, merge in CSV stats
          const dbRoster: any[] = details.currentRoster || [];
          const merged: PlayerSeasonStat[] = dbRoster.map((r: any) => {
            // teamService returns flat objects (not nested under .player)
            const mlbId = r.mlbId || r.mlb_id || r.player?.mlbId;
            const playerName = r.name || r.player?.name || "";
            const posPrimary = r.posPrimary || r.player?.posPrimary || "";
            const mlbTeam = r.mlbTeam || r.player?.mlbTeam || "";
            const posList = r.posList || r.player?.posList || "";
            const price = r.price ?? 0;

            // Find matching CSV row by mlb_id
            const csvMatch = mlbId
              ? (csvRows ?? []).find((s: any) => Number(s.mlb_id || s.mlbId) === Number(mlbId))
              : null;

            const isKeeper = r.isKeeper ?? false;

            const dbPlayerId = r.playerId ?? r.player?.id ?? 0;

            if (csvMatch) {
              // Use CSV stats, overlay DB fields for consistency
              return {
                ...csvMatch,
                _dbPlayerId: dbPlayerId,
                _rosterId: r.id,
                _posList: posList || posPrimary || "",
                assignedPosition: r.assignedPosition || "",
                ogba_team_code: code,
                ogba_team_name: team?.name ?? "",
                mlb_team_abbr: mlbTeam || csvMatch.mlb_team_abbr || csvMatch.mlb_team || "",
                player_name: csvMatch.player_name || playerName,
                price,
                isKeeper,
              };
            }

            // No CSV match — build a minimal row from DB data
            const pitcherPos = ["P", "SP", "RP"];
            // For two-way players (Ohtani), use assignedPosition to determine pitcher status
            const assignedPos = r.assignedPosition || "";
            const effectiveIsPitcher = pitcherPos.includes(assignedPos) || pitcherPos.includes(posPrimary);
            return {
              _dbPlayerId: dbPlayerId,
              _rosterId: r.id,
              _posList: posList || posPrimary || "",
              assignedPosition: assignedPos,
              mlb_id: String(mlbId || ""),
              player_name: playerName,
              ogba_team_code: code,
              ogba_team_name: team?.name ?? "",
              positions: assignedPos || posList || posPrimary || "UT",
              posPrimary: assignedPos || posPrimary,
              is_pitcher: effectiveIsPitcher,
              R: 0, HR: 0, RBI: 0, SB: 0, H: 0, AB: 0, AVG: 0,
              W: 0, SV: 0, K: 0, IP: 0, ERA: 0, WHIP: 0, BB_H: 0,
              mlb_team_abbr: mlbTeam,
              price,
              isKeeper,
            } as unknown as PlayerSeasonStat;
          });

          setPlayers(merged);
        } else {
          // Fallback: filter CSV data by team code (legacy behavior)
          const filtered = (csvRows ?? []).filter(
            (p: any) => normCode(p?.ogba_team_code ?? p?.team ?? p?.ogbaTeamCode) === code
          );
          setPlayers(filtered);
        }

      } catch (err: unknown) {
        if (!ok) return;
        setError(err instanceof Error ? err.message : "Failed to load team roster");
        setPlayers([]);
      } finally {
        if (ok) setLoading(false);
      }
    }

    load();
    return () => {
      ok = false;
    };
  }, [code, leagueId]);

  // Fetch AI insights + history in parallel once dbTeamId is available
  useEffect(() => {
    if (!dbTeamId || !leagueId || aiInsights || aiLoading) return;
    let ok = true;
    (async () => {
      setAiLoading(true);
      try {
        // Fire both requests in parallel instead of sequentially
        const [result, historyResult] = await Promise.allSettled([
          getTeamAiInsights(leagueId, dbTeamId),
          getTeamAiInsightsHistory(leagueId, dbTeamId),
        ]);
        if (!ok) return;
        if (result.status === "fulfilled") setAiInsights(result.value);
        if (historyResult.status === "fulfilled" && historyResult.value.weeks.length > 0) {
          setInsightHistory(historyResult.value.weeks);
          setSelectedWeekKey(historyResult.value.weeks[0].weekKey);
        }
        setHistoryLoaded(true);
      } catch {
        // Silently fail — insights are supplementary
      } finally {
        if (ok) setAiLoading(false);
      }
    })();
    return () => { ok = false; };
  }, [dbTeamId, leagueId]); // eslint-disable-line react-hooks/exhaustive-deps

  const teamName = useMemo(() => getOgbaTeamName(code) || code, [code]);

  // Sort hitters by roster slot order: C, 1B, 2B, 3B, SS, MI, CM, OF, DH
  const SLOT_ORDER = ["C", "1B", "2B", "3B", "SS", "MI", "CM", "OF", "DH"];
  const hitters = useMemo(() => {
    const list = players.filter((p) => !isPitcher(p));
    list.sort((a, b) => {
      const posA = (a as any).assignedPosition || "";
      const posB = (b as any).assignedPosition || "";
      const ia = SLOT_ORDER.indexOf(posA);
      const ib = SLOT_ORDER.indexOf(posB);
      const slotDiff = (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      if (slotDiff !== 0) return slotDiff;
      // Within same slot, sort by price descending
      return ((b as any).price ?? 0) - ((a as any).price ?? 0);
    });
    return list;
  }, [players]);
  const pitchers = useMemo(() => {
    const list = players.filter((p) => isPitcher(p));
    list.sort((a, b) => ((b as any).isKeeper ? 1 : 0) - ((a as any).isKeeper ? 1 : 0));
    return list;
  }, [players]);

  return (
    <div className="flex-1 min-h-screen bg-[var(--lg-bg)] text-[var(--lg-text-primary)]">
      <main className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-12">
        <header className="mb-10 text-center relative">
          <h1 className="text-3xl font-semibold uppercase text-[var(--lg-text-heading)] mb-4">{teamName}</h1>
          <div className="text-xs font-medium uppercase text-[var(--lg-text-muted)] opacity-60">
            Roster: {hitters.length} Hitters • {pitchers.length} Pitchers
            {players.some((p: any) => p.isKeeper) && (
              <span className="ml-3 text-amber-500">
                • {players.filter((p: any) => p.isKeeper).length} Keepers
              </span>
            )}
          </div>
          
          <div className="mt-8 flex justify-center gap-6">
             <Link to="/season">
               <Button variant="ghost" size="sm">
                 <span className="opacity-40 ml-[-4px] mr-2">←</span> Teams
               </Button>
             </Link>

             {/* AI Insights auto-generate on load — no manual button needed */}
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* AI Insights Section — auto-generates weekly */}
        {aiLoading && !aiInsights && (
          <div className="mb-6 flex items-center justify-center gap-2 py-6 text-xs text-[var(--lg-text-muted)] animate-pulse">
            <Sparkles size={14} className="text-blue-400" />
            Generating weekly insights...
          </div>
        )}
        {aiError && (
          <div className="mb-4 text-center text-xs text-red-400">{aiError}</div>
        )}
        {aiInsights && (() => {
          // Determine which insight data to display based on selected week tab
          const activeInsight: any = selectedWeekKey && insightHistory.length > 1
            ? insightHistory.find(w => w.weekKey === selectedWeekKey) || aiInsights
            : aiInsights;
          const activeGrade = activeInsight?.overallGrade || aiInsights.overallGrade;
          const activeMode = activeInsight?.mode || (aiInsights as any).mode;
          const activeDate = activeInsight?.generatedAt || (aiInsights as any).generatedAt;
          const activeWeekKey = activeInsight?.weekKey || (aiInsights as any).weekKey;
          const activeInsightsList = activeInsight?.insights || aiInsights.insights || [];

          return (
          <div className="mb-8 rounded-2xl border border-[var(--lg-border-subtle)] bg-[var(--lg-tint)] overflow-hidden">
            {/* Header — always visible, acts as toggle */}
            <button
              onClick={() => setAiExpanded(prev => !prev)}
              className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-[var(--lg-bg-card)]/30 transition-colors text-left"
            >
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <Sparkles size={14} className="text-[var(--lg-accent)] flex-shrink-0" />
                <span className="text-xs font-semibold uppercase text-[var(--lg-text-muted)]">Weekly Insights</span>
                {activeMode && (
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                    activeMode === "in-season"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  }`}>
                    {activeMode}
                  </span>
                )}
                {activeDate && (
                  <span className="text-[10px] text-[var(--lg-text-muted)] opacity-60">
                    {new Date(activeDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {activeGrade && (
                  <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-[var(--lg-accent)]/10 text-[var(--lg-accent)] border border-[var(--lg-accent)]/20">
                    {activeGrade}
                  </span>
                )}
                {aiExpanded ? <ChevronUp size={14} className="text-[var(--lg-text-muted)]" /> : <ChevronDown size={14} className="text-[var(--lg-text-muted)]" />}
              </div>
            </button>

            {/* Expandable content */}
            {aiExpanded && (
              <div className="px-4 pb-4 md:px-5 md:pb-5">
                {/* Week tabs — only show when there are multiple weeks */}
                {insightHistory.length > 1 && (
                  <div className="mb-4 flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
                    {insightHistory.map((week) => {
                      const weekNum = week.weekKey.split("-W")[1] || week.weekKey;
                      const isActive = week.weekKey === selectedWeekKey;
                      return (
                        <button
                          key={week.weekKey}
                          onClick={(e) => { e.stopPropagation(); setSelectedWeekKey(week.weekKey); }}
                          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                            isActive
                              ? "bg-[var(--lg-accent)] text-white"
                              : "bg-[var(--lg-bg-card)] text-[var(--lg-text-muted)] border border-[var(--lg-border-faint)] hover:text-[var(--lg-text-primary)] hover:border-[var(--lg-accent)]/30"
                          }`}
                        >
                          W{weekNum}
                          {week.overallGrade && (
                            <span className={`ml-1.5 ${isActive ? "opacity-80" : "opacity-60"}`}>{week.overallGrade}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeInsightsList.map((insight: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-[var(--lg-bg-card)] border border-[var(--lg-border-faint)]">
                      <div className="flex items-start gap-2 mb-1">
                        {insight.priority && (
                          <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            insight.priority === "high" ? "bg-red-400" :
                            insight.priority === "medium" ? "bg-amber-400" : "bg-[var(--lg-text-muted)]"
                          }`} />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[var(--lg-accent)]/10 text-[var(--lg-accent)]">
                              {insight.category}
                            </span>
                            <span className="text-xs font-semibold text-[var(--lg-text-primary)] leading-tight">{insight.title}</span>
                          </div>
                          <p className="text-xs text-[var(--lg-text-secondary)] leading-relaxed mt-1">{insight.detail}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {activeWeekKey && (
                  <div className="mt-3 text-center text-[10px] text-[var(--lg-text-muted)] opacity-50">
                    Week {activeWeekKey} · Powered by <strong>Google Gemini</strong> & <strong>Anthropic Claude</strong>
                  </div>
                )}
              </div>
            )}
          </div>
          );
        })()}

        <div className="mb-10 flex justify-center">
          <div className="lg-card p-1">
            <Link to="#hitters">
              <Button
                variant={activeTab === "hitters" ? "default" : "ghost"}
                className="px-8"
              >
                Hitters
              </Button>
            </Link>
            <Link to="#pitchers">
              <Button
                variant={activeTab === "pitchers" ? "default" : "ghost"}
                className="px-8"
              >
                Pitchers
              </Button>
            </Link>
          </div>
        </div>

        {activeTab === "hitters" ? (
          <section id="hitters">
            <TableCard>
              <Table>
                <THead>
                  <Tr>
                    <Th align="center">POS</Th>
                    <Th align="center">PLAYER</Th>
                    <Th align="center">TM</Th>
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
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-[var(--lg-text-muted)]">
                        Loading roster…
                      </td>
                    </tr>
                  ) : hitters.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-[var(--lg-text-muted)]">
                        No hitters found for this roster.
                      </td>
                    </tr>
                  ) : (
                    hitters.map((p: any) => {
                      const key = rowKey(p);
                      const tm = getMlbTeamAbbr(p);
                      const elig = posEligible(p, outfieldMode);
                      const isExpanded = expandedId === key;

                      // Grand Slams (supports multiple common key names)
                      const gs = numFromAny(p, "GS", "gs", "GSL", "gsl", "grandSlams", "grand_slams");

                      return (
                        <React.Fragment key={key}>
                          <Tr
                            className={`border-t border-[var(--lg-border-faint)] cursor-pointer transition-all ${isExpanded ? 'bg-[var(--lg-accent)]/10' : 'hover:bg-[var(--lg-tint)]'}`}
                            onClick={() => setExpandedId(isExpanded ? null : key)}
                            title="Click to expand player details"
                          >
                            <Td align="center">
                              {(() => {
                                const rosterId = (p as any)?._rosterId as number | undefined;
                                // Show the locked roster slot from assignedPosition
                                const assignedPos = positionOverrides[rosterId!] || mapPosition((p as any)?.assignedPosition || (p as any)?.posPrimary || elig.split("/")[0] || "", outfieldMode);

                                if (positionsLocked || !rosterId || !dbTeamId) {
                                  // During season: fixed position label, no dropdown
                                  return <span className="text-[10px] font-mono font-semibold text-[var(--lg-accent)]">{assignedPos || "—"}</span>;
                                }

                                // During draft/setup: allow position changes
                                const rawPosList = (p as any)?._posList || elig || "";
                                const posSlots = (() => {
                                  const slots = new Set<string>();
                                  for (const pos of rawPosList.split(/[,/| ]+/).map((s: string) => s.trim()).filter(Boolean)) {
                                    for (const s of positionToSlots(pos)) slots.add(s);
                                  }
                                  return MATRIX_POSITIONS.filter(s => slots.has(s));
                                })();
                                return posSlots.length > 1 ? (
                                  <select
                                    className="appearance-none bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20 transition-all outline-none text-[10px] font-mono"
                                    value={assignedPos}
                                    onChange={(e) => { e.stopPropagation(); handlePositionSwap(dbTeamId, rosterId, e.target.value); }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {posSlots.map(pos => <option key={pos} value={pos} className="text-black">{pos}</option>)}
                                  </select>
                                ) : (
                                  <span className="text-[10px] font-mono font-semibold text-[var(--lg-accent)]">{assignedPos || "—"}</span>
                                );
                              })()}
                            </Td>
                            <Td align="center">
                              <span className="inline-flex items-center gap-1.5">
                                {p?.player_name ?? p?.name ?? p?.playerName ?? ""}
                                {(p as any)?.isKeeper && <span className="text-[10px] font-semibold uppercase text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1 py-px rounded" title="Keeper">K</span>}
                                {tradeBlockIds.has((p as any)?._dbPlayerId) && (
                                  <span className="text-[10px] font-semibold uppercase text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1 py-px rounded" title="On trade block">
                                    <ArrowLeftRight size={10} className="inline -mt-px" /> TB
                                  </span>
                                )}
                              </span>
                            </Td>
                            <Td align="center">
                              {tm || "—"}
                            </Td>
                            <Td align="center">
                              {asNum(p?.R)}
                            </Td>
                            <Td align="center">
                              {asNum(p?.HR)}
                            </Td>
                            <Td align="center">
                              {asNum(p?.RBI)}
                            </Td>
                            <Td align="center">
                              {asNum(p?.SB)}
                            </Td>
                            <Td align="center">
                              {formatAvg(p?.AVG)}
                            </Td>
                            <Td align="center">
                              {gs}
                            </Td>
                          </Tr>
                          {isExpanded && (
                            <PlayerExpandedRow
                              player={p}
                              isTaken={true}
                              ownerName={teamName}
                              onViewDetail={setSelected}
                              colSpan={9}
                            />
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                  {/* Totals row */}
                  {hitters.length > 0 && (() => {
                    const totR = hitters.reduce((s, p) => s + asNum(p?.R), 0);
                    const totHR = hitters.reduce((s, p) => s + asNum(p?.HR), 0);
                    const totRBI = hitters.reduce((s, p) => s + asNum(p?.RBI), 0);
                    const totSB = hitters.reduce((s, p) => s + asNum(p?.SB), 0);
                    const totH = hitters.reduce((s, p) => s + asNum(p?.H), 0);
                    const totAB = hitters.reduce((s, p) => s + asNum(p?.AB), 0);
                    const teamAvg = totAB > 0 ? totH / totAB : 0;
                    return (
                      <tr className="border-t-2 border-[var(--lg-accent)]/30 bg-[var(--lg-tint)]">
                        <Td align="center"><span className="text-[10px] font-bold text-[var(--lg-accent)]">TOT</span></Td>
                        <Td align="center"><span className="font-bold text-xs text-[var(--lg-text-heading)]">Team Totals</span></Td>
                        <Td align="center">{""}</Td>
                        <Td align="center"><span className="font-bold">{totR}</span></Td>
                        <Td align="center"><span className="font-bold">{totHR}</span></Td>
                        <Td align="center"><span className="font-bold">{totRBI}</span></Td>
                        <Td align="center"><span className="font-bold">{totSB}</span></Td>
                        <Td align="center"><span className="font-bold">{formatAvg(teamAvg)}</span></Td>
                        <Td align="center">{""}</Td>
                      </tr>
                    );
                  })()}
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
                    <Th align="center">POS</Th>
                    <Th align="center">PLAYER</Th>
                    <Th align="center">TM</Th>
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
                      <td colSpan={10} className="px-4 py-8 text-center text-sm text-[var(--lg-text-muted)]">
                        Loading roster…
                      </td>
                    </tr>
                  ) : pitchers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-sm text-[var(--lg-text-muted)]">
                        No pitchers found for this roster.
                      </td>
                    </tr>
                  ) : (
                    pitchers.map((p: any) => {
                      const key = rowKey(p);
                      const tm = getMlbTeamAbbr(p);
                      const elig = posEligible(p, outfieldMode) || "P";
                      const isExpanded = expandedId === key;

                      // Shutouts (commonly "SHO"; sometimes "SO" in custom datasets)
                      const so = numFromAny(p, "SHO", "sho", "SO", "so", "shutouts", "shut_outs");

                      return (
                        <React.Fragment key={key}>
                          <Tr
                            className={`border-t border-[var(--lg-border-faint)] cursor-pointer transition-all ${isExpanded ? 'bg-[var(--lg-accent)]/10' : 'hover:bg-[var(--lg-tint)]'}`}
                            onClick={() => setExpandedId(isExpanded ? null : key)}
                            title="Click to expand player details"
                          >
                            <Td align="center">
                              {/* Pitchers always show P — locked during season */}
                              <span className="text-[10px] font-mono font-semibold text-[var(--lg-accent)]">P</span>
                            </Td>
                            <Td align="center">
                              <span className="inline-flex items-center gap-1.5">
                                {p?.player_name ?? p?.name ?? p?.playerName ?? ""}
                                {(p as any)?.isKeeper && <span className="text-[10px] font-semibold uppercase text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1 py-px rounded" title="Keeper">K</span>}
                                {tradeBlockIds.has((p as any)?._dbPlayerId) && (
                                  <span className="text-[10px] font-semibold uppercase text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1 py-px rounded" title="On trade block">
                                    <ArrowLeftRight size={10} className="inline -mt-px" /> TB
                                  </span>
                                )}
                              </span>
                            </Td>
                            <Td align="center">
                              {tm || "—"}
                            </Td>

                            <Td align="center">
                              {asNum(p?.W)}
                            </Td>
                            <Td align="center">
                              {asNum(p?.SV)}
                            </Td>
                            <Td align="center">
                              {asNum(p?.K)}
                            </Td>
                            <Td align="center">
                              {asNum(p?.IP) > 0 ? asNum(p.IP).toFixed(1) : "—"}
                            </Td>
                            <Td align="center">
                              {asNum(p?.IP) > 0 ? asNum(p.ERA).toFixed(2) : "—"}
                            </Td>
                            <Td align="center">
                              {asNum(p?.IP) > 0 ? asNum(p.WHIP).toFixed(2) : "—"}
                            </Td>
                            <Td align="center">
                              {so}
                            </Td>
                          </Tr>
                          {isExpanded && (
                            <PlayerExpandedRow
                              player={p}
                              isTaken={true}
                              ownerName={teamName}
                              onViewDetail={setSelected}
                              colSpan={10}
                            />
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                  {/* Totals row */}
                  {pitchers.length > 0 && (() => {
                    const totW = pitchers.reduce((s, p) => s + asNum(p?.W), 0);
                    const totSV = pitchers.reduce((s, p) => s + asNum(p?.SV), 0);
                    const totK = pitchers.reduce((s, p) => s + asNum(p?.K), 0);
                    const totIP = pitchers.reduce((s, p) => s + asNum(p?.IP), 0);
                    const totER = pitchers.reduce((s, p) => s + asNum(p?.ER), 0);
                    const totBBH = pitchers.reduce((s, p) => s + asNum(p?.BB_H), 0);
                    const teamERA = totIP > 0 ? (totER / totIP) * 9 : 0;
                    const teamWHIP = totIP > 0 ? totBBH / totIP : 0;
                    return (
                      <tr className="border-t-2 border-[var(--lg-accent)]/30 bg-[var(--lg-tint)]">
                        <Td align="center"><span className="text-[10px] font-bold text-[var(--lg-accent)]">TOT</span></Td>
                        <Td align="center"><span className="font-bold text-xs text-[var(--lg-text-heading)]">Team Totals</span></Td>
                        <Td align="center">{""}</Td>
                        <Td align="center"><span className="font-bold">{totW}</span></Td>
                        <Td align="center"><span className="font-bold">{totSV}</span></Td>
                        <Td align="center"><span className="font-bold">{totK}</span></Td>
                        <Td align="center"><span className="font-bold">{totIP > 0 ? totIP.toFixed(1) : "—"}</span></Td>
                        <Td align="center"><span className="font-bold">{totIP > 0 ? teamERA.toFixed(2) : "—"}</span></Td>
                        <Td align="center"><span className="font-bold">{totIP > 0 ? teamWHIP.toFixed(2) : "—"}</span></Td>
                        <Td align="center">{""}</Td>
                      </tr>
                    );
                  })()}
                </tbody>
              </Table>
            </TableCard>
          </section>
        )}

        {selected ? <PlayerDetailModal player={selected} onClose={() => setSelected(null)} /> : null}

      </main>
    </div>
  );
}
