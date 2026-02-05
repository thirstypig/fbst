// client/src/pages/TransactionsPage.tsx
import React, { useEffect, useState } from "react";
import { getTransactions, TransactionEvent, getPlayerSeasonStats, getLeagues, getLeague, PlayerSeasonStat, getSeasonStandings } from "../api";
import AddDropTab from "../components/AddDropTab";
import PageHeader from "../components/ui/PageHeader";

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
    <div className="px-10 py-8 text-slate-100 min-h-screen">
       <div className="w-full">
           <PageHeader 
             title="Transactions Center" 
             subtitle="Manage moves, waivers, and review history."
             rightElement={
                  <div className="flex items-center gap-4">
                      {/* Team Selector for Testing/Admin */}
                      <div className="flex items-center gap-2">
                          <label className="text-sm text-slate-400">Acting As:</label>
                          <select 
                              value={selectedTeamId || ''}
                              onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                              className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm"
                          >
                              {teams.map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                          </select>
                      </div>

                      {/* Tabs */}
                      <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-800">
                           <button 
                              onClick={() => setActiveTab('add_drop')}
                              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'add_drop' ? 'bg-[var(--fbst-primary)] text-white shadow' : 'text-slate-400 hover:text-white'}`}
                           >
                               Add / Drop
                           </button>
                           <button 
                              onClick={() => setActiveTab('waivers')}
                              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'waivers' ? 'bg-[var(--fbst-primary)] text-white shadow' : 'text-slate-400 hover:text-white'}`}
                           >
                               Waiver Order
                           </button>
                           <button 
                              onClick={() => setActiveTab('history')}
                              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-[var(--fbst-primary)] text-white shadow' : 'text-slate-400 hover:text-white'}`}
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
              <AddDropTab players={players} onClaim={handleClaim} />
          )}

          {activeTab === 'waivers' && (
              <div className="max-w-xl mx-auto">
                  <h3 className="text-xl font-semibold mb-4 text-center">Current Waiver Priority</h3>
                  <div className="bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden">
                      {sortedWaiverOrder.map((t, idx) => (
                          <div key={t.id} className="flex items-center justify-between p-4 border-b border-slate-800 last:border-0 hover:bg-slate-800/40">
                               <div className="flex items-center gap-4">
                                  <span className="text-2xl font-bold text-slate-500 w-8">{idx + 1}</span>
                                  <div>
                                      <div className="font-bold text-white">{t.name}</div>
                                      <div className="text-xs text-slate-500">{t.owner || 'No Owner'}</div>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <div className="text-xs font-mono text-slate-400">
                                      Rank: {t.rank === 999 ? 'N/A' : t.rank}
                                  </div>
                                  <div className="text-[10px] text-slate-600">
                                      Points: {t.points}
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
                  <p className="text-center text-xs text-slate-500 mt-4">
                      Priority is determined by reverse standings. Claims process nightly.
                  </p>
              </div>
          )}

          {activeTab === 'history' && (
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-slate-900 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 text-left border-b border-slate-700 font-medium text-slate-400">Date</th>
                      <th className="px-4 py-3 text-left border-b border-slate-700 font-medium text-slate-400">Team</th>
                      <th className="px-4 py-3 text-left border-b border-slate-700 font-medium text-slate-400">Player</th>
                      <th className="px-4 py-3 text-left border-b border-slate-700 font-medium text-slate-400">Transaction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-2 whitespace-nowrap text-slate-300">
                          {tx.effDate ? new Date(tx.effDate).toLocaleDateString() : tx.effDateRaw}
                        </td>
                        <td className="px-4 py-2 text-slate-300 font-medium">
                          {tx.team?.name || tx.ogbaTeamName}
                        </td>
                        <td className="px-4 py-2 text-slate-300">
                          {tx.player?.name || tx.playerAliasRaw}
                        </td>
                        <td className="px-4 py-2 text-slate-400 italic">
                          {tx.transactionRaw}
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                          No transactions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
          )}
      </div>
    </div>
  );
}
