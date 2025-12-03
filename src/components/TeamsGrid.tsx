import { useEffect, useState } from 'react';

export type Team = {
  id: string;
  leagueId: number;
  name: string;
  ownerName: string | null;
  season: number | null;
  points: number | null;
  wins: number | null;
  losses: number | null;
  ties: number | null;
  standingsRank: number | null;
};

type TeamsGridProps = {
  onTeamClick?: (team: Team) => void;
};

export function TeamsGrid({ onTeamClick }: TeamsGridProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTeams() {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:4000/api/teams');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data: Team[] = await res.json();
        setTeams(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load teams');
      } finally {
        setLoading(false);
      }
    }

    loadTeams();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl py-8 px-4 text-slate-400">
        Loading teams…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl py-8 px-4 text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto max-w-5xl py-8 px-4">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="mt-1 text-sm text-slate-400">
            OGBA 2025 · League ID 1
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <article
              key={team.id}
              onClick={() => onTeamClick?.(team)}
              className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm transition hover:border-sky-500/70 hover:bg-slate-900"
            >
              <h2 className="text-lg font-semibold tracking-tight">
                {team.name}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Owner:{' '}
                <span className="font-medium text-slate-100">
                  {team.ownerName ?? '—'}
                </span>
              </p>

              <dl className="mt-3 space-y-1 text-xs text-slate-400">
                <div className="flex justify-between">
                  <dt>League</dt>
                  <dd className="text-slate-200">{team.leagueId}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Season</dt>
                  <dd className="text-slate-200">{team.season ?? '—'}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
