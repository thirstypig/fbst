
import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { getPlayerSeasonStats, type PlayerSeasonStat } from "../api";
import { TableCard, Table, THead, Tr, Th, Td } from "../components/ui/TableCard";
import PageHeader from "../components/ui/PageHeader";
import { formatAvg } from "../lib/playerDisplay";

function num(v: any) {
  return Number(v) || 0;
}

export default function Home() {
  const { user } = useAuth();
  const [activeLeagueId, setActiveLeagueId] = useState<number | null>(null);
  const [myTeam, setMyTeam] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [stats, setStats] = useState<PlayerSeasonStat[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    let mounted = true;
    (async () => {
       try {
         setLoading(true);
         
         // 1. Get active league
         const leaguesRes = await fetch('/api/public/leagues').then(r => r.json());
         const lid = leaguesRes.leagues?.[0]?.id;
         if (!lid) return;
         if (mounted) setActiveLeagueId(lid);

         // 2. Get my team (check both legacy ownerUserId and new ownerships)
         const leagueRes = await fetch(`/api/leagues/${lid}`).then(r => r.json());
         const teams = leagueRes.league?.teams || [];
         const uid = Number(user.id);
         const mine = teams.find((t: { ownerUserId?: number | null; ownerships?: Array<{ userId: number }> }) => 
           t.ownerUserId === uid || (t.ownerships || []).some((o) => o.userId === uid)
         );
         
         if (mine && mounted) {
            setMyTeam(mine);
            
            // 3. Get roster
            const rostersRes = await fetch(`/api/leagues/${lid}/rosters`).then(r => r.json());
            const myRoster = (rostersRes.rosters || []).filter((r: any) => r.teamId === mine.id);
            if (mounted) setRoster(myRoster);

            // 4. Get stats
            const statsData = await getPlayerSeasonStats(); // YTD Season Stats
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

  // Join roster with stats
  const rosterWithStats = useMemo(() => {
      return roster.map(r => {
          const stat = stats.find(s => s.mlb_id == r.player.mlbId); // loose equality for string/num
          return { ...r, stat };
      });
  }, [roster, stats]);

  const hitters = rosterWithStats.filter(r => r.player.posPrimary !== 'P' && r.player.posPrimary !== 'RP' && r.player.posPrimary !== 'SP');
  const pitchers = rosterWithStats.filter(r => r.player.posPrimary === 'P' || r.player.posPrimary === 'RP' || r.player.posPrimary === 'SP');

  if (!user) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="lg-welcome-card max-w-lg">
            <h1 className="lg-welcome-title">Welcome to FBST</h1>
            <p className="lg-welcome-subtitle">
              Advanced auction tools and deep historical analytics for your fantasy baseball league.
            </p>
            <Link 
              to="/login" 
              className="lg-button lg-button-primary"
            >
              Sign In to Continue
            </Link>
          </div>
        </div>
        <BuildInfoPanel />
      </>
    );
  }

  return (
    <div className="relative min-h-full">
      <div className="mb-10">
        <PageHeader 
          title="Season Dashboard" 
          subtitle={<span>Welcome back, <span className="text-[var(--fbst-text-heading)] font-black uppercase tracking-tighter">{user.name || user.email}</span>. Your roster is synchronized.</span>}
        />
      </div>

      {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm font-bold uppercase tracking-widest text-[var(--fbst-text-muted)] animate-pulse">Synchronizing Data...</div>
          </div>
      ) : !myTeam ? (
          <div className="liquid-glass rounded-3xl p-12 text-center">
             <div className="text-xl font-bold text-[var(--fbst-text-primary)] mb-2">Neutral Territory</div>
             <p className="text-sm text-[var(--fbst-text-secondary)] mb-6">You are not associated with a team in the active league.</p>
             <Link to="/leagues" className="px-6 py-3 text-sm font-bold text-white bg-[var(--fbst-accent)] rounded-2xl shadow-lg shadow-red-500/30 hover:scale-105 active:scale-95 transition-all">
               Browse Leagues
             </Link>
          </div>
      ) : (
          <div className="space-y-10">
             <div className="liquid-glass rounded-3xl p-8 border-b-8 border-[var(--fbst-accent)]">
                 <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                     <div>
                        <div className="text-[10px] uppercase tracking-widest font-black text-[var(--fbst-text-muted)] mb-1">Active Franchise</div>
                        <h2 className="text-4xl font-black tracking-tighter text-[var(--fbst-text-heading)]">{myTeam.name}</h2>
                        <div className="text-xs font-mono text-[var(--fbst-text-secondary)] mt-1 opacity-60">ID: {myTeam.code || myTeam.id}</div>
                     </div>
                     <div className="flex items-center">
                       <Link to="/players" className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-white bg-[var(--fbst-accent)] rounded-xl hover:scale-105 transition-all">
                         Market Access (Auction)
                       </Link>
                     </div>
                 </div>

                 <div className="grid grid-cols-1 gap-10">
                   {/* Hitters */}
                   <div>
                     <div className="flex items-center gap-3 mb-4">
                       <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
                       <h3 className="text-lg font-black uppercase tracking-tight text-[var(--fbst-text-primary)]">Hitting Corps <span className="text-[var(--fbst-text-muted)] font-medium text-sm ml-2">YTD Distribution</span></h3>
                     </div>
                     <TableCard>
                     <Table>
                        <THead>
                            <Tr>
                                <Th align="left">Pos</Th>
                                <Th align="left">Asset</Th>
                                <Th align="center">AB</Th>
                                <Th align="center">H</Th>
                                <Th align="center">HR</Th>
                                <Th align="center">RBI</Th>
                                <Th align="center">SB</Th>
                                <Th align="center">AVG</Th>
                            </Tr>
                        </THead>
                        <tbody>
                            {hitters.length === 0 && <tr><td colSpan={8} className="p-10 text-center text-xs font-bold text-[var(--fbst-text-muted)] uppercase tracking-widest">No active hitter assets</td></tr>}
                            {hitters.map(r => {
                                const s = r.stat || {};
                                return (
                                    <Tr key={r.id}>
                                        <Td className="font-mono text-[10px] font-bold text-[var(--fbst-text-muted)]">{r.player.posPrimary}</Td>
                                        <Td className="font-bold">{r.player.name}</Td>
                                        <Td align="center" className="tabular-nums font-mono opacity-60">{num(s.AB)}</Td>
                                        <Td align="center" className="tabular-nums font-mono opacity-60">{num(s.H)}</Td>
                                        <Td align="center" className="tabular-nums font-bold text-blue-500">{num(s.HR)}</Td>
                                        <Td align="center" className="tabular-nums font-bold">{num(s.RBI)}</Td>
                                        <Td align="center" className="tabular-nums font-bold text-emerald-500">{num(s.SB)}</Td>
                                        <Td align="center" className="tabular-nums font-black">{formatAvg(s.AVG || 0)}</Td>
                                    </Tr>
                                );
                            })}
                        </tbody>
                     </Table>
                     </TableCard>
                   </div>

                   {/* Pitchers */}
                   <div>
                     <div className="flex items-center gap-3 mb-4">
                       <span className="w-2 h-8 bg-emerald-500 rounded-full"></span>
                       <h3 className="text-lg font-black uppercase tracking-tight text-[var(--fbst-text-primary)]">Pitching Rotation <span className="text-[var(--fbst-text-muted)] font-medium text-sm ml-2">Control Matrix</span></h3>
                     </div>
                     <TableCard>
                     <Table>
                        <THead>
                            <Tr>
                                <Th align="left">Pos</Th>
                                <Th align="left">Asset</Th>
                                <Th align="center">W</Th>
                                <Th align="center">SV</Th>
                                <Th align="center">K</Th>
                                <Th align="center">ERA</Th>
                                <Th align="center">WHIP</Th>
                            </Tr>
                        </THead>
                        <tbody>
                            {pitchers.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-xs font-bold text-[var(--fbst-text-muted)] uppercase tracking-widest">No active pitching assets</td></tr>}
                            {pitchers.map(r => {
                                const s = r.stat || {};
                                return (
                                    <Tr key={r.id}>
                                        <Td className="font-mono text-[10px] font-bold text-[var(--fbst-text-muted)]">{r.player.posPrimary}</Td>
                                        <Td className="font-bold">{r.player.name}</Td>
                                        <Td align="center" className="tabular-nums font-bold text-emerald-500">{num(s.W)}</Td>
                                        <Td align="center" className="tabular-nums font-bold text-amber-500">{num(s.SV)}</Td>
                                        <Td align="center" className="tabular-nums font-bold text-blue-500">{num(s.K)}</Td>
                                        <Td align="center" className="tabular-nums font-black">{s.ERA?.toFixed(2) || '—'}</Td>
                                        <Td align="center" className="tabular-nums font-black">{s.WHIP?.toFixed(2) || '—'}</Td>
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
      )}
      {/* Authenticated content ends */}
      <BuildInfoPanel />
    </div>
  );
}

function BuildInfoPanel() {
  return (
    <div className="fixed bottom-4 right-6 pointer-events-none z-50">
      <div className="text-[10px] font-mono font-medium text-[var(--fbst-text-muted)] opacity-30 select-none">
        {__COMMIT_HASH__}
      </div>
    </div>
  );
}
