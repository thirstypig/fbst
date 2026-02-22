
import React, { useEffect, useState } from 'react';
import { getTeamDetails } from '../../../api';
import { getPrimaryPosition } from '../../../lib/baseballUtils';

interface TeamRosterViewProps {
  teamId: number;
  teamName?: string;
}

export default function TeamRosterView({ teamId, teamName }: TeamRosterViewProps) {
  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState<any[]>([]);
  const [budget, setBudget] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function load() {
        setLoading(true);
        try {
           const res = await getTeamDetails(teamId);
           if (mounted) {
               setRoster(res.currentRoster || []);
               setBudget(res.team?.budget || 0);
           }
        } catch(e) {
            console.error(e);
        } finally {
            if (mounted) setLoading(false);
        }
    }
    load();
    return () => { mounted = false; };
  }, [teamId]);

  if (loading) return <div className="p-4 text-center text-xs text-gray-500">Loading roster...</div>;

  // Group by position helper related (or just simple sort)
  const sortedRoster = [...roster].sort((a, b) => {
      // Sort by price desc
      return (b.price || 0) - (a.price || 0);
  });

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 flex flex-col h-[400px]">
        <div className="p-3 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
            <div className="font-bold text-sm text-gray-200">{teamName || 'Team Roster'}</div>
            <div className="text-xs text-green-400 font-mono">${budget} Left</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
             {sortedRoster.length === 0 && (
                 <div className="text-center text-gray-500 text-xs py-10">Empty Roster</div>
             )}
             {sortedRoster.map(p => (
                 <div key={p.id} className="flex justify-between items-center text-xs p-1.5 hover:bg-gray-700/50 rounded">
                     <div className="flex gap-2">
                         <span className="w-[4rem] text-gray-500 font-mono text-right">{getPrimaryPosition(p.posPrimary || p.positions)}</span>
                         <span className="font-medium text-gray-300">{p.name}</span>
                     </div>
                     <div className="font-mono text-amber-500">${p.price}</div>
                 </div>
             ))}
        </div>
        <div className="p-2 bg-gray-900 text-xs text-center text-gray-500 border-t border-gray-700">
            {roster.length} Players
        </div>
    </div>
  );
}
