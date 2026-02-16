import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isDataError, listPlayers } from '@opp/data';
import type { Player } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

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
  border: '1px solid #ccc',
  padding: '0.5rem 0.75rem',
  textAlign: 'left',
};

/** Admin players list: uses listPlayers from @opp/data only. */
export function AdminPlayersPage() {
  const { supabase } = useSupabase();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thTdStyle}>Name</th>
            <th style={thTdStyle}>Email</th>
            <th style={thTdStyle}>Date joined</th>
            <th style={thTdStyle}>Role</th>
            <th style={thTdStyle}></th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.id}>
              <td style={thTdStyle}>{p.display_name}</td>
              <td style={thTdStyle}>{p.email}</td>
              <td style={thTdStyle}>{formatDate(p.date_joined)}</td>
              <td style={thTdStyle}>{p.role}</td>
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
