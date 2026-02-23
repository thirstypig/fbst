// client/src/components/EditPlayerNameModal.tsx
import React, { useState, useEffect } from 'react';
import { searchArchivePlayers, searchMLBPlayers, updateArchivePlayerStat } from '../../../api';

interface EditPlayerNameModalProps {
  stat: any;
  onClose: () => void;
  onSave: (updatedStat: any) => void;
}

export default function EditPlayerNameModal({ stat, onClose, onSave }: EditPlayerNameModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[4px] p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="relative w-full max-w-md rounded-[var(--lg-radius-2xl)] bg-[var(--lg-glass-bg)] backdrop-blur-[var(--lg-glass-blur)] border border-[var(--lg-glass-border)] shadow-[var(--lg-glass-shadow)] p-8 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--lg-text-heading)]">Identity Override</h2>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--lg-text-muted)] mt-1 opacity-60">Updating Player Credentials</p>
        </div>

        {/* Current abbreviated name (reference) */}
        <div className="mb-6">
          <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--lg-text-muted)] mb-2">
            Transmission ID (Reference)
          </label>
          <div className="px-4 py-3 rounded-[var(--lg-radius-lg)] border border-[var(--lg-glass-border)] bg-black/20 text-[var(--lg-text-muted)] font-black tracking-widest text-sm">
            {stat.playerName}
          </div>
        </div>

        {/* MLB Player Search */}
        <div className="mb-6 relative">
          <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--lg-text-muted)] mb-2">
            Central Database Search
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search MLB Registry..."
            className="lg-input w-full"
          />
          
          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-2 rounded-[var(--lg-radius-xl)] border border-[var(--lg-glass-border)] bg-[var(--lg-glass-bg)] backdrop-blur-xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar">
              {searchResults.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleSelectPlayer(player)}
                  className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-b-0 transition-colors group"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[var(--lg-text-primary)] group-hover:text-[var(--lg-accent)] transition-colors">{player.name}</span>
                    {(player.mlbId || player.id) && (
                      <span className="text-[10px] px-2 py-0.5 rounded-[var(--lg-radius-sm)] bg-blue-500/10 text-blue-400 font-black border border-blue-500/20">
                        #{player.mlbId || player.id}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-[var(--lg-text-muted)] mt-1 opacity-60">
                    {player.team && <span>{player.team} • </span>}
                    {player.position || player.posPrimary || 'UT'}
                  </div>
                </button>
              ))}
            </div>
          )}
          {searching && (
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--lg-accent)] mt-2 animate-pulse">
              Querying MLB records...
            </div>
          )}
        </div>

        {/* Full Name Input */}
        <div className="mb-6">
          <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--lg-text-muted)] mb-2">
            Target Display Identity
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g., Shohei Ohtani"
            className="lg-input w-full"
          />
        </div>

        {/* MLB ID Input */}
        <div className="mb-8">
          <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--lg-text-muted)] mb-2">
            MLB Registry ID (Optional)
          </label>
          <input
            type="text"
            value={mlbId}
            onChange={(e) => setMlbId(e.target.value)}
            placeholder="e.g., 660271"
            className="lg-input w-full text-blue-400 font-black tracking-widest"
          />
        </div>

        {error && (
          <div className="lg-alert lg-alert-error mb-6">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <button
            onClick={onClose}
            disabled={saving}
            className="lg-button-secondary px-6 py-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !fullName.trim()}
            className="lg-button-primary px-8 py-2"
          >
            {saving ? 'Synchronizing...' : 'Update Record'}
          </button>
        </div>
      </div>
    </div>
  );
}
