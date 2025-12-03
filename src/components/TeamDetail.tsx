// src/components/TeamDetail.tsx
import React, { useEffect, useState } from 'react';
import type { Team } from './TeamsGrid';

type Player = {
  id: string;
  name: string;
  mlbTeam: string | null;
  primaryPositions: string[] | null;
  eligiblePositions: string[] | null;
};

type RosterSlot = {
  id: string;
  slot: string;
  isHitter: boolean;
  isPitcher: boolean;
  salary: number | null;
  contractType: string | null;
  contractYear: number | null;
  player: Player | null;
};

type TeamDetailApiResponse =
  | Team
  | {
      team: Team;
      roster?: RosterSlot[];
    };

type TeamDetailProps = {
  teamId: string;
  onBack: () => void;
  /** When true, show commissioner-only controls (add roster slots). */
  canEditRoster?: boolean;
};

export function TeamDetail({
  teamId,
  onBack,
  canEditRoster = false,
}: TeamDetailProps) {
  const [team, setTeam] = useState<Team | null>(null);
  const [roster, setRoster] = useState<RosterSlot[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'roster'>('roster');

  // form state for adding a slot (commissioner only)
  const [newPlayerId, setNewPlayerId] = useState('');
  const [newSlot, setNewSlot] = useState('');
  const [newType, setNewType] = useState<'hitter' | 'pitcher'>('hitter');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [teamRes, playersRes] = await Promise.all([
          fetch(`http://localhost:4000/api/teams/${teamId}`),
          // we still load players; they're only *used* when canEditRoster is true
          fetch('http://localhost:4000/api/players'),
        ]);

        if (!teamRes.ok) {
          throw new Error(`Team HTTP ${teamRes.status}`);
        }
        if (!playersRes.ok) {
          throw new Error(`Players HTTP ${playersRes.status}`);
        }

        const teamJson: TeamDetailApiResponse = await teamRes.json();
        const playersJson: Player[] = await playersRes.json();

        if ('team' in teamJson && teamJson.team) {
          setTeam(teamJson.team);
          setRoster(Array.isArray(teamJson.roster) ? teamJson.roster : []);
        } else {
          setTeam(teamJson as Team);
          setRoster([]);
        }

        setPlayers(playersJson);
      } catch (err) {
        console.error(err);
        setError('Failed to load team');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [teamId]);

  async function handleAddSlot(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!newPlayerId || !newSlot.trim()) {
      setFormError('Player and slot are required.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(
        `http://localhost:4000/api/teams/${teamId}/roster`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: newPlayerId,
            slot: newSlot.trim(),
            isHitter: newType === 'hitter',
            isPitcher: newType === 'pitcher',
            season: team?.season ?? 2025,
          }),
        },
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const created: RosterSlot = await res.json();
      setRoster((prev) => [...prev, created]);
      setNewSlot('');
    } catch (err) {
      console.error(err);
      setFormError('Failed to add roster slot.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <main className="mx-auto max-w-5xl py-8 px-4">
          <button
            onClick={onBack}
            className="mb-4 text-sm text-sky-400 hover:underline"
          >
            ← Back to teams
          </button>
          <p className="text-slate-400">Loading team…</p>
        </main>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <main className="mx-auto max-w-5xl py-8 px-4">
          <button
            onClick={onBack}
            className="mb-4 text-sm text-sky-400 hover:underline"
          >
            ← Back to teams
          </button>
          <p className="text-red-400">{error ?? 'Team not found'}</p>
        </main>
      </div>
    );
  }

  const safeRoster = roster ?? [];
  const hitters = safeRoster.filter((r) => r.isHitter);
  const pitchers = safeRoster.filter((r) => r.isPitcher);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto max-w-5xl py-8 px-4">
        <button
          onClick={onBack}
          className="mb-4 text-sm text-sky-400 hover:underline"
        >
          ← Back to teams
        </button>

        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
          <p className="mt-1 text-sm text-slate-400">
            Owner{' '}
            <span className="font-medium text-slate-100">
              {team.ownerName ?? '—'}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            League {team.leagueId} · Season {team.season ?? '—'}
          </p>
        </header>

        <div className="mb-4 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('roster')}
            className={`mr-4 pb-2 text-sm ${
              activeTab === 'roster'
                ? 'border-b-2 border-sky-500 text-sky-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Roster
          </button>
        </div>

        {activeTab === 'roster' && (
          <section className="space-y-8">
            {/* Commissioner-only form */}
            {canEditRoster && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <h2 className="mb-3 text-sm font-semibold text-slate-200">
                  Add roster slot (Commissioner)
                </h2>
                {players.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No players in the database yet. Add players first.
                  </p>
                ) : (
                  <form
                    onSubmit={handleAddSlot}
                    className="flex flex-wrap items-end gap-3 text-xs"
                  >
                    <div className="flex-1 min-w-[180px]">
                      <label className="mb-1 block text-slate-400">
                        Player
                      </label>
                      <select
                        value={newPlayerId}
                        onChange={(e) => setNewPlayerId(e.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
                      >
                        <option value="">Select player…</option>
                        {players.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                            {p.mlbTeam ? ` — ${p.mlbTeam}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-slate-400">Slot</label>
                      <input
                        value={newSlot}
                        onChange={(e) => setNewSlot(e.target.value)}
                        placeholder="C, 1B, OF1, SP1…"
                        className="w-28 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-slate-400">
                        Type
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setNewType('hitter')}
                          className={`rounded-md px-3 py-1 ${
                            newType === 'hitter'
                              ? 'bg-sky-600 text-white'
                              : 'bg-slate-800 text-slate-200'
                          }`}
                        >
                          Hitter
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewType('pitcher')}
                          className={`rounded-md px-3 py-1 ${
                            newType === 'pitcher'
                              ? 'bg-sky-600 text-white'
                              : 'bg-slate-800 text-slate-200'
                          }`}
                        >
                          Pitcher
                        </button>
                      </div>
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-md bg-sky-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-sky-400 disabled:opacity-50"
                      >
                        {saving ? 'Saving…' : 'Add'}
                      </button>
                    </div>

                    {formError && (
                      <div className="basis-full text-xs text-red-400">
                        {formError}
                      </div>
                    )}
                  </form>
                )}
              </div>
            )}

            {/* Hitters */}
            <div>
              <h2 className="mb-2 text-lg font-semibold">Hitters</h2>
              {hitters.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No hitters assigned yet.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                  <table className="min-w-full text-left text-xs text-slate-200">
                    <thead className="bg-slate-900/80 text-slate-400">
                      <tr>
                        <th className="px-3 py-2">Slot</th>
                        <th className="px-3 py-2">Player</th>
                        <th className="px-3 py-2">MLB Team</th>
                        <th className="px-3 py-2">Pos</th>
                        <th className="px-3 py-2">Salary</th>
                        <th className="px-3 py-2">Contract</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hitters.map((r) => (
                        <tr
                          key={r.id}
                          className="border-t border-slate-800/80 hover:bg-slate-800/60"
                        >
                          <td className="px-3 py-2 text-slate-300">
                            {r.slot}
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-medium">
                              {r.player?.name ?? '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-300">
                            {r.player?.mlbTeam ?? '—'}
                          </td>
                          <td className="px-3 py-2 text-slate-300">
                            {r.player?.primaryPositions?.join(', ') ?? '—'}
                          </td>
                          <td className="px-3 py-2">
                            {r.salary != null ? `$${r.salary}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-slate-300">
                            {r.contractType ?? '—'}
                            {r.contractYear ? ` Y${r.contractYear}` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pitchers */}
            <div>
              <h2 className="mb-2 text-lg font-semibold">Pitchers</h2>
              {pitchers.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No pitchers assigned yet.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                  <table className="min-w-full text-left text-xs text-slate-200">
                    <thead className="bg-slate-900/80 text-slate-400">
                      <tr>
                        <th className="px-3 py-2">Slot</th>
                        <th className="px-3 py-2">Player</th>
                        <th className="px-3 py-2">MLB Team</th>
                        <th className="px-3 py-2">Pos</th>
                        <th className="px-3 py-2">Salary</th>
                        <th className="px-3 py-2">Contract</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pitchers.map((r) => (
                        <tr
                          key={r.id}
                          className="border-t border-slate-800/80 hover:bg-slate-800/60"
                        >
                          <td className="px-3 py-2 text-slate-300">
                            {r.slot}
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-medium">
                              {r.player?.name ?? '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-300">
                            {r.player?.mlbTeam ?? '—'}
                          </td>
                          <td className="px-3 py-2 text-slate-300">
                            {r.player?.primaryPositions?.join(', ') ?? '—'}
                          </td>
                          <td className="px-3 py-2">
                            {r.salary != null ? `$${r.salary}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-slate-300">
                            {r.contractType ?? '—'}
                            {r.contractYear ? ` Y${r.contractYear}` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
