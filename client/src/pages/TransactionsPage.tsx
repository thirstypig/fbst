// client/src/pages/TransactionsPage.tsx
import React, { useEffect, useState } from "react";
import { getTransactions, TransactionEvent, getPlayerSeasonStats, getLeagues, getLeague, PlayerSeasonStat, getSeasonStandings } from "../api";
import AddDropTab from "../components/AddDropTab";
import PageHeader from "../components/ui/PageHeader";
import { ThemedTable, ThemedThead, ThemedTh, ThemedTr, ThemedTd } from "../components/ui/ThemedTable";

  /* ... existing imports */

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState<'add_drop' | 'waivers' | 'history'>('add_drop');
  
  // Data
  const [transactions, setTransactions] = useState<TransactionEvent[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]); 
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [leagueId, setLeagueId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [txResp, playersResp, leaguesResp, standingsResp] = await Promise.all([
             getTransactions({ take: 100 }),
             getPlayerSeasonStats(), // Current Season
             getLeagues(),
             getSeasonStandings()
        ]);
        setTransactions(txResp.transactions);
        setPlayers(playersResp || []);
        
        // standingsResp returns { periodIds, rows }
        setStandings(standingsResp.rows || []);
        
        if (leaguesResp.leagues && leaguesResp.leagues.length > 0) {
            const league = leaguesResp.leagues[0];
            const lDetail = await getLeague(league.id);
            const loadedTeams = lDetail.league.teams || [];
            
            setLeagueId(league.id);
            setTeams(loadedTeams);

            // Default to first team if available
            if (loadedTeams.length > 0) {
                setSelectedTeamId(loadedTeams[0].id);
            }
        }

      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load buffer");
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
          // TODO: Use a proper API wrapper
          const res = await fetch('/api/transactions/claim', {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                  leagueId,
                  teamId: selectedTeamId,
                  playerId: (player as any).player_id || (player as any).id,
                  mlbId: player.mlb_id || (player as any).mlbId,
              })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Claim failed");

          alert(`Successfully claimed ${player.player_name}!`);
          window.location.reload(); // Simple refresh to show new state

      } catch (err: any) {
          console.error("Claim error:", err);
          alert(`Error: ${err.message || "Unknown error"}`);
      }
  };

  // Waiver Order: Reverse Standings logic
  // Standings are returned ranked 1..N (1 is best).
  // So sorting by rank DESC gives N..1 (worst to best).
  const sortedWaiverOrder = React.useMemo(() => {
      // 1. Create a map of teamId -> standing data
      const standingMap = new Map(standings.map(s => [s.teamId, s]));

      // 2. Map teams to include rank info
      const teamsWithRank = teams.map(t => {
          const s = standingMap.get(t.id);
          return {
              ...t,
              rank: s?.rank || 999,
              points: s?.points || 0
          };
      });

      // 3. Sort by rank DESC (higher rank number = worse team = better waiver priority)
      // Rank 1 (Best) -> Priority Last
      // Rank 8 (Worst) -> Priority First
      return teamsWithRank.sort((a: any, b: any) => b.rank - a.rank);
  }, [teams, standings]);

  if (loading) return <div className="p-10 text-slate-400">Loading transactions center...</div>;

  return (
    <div className="relative min-h-full">
       <div className="mb-10">
           <PageHeader 
             title="Transactions Center" 
             subtitle="Manage moves, waivers, and review history."
             rightElement={
                  <div className="flex items-center gap-4">
                      {/* Team Selector for Testing/Admin */}
                                  <div className="flex items-center gap-2">
                                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)]">Acting As:</label>
                                      <select 
                                          value={selectedTeamId || ''}
                                          onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                                          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-black text-white outline-none focus:border-[var(--fbst-accent)] transition-all"
                                      >
                                          {teams.map(t => (
                                              <option key={t.id} value={t.id} className="text-black">{t.name}</option>
                                          ))}
                                      </select>
                                  </div>

                      {/* Navigation Hub */}
                      <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
                           <button 
                              onClick={() => setActiveTab('add_drop')}
                              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'add_drop' ? 'bg-[var(--fbst-accent)] text-white shadow-lg shadow-red-500/20' : 'text-[var(--fbst-text-muted)] hover:text-[var(--fbst-text-primary)]'}`}
                           >
                               Add / Drop
                           </button>
                           <button 
                              onClick={() => setActiveTab('waivers')}
                              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "waivers" ? "bg-[var(--fbst-accent)] text-white shadow-lg shadow-red-500/20" : "text-[var(--fbst-text-muted)] hover:text-[var(--fbst-text-primary)]"}`}
                           >
                               Waivers
                           </button>
                           <button 
                              onClick={() => setActiveTab('history')}
                              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-[var(--fbst-accent)] text-white shadow-lg shadow-red-500/20' : 'text-[var(--fbst-text-muted)] hover:text-[var(--fbst-text-primary)]'}`}
                           >
                               History
                           </button>
                      </div>
                  </div>
             }
           />
       </div>


      <div className="mt-6">
          {activeTab === 'add_drop' && (
              <div className="liquid-glass rounded-3xl p-1 bg-white/[0.02]">
                <AddDropTab players={players} onClaim={handleClaim} />
              </div>
          )}

          {activeTab === 'waivers' && (
              <div className="max-w-xl mx-auto space-y-6">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-[var(--fbst-text-heading)] mb-2">Current Waiver Priority</h3>
                    <p className="text-xs text-[var(--fbst-text-muted)] uppercase tracking-widest font-bold">Reverse Standings Logic</p>
                  </div>
                  
                  <div className="liquid-glass rounded-3xl overflow-hidden border border-white/10">
                      {sortedWaiverOrder.map((t, idx) => (
                          <div key={t.id} className="flex items-center justify-between p-6 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors group">
                               <div className="flex items-center gap-6">
                                  <span className="text-3xl font-black text-[var(--fbst-text-muted)] opacity-20 w-8 tabular-nums group-hover:opacity-100 transition-opacity">{idx + 1}</span>
                                  <div>
                                      <div className="font-black text-lg text-[var(--fbst-text-primary)] tracking-tight">{t.name}</div>
                                      <div className="text-[10px] text-[var(--fbst-text-muted)] font-bold uppercase tracking-widest mt-0.5">{t.owner || 'No Owner'}</div>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <div className="text-xs font-mono font-black text-[var(--fbst-accent)]">
                                      RANK {t.rank === 999 ? '—' : t.rank}
                                  </div>
                                  <div className="text-[10px] font-mono text-[var(--fbst-text-muted)] mt-1 tracking-tighter uppercase font-bold">
                                      {t.points.toFixed(1)} PTS
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
                  <p className="text-center text-[10px] font-bold text-[var(--fbst-text-muted)] uppercase tracking-[0.2em] mt-8 bg-white/5 p-4 rounded-2xl border border-white/10">
                      Priority is determined by reverse standings. Claims process nightly.
                  </p>
              </div>
          )}

          {activeTab === 'history' && (
              <ThemedTable>
                  <ThemedThead>
                    <ThemedTr>
                      <ThemedTh>Date</ThemedTh>
                      <ThemedTh>Team</ThemedTh>
                      <ThemedTh>Player</ThemedTh>
                      <ThemedTh>Transaction</ThemedTh>
                    </ThemedTr>
                  </ThemedThead>
                  <tbody>
                    {transactions.map((tx) => (
                      <ThemedTr key={tx.id} className="group">
                        <ThemedTd className="whitespace-nowrap text-xs font-mono font-bold text-[var(--fbst-text-secondary)]">
                          {tx.effDate ? new Date(tx.effDate).toLocaleDateString() : tx.effDateRaw}
                        </ThemedTd>
                        <ThemedTd className="font-black text-[var(--fbst-text-primary)] tracking-tight">
                          {tx.team?.name || tx.ogbaTeamName}
                        </ThemedTd>
                        <ThemedTd className="font-bold text-[var(--fbst-text-secondary)]">
                          {tx.player?.name || tx.playerAliasRaw}
                        </ThemedTd>
                        <ThemedTd className="text-xs font-bold text-[var(--fbst-text-muted)] uppercase tracking-widest group-hover:text-[var(--fbst-accent)] transition-colors">
                          {tx.transactionRaw}
                        </ThemedTd>
                      </ThemedTr>
                    ))}
                    {transactions.length === 0 && (
                      <ThemedTr>
                        <ThemedTd colSpan={4} className="py-20 text-center text-xs font-black text-[var(--fbst-text-muted)] uppercase tracking-[0.2em]">
                          No records found in the transaction log.
                        </ThemedTd>
                      </ThemedTr>
                    )}
                  </tbody>
              </ThemedTable>
          )}
      </div>
    </div>
  );
}
