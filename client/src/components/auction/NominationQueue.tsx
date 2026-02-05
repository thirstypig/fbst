
import React from 'react';
import { Users } from 'lucide-react';

interface Team {
  id: number;
  name: string;
  code: string;
}

interface NominationQueueProps {
  teams: Team[];
  queue: number[];
  queueIndex: number;
  myTeamId?: number;
}

export default function NominationQueue({ teams, queue, queueIndex, myTeamId }: NominationQueueProps) {
  // Determine the rotation starting from current index
  // Handle wrap-around logic for display
  const countToShow = 5;
  let rotationIds: number[] = [];
  
  if (teams.length > 0 && queue.length > 0) {
      const doubleQueue = [...queue, ...queue]; 
      // We rely on queueIndex being within bounds 0..length-1
      // If server does modulo correctly, queueIndex matches
      rotationIds = doubleQueue.slice(queueIndex, queueIndex + countToShow);
  }
  
  const rotationTeams = rotationIds.map((qid, index) => {
     const t = teams.find(team => team.id === qid);
     return t ? { ...t, uniqueKey: `${qid}-${index}` } : null;
  }).filter(Boolean) as (Team & { uniqueKey: string })[];

  if (rotationTeams.length === 0) return null;

  return (
    <div className="w-full bg-[var(--fbst-surface-elevated)] rounded-xl border border-[var(--fbst-table-border)] p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--fbst-table-border)] text-xs font-bold text-[var(--fbst-text-muted)] uppercase tracking-wider">
          <Users size={14} /> 
          <span>Up Next to Nominate</span>
      </div>
      <div className="space-y-2">
          {rotationTeams.map((team, idx) => (
              <div key={team.uniqueKey} className={`flex items-center justify-between p-2 rounded-lg ${team.id === myTeamId ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-[var(--fbst-surface-primary)]'}`}>
                  <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${idx === 0 ? 'bg-[var(--fbst-accent-success)] text-white' : 'bg-[var(--fbst-table-border)] text-[var(--fbst-text-muted)]'}`}>
                          {idx + 1}
                      </span>
                      <span className={`text-sm font-semibold ${idx === 0 ? 'text-[var(--fbst-text-primary)]' : 'text-[var(--fbst-text-muted)]'}`}>
                          {team.name} {team.id === myTeamId && '(You)'}
                      </span>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
}
