import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface RosterEntry {
  id: number;
  year: number;
  teamCode: string;
  playerName: string;
  position: string;
  mlbTeam: string;
  acquisitionCost: number;
}

interface RosterManagementFormProps {
  year: number;
  teamCodes: string[];
}

export default function RosterManagementForm({ year, teamCodes }: RosterManagementFormProps) {
  const { theme } = useTheme();
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>(teamCodes[0] || '');
  const [formData, setFormData] = useState({
    playerName: '',
    position: '',
    mlbTeam: '',
    acquisitionCost: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadRoster = async () => {
    if (!selectedTeam) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/roster/${selectedTeam}?year=${year}`);
      const data = await res.json();
      setRoster(data);
    } catch (e) {
      console.error('Failed to load roster:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoster();
  }, [selectedTeam, year]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.playerName || !formData.position) {
      setError('Player name and position are required');
      return;
    }

    try {
      const res = await fetch('/api/roster/add-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          teamCode: selectedTeam,
          ...formData,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add player');
      }

      setSuccess(`Added ${formData.playerName} to ${selectedTeam}`);
      setFormData({ playerName: '', position: '', mlbTeam: '', acquisitionCost: 0 });
      loadRoster();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handleDelete = async (id: number, playerName: string) => {
    if (!window.confirm(`Delete ${playerName} from roster?`)) return;

    try {
      const res = await fetch(`/api/roster/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setSuccess(`Removed ${playerName}`);
      loadRoster();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const inputClass = `w-full px-3 py-2 rounded border ${
    theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300'
  }`;

  const buttonClass = `px-4 py-2 rounded font-medium ${
    theme === 'dark' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
  }`;

  return (
    <div className="space-y-6">
      {/* Team Selector */}
      <div className="flex items-center gap-4">
        <label className="font-medium">Team:</label>
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className={inputClass}
          style={{ maxWidth: '200px' }}
        >
          {teamCodes.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
          Year: {year}
        </span>
      </div>

      {/* Add Player Form */}
      <form onSubmit={handleSubmit} className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-50'}`}>
        <h3 className="font-semibold mb-4">Add Player</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm mb-1">Player Name *</label>
            <input
              type="text"
              value={formData.playerName}
              onChange={(e) => setFormData({ ...formData, playerName: e.target.value })}
              className={inputClass}
              placeholder="e.g., Shohei Ohtani"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Position *</label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className={inputClass}
              placeholder="e.g., DH, OF, SP"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">MLB Team</label>
            <input
              type="text"
              value={formData.mlbTeam}
              onChange={(e) => setFormData({ ...formData, mlbTeam: e.target.value })}
              className={inputClass}
              placeholder="e.g., LAD"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Acquisition Cost ($)</label>
            <input
              type="number"
              value={formData.acquisitionCost}
              onChange={(e) => setFormData({ ...formData, acquisitionCost: parseFloat(e.target.value) || 0 })}
              className={inputClass}
              min="0"
            />
          </div>
        </div>
        <div className="mt-4">
          <button type="submit" className={buttonClass}>
            Add Player
          </button>
        </div>
      </form>

      {/* Messages */}
      {error && (
        <div className="p-3 rounded bg-red-100 text-red-700 border border-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded bg-green-100 text-green-700 border border-green-300">
          {success}
        </div>
      )}

      {/* Roster Table */}
      <div>
        <h3 className="font-semibold mb-2">
          Current Roster ({roster.length} players)
        </h3>
        {loading ? (
          <p className="text-sm">Loading...</p>
        ) : roster.length === 0 ? (
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
            No players on roster for {selectedTeam} in {year}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
              <thead>
                <tr className={theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'}>
                  <th className="px-3 py-2 text-left">Player</th>
                  <th className="px-3 py-2 text-left">Position</th>
                  <th className="px-3 py-2 text-left">MLB Team</th>
                  <th className="px-3 py-2 text-right">Cost</th>
                  <th className="px-3 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className={theme === 'dark' ? 'divide-y divide-slate-600' : 'divide-y divide-gray-200'}>
                {roster.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-3 py-2">{entry.playerName}</td>
                    <td className="px-3 py-2">{entry.position}</td>
                    <td className="px-3 py-2">{entry.mlbTeam || '-'}</td>
                    <td className="px-3 py-2 text-right">${entry.acquisitionCost}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleDelete(entry.id, entry.playerName)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
