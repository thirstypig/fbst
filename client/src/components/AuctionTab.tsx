// src/components/AuctionTab.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { fetchPlayerStats, PlayerSeasonStats } from '../api';

interface AuctionModalProps {
  player: PlayerSeasonStats;
  onClose: () => void;
}

const AuctionModal: React.FC<AuctionModalProps> = ({ player, onClose }) => {
  // Known stat keys we care about if they exist
  const primaryStatKeys = [
    'g',
    'ab',
    'h',
    'hr',
    'r',
    'rbi',
    'sb',
    'bb',
    'so',
    'avg',
    'obp',
    'slg',
    'ops',
    'ip',
    'w',
    'l',
    'sv',
    'k',
    'era',
    'whip',
  ];

  const allKeys = Object.keys(player).filter(
    (key) =>
      key !== 'mlb_id' &&
      key !== 'name' &&
      key !== 'team' &&
      key !== 'pos',
  );

  const orderedKeys = [
    ...primaryStatKeys.filter((k) => allKeys.includes(k)),
    ...allKeys.filter((k) => !primaryStatKeys.includes(k)),
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#111827',
          color: 'white',
          padding: '1.5rem',
          borderRadius: '0.75rem',
          minWidth: '320px',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
              {player.name}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              {player.team} · {player.pos} · MLB ID: {player.mlb_id}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'white',
              fontSize: '1.1rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.85rem',
          }}
        >
          <tbody>
            {orderedKeys.map((key) => (
              <tr key={key}>
                <td
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderBottom: '1px solid rgba(55,65,81,0.8)',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '0.03em',
                  }}
                >
                  {key}
                </td>
                <td
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderBottom: '1px solid rgba(55,65,81,0.8)',
                    textAlign: 'right',
                  }}
                >
                  {player[key]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const AuctionTab: React.FC = () => {
  const [players, setPlayers] = useState<PlayerSeasonStats[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PlayerSeasonStats | null>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        setLoading(true);
        const stats = await fetchPlayerStats();
        if (!isMounted) return;

        // Sort by name by default (you can change this)
        stats.sort((a, b) => a.name.localeCompare(b.name));

        setPlayers(stats);
        setError(null);
      } catch (err: any) {
        console.error('Failed to load player stats', err);
        if (isMounted) {
          setError(err.message ?? 'Failed to load player stats');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const columns = useMemo(() => {
    if (!players.length) return [];

    const primaryStatKeys = [
      'hr',
      'r',
      'rbi',
      'sb',
      'avg',
      'obp',
      'ip',
      'w',
      'sv',
      'k',
      'era',
      'whip',
    ];

    const sample = players[0];

    const dynamicStats = primaryStatKeys.filter(
      (key) =>
        key in sample || players.some((p) => p[key] !== undefined),
    );

    return ['name', 'team', 'pos', ...dynamicStats];
  }, [players]);

  if (loading) {
    return <div>Loading MLB player stats…</div>;
  }

  if (error) {
    return (
      <div style={{ color: 'red' }}>
        Error loading MLB player stats: {error}
      </div>
    );
  }

  if (!players.length) {
    return <div>No MLB player stats found.</div>;
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>
        Auction – MLB Player Stats
      </h1>
      <div
        style={{
          fontSize: '0.85rem',
          marginBottom: '0.5rem',
          opacity: 0.8,
        }}
      >
        Click a player row to open the modal with full stat details.
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.8rem',
          }}
        >
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  style={{
                    textAlign: col === 'name' ? 'left' : 'right',
                    padding: '0.35rem 0.5rem',
                    borderBottom: '1px solid #374151',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontSize: '0.7rem',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr
                key={p.mlb_id}
                onClick={() => setSelected(p)}
                style={{
                  cursor: 'pointer',
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    style={{
                      padding: '0.3rem 0.5rem',
                      borderBottom: '1px solid #1f2933',
                      textAlign: col === 'name' ? 'left' : 'right',
                      whiteSpace:
                        col === 'name' ? 'nowrap' : 'normal',
                    }}
                  >
                    {p[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <AuctionModal
          player={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};
