import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  getTransactions,
  TransactionEvent,
  getPlayerSeasonStats,
  getLeagues,
  getLeague,
  PlayerSeasonStat,
  getSeasonStandings,
} from "../../../api";
import { fetchJsonApi } from "../../../api/base";
import {
  getTrades,
  TradeProposal,
} from "../../trades/api";
import { processWaiverClaims } from "../../waivers/api";
import { useAuth } from "../../../auth/AuthProvider";
import { useLeague } from "../../../contexts/LeagueContext";
import AddDropTab from "../../roster/components/AddDropTab";
import { TradeCard, LeagueTradeCard, CreateTradeForm } from "../../trades/pages/TradesPage";
import TeamRosterView from "../../teams/components/TeamRosterView";
import PageHeader from "../../../components/ui/PageHeader";
import {
  ThemedTable,
  ThemedThead,
  ThemedTh,
  ThemedTr,
  ThemedTd,
} from "../../../components/ui/ThemedTable";
import { Button } from "../../../components/ui/button";
import { Eye, Plus, ChevronDown } from "lucide-react";

type ActivityTab = "add_drop" | "trades" | "waivers" | "history";

export default function ActivityPage() {
  const { me } = useAuth();
  const authUser = me?.user;
  const { leagueId: currentLeagueId } = useLeague();

  const isCommissioner =
    authUser?.isAdmin ||
    authUser?.memberships?.some(
      (m: any) => Number(m.leagueId) === currentLeagueId && m.role === "COMMISSIONER"
    );

  const [activeTab, setActiveTab] = useState<ActivityTab>("add_drop");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Transaction data
  const [transactions, setTransactions] = useState<TransactionEvent[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [leagueId, setLeagueId] = useState<number | null>(null);

  // Trade data
  const [trades, setTrades] = useState<TradeProposal[]>([]);
  const [showCreateTrade, setShowCreateTrade] = useState(false);
  const [showCompletedTrades, setShowCompletedTrades] = useState(false);
  const [contextTrade, setContextTrade] = useState<TradeProposal | null>(null);

  // History filters
  const [historyRange, setHistoryRange] = useState<string>("30");
  const [historyType, setHistoryType] = useState<string>("all");

  const loadTrades = useCallback(async () => {
    const leagueIdStr = authUser?.memberships?.[0]?.leagueId;
    if (!leagueIdStr) return;
    try {
      const res = await getTrades(Number(leagueIdStr), "all");
      setTrades(res.trades || []);
    } catch {
      setTrades([]);
    }
  }, [authUser]);

  useEffect(() => {
    async function load() {
      try {
        const [txResp, playersResp, leaguesResp, standingsResp] = await Promise.all([
          getTransactions({ take: 100 }),
          getPlayerSeasonStats(),
          getLeagues(),
          getSeasonStandings(),
        ]);
        setTransactions(txResp.transactions);
        setPlayers(playersResp || []);
        setStandings(standingsResp.rows || []);

        if (leaguesResp.leagues && leaguesResp.leagues.length > 0) {
          const league = leaguesResp.leagues[0];
          const lDetail = await getLeague(league.id);
          const loadedTeams = lDetail.league.teams || [];

          setLeagueId(league.id);
          setTeams(loadedTeams);

          // Auto-detect user's team
          const myTeam = loadedTeams.find(
            (t: any) => t.ownerUserId === Number(authUser?.id)
          );
          if (myTeam) {
            setSelectedTeamId(myTeam.id);
          } else if (loadedTeams.length > 0) {
            setSelectedTeamId(loadedTeams[0].id);
          }
        }

        // Load trades
        await loadTrades();
      } catch (err: unknown) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleClaim = async (player: PlayerSeasonStat) => {
    if (!selectedTeamId || !leagueId) {
      alert("Please select a team to claim for.");
      return;
    }

    const confirmed = confirm(`Submit waiver claim for ${player.player_name}?`);
    if (!confirmed) return;

    try {
      await fetchJsonApi("/api/transactions/claim", {
        method: "POST",
        body: JSON.stringify({
          leagueId,
          teamId: selectedTeamId,
          playerId: (player as any).player_id || (player as any).id,
          mlbId: player.mlb_id || (player as any).mlbId,
        }),
      });
      alert(`Successfully claimed ${player.player_name}!`);
      window.location.reload();
    } catch (err: unknown) {
      console.error("Claim error:", err);
      alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  // Waiver Order: Reverse Standings
  const sortedWaiverOrder = useMemo(() => {
    const standingMap = new Map(standings.map((s) => [s.teamId, s]));
    const teamsWithRank = teams.map((t) => {
      const s = standingMap.get(t.id);
      return { ...t, rank: s?.rank || 999, points: s?.points || 0 };
    });
    return teamsWithRank.sort((a: any, b: any) => b.rank - a.rank);
  }, [teams, standings]);

  // Trade categorization
  const activeTrades = useMemo(
    () => trades.filter((t) => ["PROPOSED", "ACCEPTED"].includes(t.status)),
    [trades]
  );
  const completedTrades = useMemo(
    () => trades.filter((t) => !["PROPOSED", "ACCEPTED"].includes(t.status)),
    [trades]
  );

  // Merged history: trades + transactions
  const mergedHistory = useMemo(() => {
    const tradeEvents = completedTrades.map((t) => ({
      type: "trade" as const,
      date: new Date(t.createdAt),
      data: t,
    }));
    const txEvents = transactions.map((tx) => ({
      type: "transaction" as const,
      date: tx.effDate ? new Date(tx.effDate) : new Date(tx.submittedAt || 0),
      data: tx,
    }));
    return [...tradeEvents, ...txEvents].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [completedTrades, transactions]);

  const filteredHistory = useMemo(() => {
    let items = mergedHistory;

    // Filter by type
    if (historyType === "trades") items = items.filter((i) => i.type === "trade");
    else if (historyType === "transactions") items = items.filter((i) => i.type === "transaction");

    // Filter by date range
    if (historyRange !== "all") {
      const days = Number(historyRange);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      items = items.filter((i) => i.date >= cutoff);
    }

    return items;
  }, [mergedHistory, historyRange, historyType]);

  if (loading)
    return (
      <div className="text-center text-[var(--lg-text-muted)] py-20 animate-pulse text-sm">
        Loading activity...
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-10">
      <div className="mb-10">
        <PageHeader
          title="Activity"
          subtitle="Manage roster moves, trades, waivers, and review transaction history."
          rightElement={
            <div className="flex items-center gap-4">
              <div className="lg-card p-1 flex gap-2">
                <Button
                  onClick={() => setActiveTab("add_drop")}
                  variant={activeTab === "add_drop" ? "default" : "ghost"}
                  size="sm"
                  className="px-6"
                >
                  Add / Drop
                </Button>
                <Button
                  onClick={() => setActiveTab("trades")}
                  variant={activeTab === "trades" ? "default" : "ghost"}
                  size="sm"
                  className="px-6"
                >
                  Trades
                </Button>
                <Button
                  onClick={() => setActiveTab("waivers")}
                  variant={activeTab === "waivers" ? "default" : "ghost"}
                  size="sm"
                  className="px-6"
                >
                  Waivers
                </Button>
                <Button
                  onClick={() => setActiveTab("history")}
                  variant={activeTab === "history" ? "default" : "ghost"}
                  size="sm"
                  className="px-6"
                >
                  History
                </Button>
              </div>
            </div>
          }
        />
      </div>

      <div className="mt-6">
        {/* Add/Drop Tab */}
        {activeTab === "add_drop" && (
          <div className="liquid-glass rounded-3xl p-1 bg-[var(--lg-tint)]">
            <AddDropTab players={players} onClaim={handleClaim} />
          </div>
        )}

        {/* Trades Tab */}
        {activeTab === "trades" && (
          <div className="space-y-8">
            {/* Propose Trade Button */}
            <div className="flex justify-end">
              <Button
                onClick={() => setShowCreateTrade(!showCreateTrade)}
                variant="default"
                className="px-8 shadow-xl shadow-blue-500/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Propose Trade
              </Button>
            </div>

            {/* Create Trade Form (inline) */}
            {showCreateTrade && (
              <CreateTradeForm
                onCancel={() => setShowCreateTrade(false)}
                onSuccess={() => {
                  loadTrades();
                  setShowCreateTrade(false);
                }}
              />
            )}

            {/* Active Trades */}
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20"></div>
                <h2 className="text-2xl font-semibold uppercase tracking-tight text-[var(--lg-text-heading)]">
                  Active Trades
                </h2>
              </div>
              {activeTrades.length === 0 ? (
                <div className="lg-card p-16 text-center text-[var(--lg-text-muted)] opacity-40 italic font-medium">
                  No active trade proposals.
                </div>
              ) : (
                <div className="grid gap-6">
                  {activeTrades.map((t) => (
                    <LeagueTradeCard
                      key={t.id}
                      trade={t}
                      onRefresh={loadTrades}
                      currentUserId={Number(authUser?.id)}
                      isAdmin={isCommissioner}
                      onViewContext={() => setContextTrade(t)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Completed Trades (collapsible) */}
            {completedTrades.length > 0 && (
              <div>
                <button
                  onClick={() => setShowCompletedTrades(!showCompletedTrades)}
                  className="flex items-center gap-4 mb-6 group cursor-pointer"
                >
                  <div className="w-1.5 h-6 bg-[var(--lg-text-muted)] opacity-20 rounded-full"></div>
                  <h2 className="text-2xl font-semibold uppercase tracking-tight text-[var(--lg-text-heading)] opacity-60">
                    Completed Trades ({completedTrades.length})
                  </h2>
                  <ChevronDown
                    className={`w-5 h-5 text-[var(--lg-text-muted)] transition-transform ${
                      showCompletedTrades ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {showCompletedTrades && (
                  <div className="grid gap-6">
                    {completedTrades.map((t) => (
                      <TradeCard
                        key={t.id}
                        trade={t}
                        onRefresh={loadTrades}
                        currentUserId={Number(authUser?.id)}
                        onViewContext={() => setContextTrade(t)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Waivers Tab */}
        {activeTab === "waivers" && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center mb-12">
              <h3 className="text-4xl font-semibold uppercase text-[var(--lg-text-heading)] mb-2">
                Waiver Priority
              </h3>
              <p className="text-xs text-[var(--lg-text-muted)] uppercase font-medium opacity-40">
                Based on Reverse Standings
              </p>
            </div>

            <div className="lg-card p-0 overflow-hidden divide-y divide-[var(--lg-divide)]">
              {sortedWaiverOrder.map((t, idx) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-8 hover:bg-[var(--lg-tint)] transition-colors group"
                >
                  <div className="flex items-center gap-8">
                    <span className="text-3xl font-bold text-[var(--lg-text-muted)] opacity-10 w-12 tabular-nums group-hover:opacity-30 transition-opacity">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-2xl text-[var(--lg-text-primary)]">
                        {t.name}
                      </div>
                      <div className="text-xs text-[var(--lg-text-muted)] font-medium uppercase mt-1 opacity-60">
                        {t.owner || "No Owner"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-semibold text-[var(--lg-accent)]">
                      {t.rank === 999 ? "—" : `POS ${t.rank}`}
                    </div>
                    <div className="text-xs font-medium text-[var(--lg-text-muted)] mt-1 uppercase opacity-40">
                      {t.points.toFixed(1)} Pts
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center text-xs font-medium text-[var(--lg-text-muted)] uppercase mt-12 bg-[var(--lg-tint)] p-6 rounded-3xl border border-[var(--lg-border-subtle)] opacity-60">
              Waiver priority is based on reverse standings order. Claims are processed at
              scheduled times.
            </div>

            {/* Commissioner Process Button */}
            {leagueId && isCommissioner && (
              <div className="text-center mt-6">
                <Button
                  onClick={async () => {
                    if (!confirm("Process all pending waiver claims for this league?")) return;
                    setProcessing(true);
                    try {
                      const result = await processWaiverClaims(leagueId);
                      alert(`Waivers processed. ${result.logs.length} claims handled.`);
                      window.location.reload();
                    } catch (err: any) {
                      alert(`Error: ${err?.message || "Failed to process waivers"}`);
                    } finally {
                      setProcessing(false);
                    }
                  }}
                  disabled={processing}
                  variant="default"
                  className="px-8"
                >
                  {processing ? "Processing..." : "Process Waivers"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {/* History Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={historyRange}
                onChange={(e) => setHistoryRange(e.target.value)}
                className="lg-input w-auto min-w-[160px] text-xs font-medium py-2"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
              <select
                value={historyType}
                onChange={(e) => setHistoryType(e.target.value)}
                className="lg-input w-auto min-w-[160px] text-xs font-medium py-2"
              >
                <option value="all">All Types</option>
                <option value="trades">Trades Only</option>
                <option value="transactions">Roster Moves Only</option>
              </select>
              <span className="text-xs text-[var(--lg-text-muted)] font-medium ml-2">
                {filteredHistory.length} {filteredHistory.length === 1 ? "event" : "events"}
              </span>
            </div>

            <div className="lg-card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <ThemedTable bare>
                  <ThemedThead>
                    <ThemedTr>
                      <ThemedTh className="pl-8">Date</ThemedTh>
                      <ThemedTh>Type</ThemedTh>
                      <ThemedTh>Team</ThemedTh>
                      <ThemedTh className="pr-8">Details</ThemedTh>
                    </ThemedTr>
                  </ThemedThead>
                  <tbody className="divide-y divide-[var(--lg-divide)]">
                  {filteredHistory.map((item, idx) => {
                    if (item.type === "trade") {
                      const t = item.data as TradeProposal;
                      return (
                        <ThemedTr key={`trade-${t.id}`} className="group hover:bg-[var(--lg-tint)]">
                          <ThemedTd className="pl-8">
                            {item.date.toLocaleDateString()}
                          </ThemedTd>
                          <ThemedTd>
                            <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-400">
                              Trade
                            </span>
                          </ThemedTd>
                          <ThemedTd>
                            {t.proposingTeam?.name ?? "—"} ↔ {t.acceptingTeam?.name ?? "—"}
                          </ThemedTd>
                          <ThemedTd className="pr-8">
                            <span className="text-xs font-mono uppercase text-[var(--lg-text-muted)]">
                              {t.status}
                            </span>
                          </ThemedTd>
                        </ThemedTr>
                      );
                    } else {
                      const tx = item.data as TransactionEvent;
                      return (
                        <ThemedTr key={`tx-${tx.id}`} className="group hover:bg-[var(--lg-tint)]">
                          <ThemedTd className="pl-8">
                            {tx.effDate
                              ? new Date(tx.effDate).toLocaleDateString()
                              : tx.effDateRaw}
                          </ThemedTd>
                          <ThemedTd>
                            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                              {tx.transactionRaw || "Roster"}
                            </span>
                          </ThemedTd>
                          <ThemedTd>{tx.team?.name || tx.ogbaTeamName}</ThemedTd>
                          <ThemedTd className="pr-8">
                            {tx.player?.name || tx.playerAliasRaw}
                          </ThemedTd>
                        </ThemedTr>
                      );
                    }
                  })}
                  {filteredHistory.length === 0 && (
                    <ThemedTr>
                      <ThemedTd colSpan={4} className="py-32 text-center">
                        {mergedHistory.length === 0 ? "No activity found." : "No events match your filters."}
                      </ThemedTd>
                    </ThemedTr>
                  )}
                  </tbody>
                </ThemedTable>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trade Context Modal */}
      {contextTrade && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setContextTrade(null)}
        >
          <div
            className="rounded-xl border border-[var(--lg-border-subtle)] bg-[var(--lg-tint)] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[var(--lg-border-subtle)] flex justify-between items-center bg-[var(--lg-tint)]">
              <h3 className="font-semibold text-lg text-[var(--lg-text-heading)]">Trade Context</h3>
              <button
                onClick={() => setContextTrade(null)}
                className="text-[var(--lg-text-muted)] hover:text-[var(--lg-text-primary)]"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
              <TeamRosterView
                teamId={contextTrade.proposingTeamId ?? contextTrade.proposerId}
                teamName={contextTrade.proposingTeam?.name ?? "Proposer"}
              />
              <TeamRosterView
                teamId={contextTrade.acceptingTeamId ?? 0}
                teamName={contextTrade.acceptingTeam?.name ?? "Counterparty"}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
