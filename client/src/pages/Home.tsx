
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
      <div className="px-10 py-8 text-center text-slate-100">
        <h1 className="text-3xl font-semibold">Welcome to FBST</h1>
        <p className="mt-4 text-slate-400">Please <Link to="/login" className="text-sky-400 hover:underline">log in</Link> to view your team.</p>
      </div>
    );
  }

  return (
    <div className="px-10 py-8 text-slate-100">
      <div className="mb-6">
        <PageHeader 
          title="Home" 
          subtitle={<span>Welcome back, <span className="text-slate-900 dark:text-white font-medium">{user.name || user.email}</span>.</span>}
        />
      </div>

      {loading ? (
          <div className="text-slate-400">Loading your team...</div>
      ) : !myTeam ? (
          <div className="rounded-xl bg-white/5 p-6 text-center text-slate-400">
             You are not associated with a team in the active league.
             <div className="mt-4">
               <Link to="/leagues" className="text-sky-400 hover:underline">Browse Leagues</Link>
             </div>
          </div>
      ) : (
          <div className="space-y-8">
             <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
                 <div className="mb-4 flex items-center justify-between">
                     <div>
                        <h2 className="text-2xl font-bold" style={{ color: 'var(--fbst-text-heading)' }}>{myTeam.name}</h2>
                        <div className="text-sm text-slate-400">Team Code: {myTeam.code || '—'}</div>
                     </div>
                     <div className="text-right">
                       <Link to="/players" className="text-sm text-sky-400 hover:underline">Add Players (Auction)</Link>
                     </div>
                 </div>

                 {/* Hitters */}
                 <h3 className="text-lg font-semibold text-white/80 mb-3 border-b border-white/10 pb-2">Hitters (Season Stats)</h3>
                 <div className="overflow-x-auto">
                 <Table className="w-full">
                    <THead>
                        <Tr className="text-xs text-white/60">
                            <Th align="left">Pos</Th>
                            <Th align="left">Player</Th>
                            <Th align="center">AB</Th>
                            <Th align="center">H</Th>
                            <Th align="center">HR</Th>
                            <Th align="center">RBI</Th>
                            <Th align="center">SB</Th>
                            <Th align="center">AVG</Th>
                        </Tr>
                    </THead>
                    <tbody>
                        {hitters.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-xs text-white/40">No hitters on roster</td></tr>}
                        {hitters.map(r => {
                            const s = r.stat || {};
                            return (
                                <Tr key={r.id} className="border-t border-white/5">
                                    <Td className="text-white/60 font-mono text-xs">{r.player.posPrimary}</Td>
                                    <Td className="font-medium text-white">{r.player.name}</Td>
                                    <Td align="center" className="tabular-nums">{num(s.AB)}</Td>
                                    <Td align="center" className="tabular-nums">{num(s.H)}</Td>
                                    <Td align="center" className="tabular-nums">{num(s.HR)}</Td>
                                    <Td align="center" className="tabular-nums">{num(s.RBI)}</Td>
                                    <Td align="center" className="tabular-nums">{num(s.SB)}</Td>
                                    <Td align="center" className="tabular-nums">{formatAvg(s.AVG || 0)}</Td>
                                </Tr>
                            );
                        })}
                    </tbody>
                 </Table>
                 </div>

                 {/* Pitchers */}
                 <h3 className="text-lg font-semibold text-white/80 mb-3 mt-8 border-b border-white/10 pb-2">Pitchers (Season Stats)</h3>
                 <div className="overflow-x-auto">
                 <Table className="w-full">
                    <THead>
                        <Tr className="text-xs text-white/60">
                            <Th align="left">Pos</Th>
                            <Th align="left">Player</Th>
                            <Th align="center">W</Th>
                            <Th align="center">SV</Th>
                            <Th align="center">K</Th>
                            <Th align="center">ERA</Th>
                            <Th align="center">WHIP</Th>
                        </Tr>
                    </THead>
                    <tbody>
                        {pitchers.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-xs text-white/40">No pitchers on roster</td></tr>}
                        {pitchers.map(r => {
                            const s = r.stat || {};
                            return (
                                <Tr key={r.id} className="border-t border-white/5">
                                    <Td className="text-white/60 font-mono text-xs">{r.player.posPrimary}</Td>
                                    <Td className="font-medium text-white">{r.player.name}</Td>
                                    <Td align="center" className="tabular-nums">{num(s.W)}</Td>
                                    <Td align="center" className="tabular-nums">{num(s.SV)}</Td>
                                    <Td align="center" className="tabular-nums">{num(s.K)}</Td>
                                    <Td align="center" className="tabular-nums">{s.ERA?.toFixed(2) || '—'}</Td>
                                    <Td align="center" className="tabular-nums">{s.WHIP?.toFixed(2) || '—'}</Td>
                                </Tr>
                            );
                        })}
                    </tbody>
                 </Table>
                 </div>
             </div>
          </div>
      )}
    </div>
  );
}
