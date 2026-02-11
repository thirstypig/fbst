
import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { getPlayerSeasonStats, type PlayerSeasonStat } from "../api";
import { TableCard, Table, THead, Tr, Th, Td } from "../components/ui/TableCard";
import PageHeader from "../components/ui/PageHeader";
import { formatAvg } from "../lib/playerDisplay";

function num(v: string | number | null | undefined): number {
  return Number(v) || 0;
}

interface Player {
  mlbId: number;
  name: string;
  posPrimary: string;
}

interface RosterEntry {
  id: number;
  teamId: number;
  player: Player;
  stat?: PlayerSeasonStat;
}

interface Team {
  id: number;
  name: string;
  code?: string;
  ownerUserId?: number;
  ownerships?: Array<{ userId: number }>;
}

export default function Home() {
  const { user, loading: authLoading } = useAuth();

  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [stats, setStats] = useState<PlayerSeasonStat[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    let mounted = true;
    (async () => {
       try {
         setLoading(true);
         
         const leaguesRes = await fetch('/api/public/leagues').then(r => r.json());
         const lid = leaguesRes.leagues?.[0]?.id;
         if (!lid) return;

         const leagueRes = await fetch(`/api/leagues/${lid}`).then(r => r.json());
         const teams = leagueRes.league?.teams || [];
         const uid = Number(user.id);
         const mine = teams.find((t: { ownerUserId?: number | null; ownerships?: Array<{ userId: number }> }) => 
           t.ownerUserId === uid || (t.ownerships || []).some((o) => o.userId === uid)
         );
         
         if (mine && mounted) {
            setMyTeam(mine);
            const rostersRes = await fetch(`/api/leagues/${lid}/rosters`).then(r => r.json());
            const myRoster = (rostersRes.rosters || []).filter((r: { teamId: number }) => r.teamId === mine.id);
            if (mounted) setRoster(myRoster);

            const statsData = await getPlayerSeasonStats(); 
            if (mounted) setStats(statsData || []);
         }

       } catch (err) {
         console.error("Home load error", err);
       } finally {
         if (mounted) setLoading(false);
       }
    })();
    return () => { mounted = false; };
  }, [user]);

   const rosterWithStats = useMemo(() => {
       return roster.map(r => {
           const stat = stats.find(s => Number(s.mlb_id) === r.player.mlbId); 
           return { ...r, stat };
       });
   }, [roster, stats]);

  const hitters = rosterWithStats.filter(r => r.player.posPrimary !== 'P' && r.player.posPrimary !== 'RP' && r.player.posPrimary !== 'SP');
  const pitchers = rosterWithStats.filter(r => r.player.posPrimary === 'P' || r.player.posPrimary === 'RP' || r.player.posPrimary === 'SP');

  if (!user && !authLoading) {
    return null; // Should be handled by App.tsx routing Landing
  }

  if (!user) return null; // Fallback during loading

  return (
    <div className="relative min-h-full p-6 scrollbar-hide">
      <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
        <PageHeader 
          title="Tactical Dashboard" 
          subtitle={<span>Welcome, Strategic Agent <span className="text-[var(--lg-accent)] font-black uppercase tracking-tighter">{user.name || user.email}</span>. Personnel synchronization complete.</span>}
        />
      </div>

      {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-[var(--lg-text-muted)] animate-pulse">
            <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em]">Synchronizing Assets...</div>
          </div>
      ) : !myTeam ? (
          <div className="lg-card p-16 text-center max-w-2xl mx-auto shadow-2xl animate-in fade-in zoom-in-95 duration-700">
             <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-8 border border-white/10 text-4xl">🏳️</div>
             <h2 className="text-3xl font-black tracking-tighter text-[var(--lg-text-heading)] mb-4">Unassigned Identity</h2>
             <p className="text-sm font-medium text-[var(--lg-text-secondary)] mb-10 leading-relaxed opacity-60">You are currently in neutral territory. Link to an active franchise to begin tactical operations.</p>
             <Link to="/leagues" className="lg-button lg-button-primary px-10 py-3 shadow-2xl shadow-blue-500/20">
               Browse Sector Leagues
             </Link>
          </div>
      ) : (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
             <div className="lg-card p-0 overflow-hidden border-b-8 border-[var(--lg-accent)] shadow-2xl bg-white/[0.01]">
                 <div className="p-10 flex flex-col md:flex-row md:items-center justify-between gap-10 bg-white/5">
                     <div>
                        <div className="text-[10px] uppercase tracking-[0.3em] font-black text-[var(--lg-text-muted)] mb-3 opacity-60">Operations Unit</div>
                        <h2 className="text-5xl font-black tracking-tighter text-[var(--lg-text-heading)] leading-none">{myTeam.name}</h2>
                        <div className="mt-4 flex items-center gap-3">
                           <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-md">Status: Active</span>
                           <span className="text-[10px] font-mono text-[var(--lg-text-muted)] opacity-40">REF_ID: {myTeam.code || myTeam.id}</span>
                        </div>
                     </div>
                     <div className="flex items-center">
                       <Link to="/players" className="lg-button lg-button-primary px-8 py-3 shadow-xl shadow-blue-500/20 group">
                         Personnel Market <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                       </Link>
                     </div>
                 </div>

                 <div className="p-10 grid grid-cols-1 gap-14">
                   {/* Hitters */}
                   <div>
                     <div className="flex items-center gap-4 mb-8">
                        <div className="w-1.5 h-6 bg-blue-500 rounded-full shadow-lg shadow-blue-500/20"></div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter text-[var(--lg-text-heading)]">Hitting Corps <span className="text-[var(--lg-text-muted)] font-medium text-xs ml-3 uppercase tracking-widest opacity-40">Asset Distribution</span></h3>
                     </div>
                     <div className="lg-card p-0 overflow-hidden bg-black/20">
                     <TableCard>
                     <Table>
                        <THead>
                            <tr className="bg-white/5 border-b border-white/[0.05] text-[10px] font-black uppercase tracking-[0.2em] text-[var(--lg-text-muted)]">
                                <Th align="left">Role</Th>
                                <Th align="left">Asset Identity</Th>
                                <Th align="center">R</Th>
                                <Th align="center">HR</Th>
                                <Th align="center">RBI</Th>
                                <Th align="center">SB</Th>
                                <Th align="center">AVG</Th>
                                <Th align="center">AB</Th>
                            </tr>
                        </THead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {hitters.length === 0 && <tr className="bg-transparent"><td colSpan={8} className="p-16 text-center text-xs font-black text-[var(--lg-text-muted)] uppercase tracking-[0.3em] opacity-30">No active assets in hitting corps</td></tr>}
                            {hitters.map(r => {
                                const s = (r.stat || {}) as PlayerSeasonStat;
                                return (
                                    <Tr key={r.id} className="hover:bg-white/[0.02]">
                                        <Td className="py-4">
                                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded-md">
                                            {r.player.posPrimary}
                                          </span>
                                        </Td>
                                        <Td className="font-black text-[var(--lg-text-primary)] text-sm tracking-tight">{r.player.name}</Td>
                                        <Td align="center" className="tabular-nums font-bold">{num(s.R)}</Td>
                                        <Td align="center" className="tabular-nums font-bold text-blue-500">{num(s.HR)}</Td>
                                        <Td align="center" className="tabular-nums font-bold">{num(s.RBI)}</Td>
                                        <Td align="center" className="tabular-nums font-bold text-emerald-500">{num(s.SB)}</Td>
                                        <Td align="center" className="tabular-nums font-black text-[var(--lg-accent)] text-base tracking-tighter">{formatAvg(s.AVG || 0)}</Td>
                                        <Td align="center" className="tabular-nums font-medium text-[var(--lg-text-muted)] opacity-40">{num(s.AB)}</Td>
                                    </Tr>
                                );
                            })}
                        </tbody>
                     </Table>
                     </TableCard>
                     </div>
                   </div>

                   {/* Pitchers */}
                   <div>
                     <div className="flex items-center gap-4 mb-8">
                        <div className="w-1.5 h-6 bg-purple-500 rounded-full shadow-lg shadow-purple-500/20"></div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter text-[var(--lg-text-heading)]">Pitching Rotation <span className="text-[var(--lg-text-muted)] font-medium text-xs ml-3 uppercase tracking-widest opacity-40">Kinematic Matrix</span></h3>
                     </div>
                     <div className="lg-card p-0 overflow-hidden bg-black/20">
                     <TableCard>
                     <Table>
                        <THead>
                            <tr className="bg-white/5 border-b border-white/[0.05] text-[10px] font-black uppercase tracking-[0.2em] text-[var(--lg-text-muted)]">
                                <Th align="left">Role</Th>
                                <Th align="left">Asset Identity</Th>
                                <Th align="center">W</Th>
                                <Th align="center">SV</Th>
                                <Th align="center">K</Th>
                                <Th align="center">ERA</Th>
                                <Th align="center">WHIP</Th>
                            </tr>
                        </THead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {pitchers.length === 0 && <tr className="bg-transparent"><td colSpan={7} className="p-16 text-center text-xs font-black text-[var(--lg-text-muted)] uppercase tracking-[0.3em] opacity-30">No active assets in rotation</td></tr>}
                            {pitchers.map(r => {
                                const s = (r.stat || {}) as PlayerSeasonStat;
                                return (
                                    <Tr key={r.id} className="hover:bg-white/[0.02]">
                                        <Td className="py-4">
                                          <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 bg-purple-400/10 border border-purple-400/20 px-2 py-0.5 rounded-md">
                                            {r.player.posPrimary}
                                          </span>
                                        </Td>
                                        <Td className="font-black text-[var(--lg-text-primary)] text-sm tracking-tight">{r.player.name}</Td>
                                        <Td align="center" className="tabular-nums font-bold text-emerald-500">{num(s.W)}</Td>
                                        <Td align="center" className="tabular-nums font-bold text-amber-500">{num(s.SV)}</Td>
                                        <Td align="center" className="tabular-nums font-bold text-blue-500">{num(s.K)}</Td>
                                        <Td align="center" className="tabular-nums font-black text-blue-400 text-base tracking-tighter">{s.ERA !== undefined ? Number(s.ERA).toFixed(2) : '—'}</Td>
                                        <Td align="center" className="tabular-nums font-black text-purple-400 text-base tracking-tighter">{s.WHIP !== undefined ? Number(s.WHIP).toFixed(2) : '—'}</Td>
                                    </Tr>
                                );
                            })}
                        </tbody>
                     </Table>
                     </TableCard>
                     </div>
                   </div>
                 </div>
              </div>
          </div>
      )}
      <BuildInfoPanel />
    </div>
  );
}

function BuildInfoPanel() {
  return (
    <div className="fixed bottom-4 right-6 pointer-events-none z-50">
      <div className="text-[9px] font-black uppercase tracking-[0.5em] text-[var(--lg-text-muted)] opacity-20 select-none">
        PROTOCOL_V2.5 // {__COMMIT_HASH__}
      </div>
    </div>
  );
}
