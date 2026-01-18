// client/src/components/EditPlayerNameModal.tsx
import React, { useState, useEffect } from 'react';
import { searchArchivePlayers, searchMLBPlayers, updateArchivePlayerStat } from '../api';
import { useTheme } from '../contexts/ThemeContext';

interface EditPlayerNameModalProps {
  stat: any;
  onClose: () => void;
  onSave: (updatedStat: any) => void;
}

export default function EditPlayerNameModal({ stat, onClose, onSave }: EditPlayerNameModalProps) {
  const { theme } = useTheme();
  const [fullName, setFullName] = useState(stat.fullName || stat.displayName || stat.playerName);
  const [mlbId, setMlbId] = useState(stat.mlbId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'local' | 'mlb'>('mlb');

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const result = searchMode === "mlb" ? await searchMLBPlayers(searchQuery) : await searchArchivePlayers(searchQuery);
        setSearchResults(result.players || []);
      } catch (err: any) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchMode]);

  const handleSelectPlayer = (player: any) => {
    setFullName(player.name);
    setMlbId(String(player.mlbId || ''));
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const result = await updateArchivePlayerStat(stat.id, {
        fullName: fullName.trim() || null,
        mlbId: mlbId.trim() || null,
      });

      onSave(result.stat);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update player');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className={`relative w-full max-w-md rounded-lg p-6 shadow-xl ${
          theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-4">Edit Player Name</h2>

        {/* Current abbreviated name (reference) */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
            Abbreviated Name (reference)
          </label>
          <div className={`px-3 py-2 rounded border ${
            theme === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-400' : 'border-gray-300 bg-gray-50 text-gray-600'
          }`}>
            {stat.playerName}
          </div>
        </div>

        {/* MLB Player Search */}
        <div className="mb-4 relative">
          <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
            Search MLB Player
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type to search..."
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'border-slate-700 bg-slate-800 text-white placeholder-slate-500'
                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
            }`}
          />
          
          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className={`absolute z-10 w-full mt-1 rounded border shadow-lg max-h-48 overflow-y-auto ${
              theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-300 bg-white'
            }`}>
              {searchResults.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleSelectPlayer(player)}
                  className={`w-full text-left px-3 py-2 hover:bg-blue-500/20 border-b last:border-b-0 ${
                    theme === 'dark' ? 'text-white border-slate-700' : 'text-gray-900 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{player.name}</span>
                    {(player.mlbId || player.id) && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        theme === 'dark' ? 'bg-blue-600/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                      }`}>
                        #{player.mlbId || player.id}
                      </span>
                    )}
                  </div>
                  <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                    {player.team && <span>{player.team} • </span>}
                    {player.position || player.posPrimary || 'UT'}
                  </div>
                </button>
              ))}
            </div>
          )}
          {searching && (
            <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
              Searching MLB database...
            </div>
          )}
        </div>

        {/* Full Name Input */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
            Full Display Name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g., Shohei Ohtani"
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'border-slate-700 bg-slate-800 text-white placeholder-slate-500'
                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
            }`}
          />
        </div>

        {/* MLB ID Input */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
            MLB ID (optional)
          </label>
          <input
            type="text"
            value={mlbId}
            onChange={(e) => setMlbId(e.target.value)}
            placeholder="e.g., 660271"
            className={`w-full px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'border-slate-700 bg-slate-800 text-white placeholder-slate-500'
                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
            }`}
          />
        </div>

        {error && (
          <div className={`mb-4 p-3 rounded border ${
            theme === 'dark' 
              ? 'border-red-500/40 bg-red-500/10 text-red-200'
              : 'border-red-300 bg-red-50 text-red-900'
          }`}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={saving}
            className={`px-4 py-2 rounded font-medium ${
              theme === 'dark'
                ? 'bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50'
                : 'bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:opacity-50'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !fullName.trim()}
            className={`px-4 py-2 rounded font-medium ${
              theme === 'dark'
                ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
