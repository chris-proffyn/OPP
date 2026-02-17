import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isDataError, listPlayers, updatePlayerTier } from '@opp/data';
import type { Player } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

const TIER_OPTIONS: Array<'free' | 'gold' | 'platinum'> = ['free', 'gold', 'platinum'];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

const tableStyle: React.CSSProperties = {
  borderCollapse: 'collapse',
  width: '100%',
  maxWidth: '40rem',
};
const thTdStyle: React.CSSProperties = {
  border: '1px solid var(--color-border)',
  padding: '0.5rem 0.75rem',
  textAlign: 'left',
};

/** Admin players list: uses listPlayers from @opp/data only. Tier editable via updatePlayerTier. */
export function AdminPlayersPage() {
  const { supabase } = useSupabase();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tierUpdating, setTierUpdating] = useState<string | null>(null);
  const [tierError, setTierError] = useState<string | null>(null);

  async function handleTierChange(playerId: string, tier: 'free' | 'gold' | 'platinum') {
    setTierError(null);
    setTierUpdating(playerId);
    try {
      const updated = await updatePlayerTier(supabase, playerId, tier);
      setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      setTierError(isDataError(err) ? err.message : 'Failed to update tier.');
    } finally {
      setTierUpdating(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listPlayers(supabase)
      .then((data) => {
        if (!cancelled) {
          setPlayers(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(isDataError(err) ? err.message : 'Failed to load players.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  if (loading) return <p>Loading players…</p>;
  if (error) return <p role="alert" style={{ color: '#c00' }}>{error}</p>;

  return (
    <div>
      <h1>Players</h1>
      {tierError && (
        <p role="alert" style={{ color: '#c00', marginBottom: '0.5rem' }}>
          {tierError}
        </p>
      )}
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thTdStyle}>Name</th>
            <th style={thTdStyle}>Email</th>
            <th style={thTdStyle}>Date joined</th>
            <th style={thTdStyle}>Role</th>
            <th style={thTdStyle}>Tier</th>
            <th style={thTdStyle}></th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.id}>
              <td style={thTdStyle}>{p.nickname}</td>
              <td style={thTdStyle}>{p.email}</td>
              <td style={thTdStyle}>{formatDate(p.date_joined)}</td>
              <td style={thTdStyle}>{p.role}</td>
              <td style={thTdStyle}>
                <select
                  value={p.tier ?? 'free'}
                  onChange={(e) => handleTierChange(p.id, e.target.value as 'free' | 'gold' | 'platinum')}
                  disabled={tierUpdating === p.id}
                  aria-label={`Tier for ${p.nickname}`}
                  style={{ minHeight: 'var(--tap-min, 44px)', padding: '0.25rem 0.5rem' }}
                >
                  {TIER_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </td>
              <td style={thTdStyle}>
                <Link to={`/admin/players/${p.id}`}>View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
