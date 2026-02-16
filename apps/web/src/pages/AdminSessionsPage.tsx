import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  deleteSession,
  isDataError,
  listSessions,
} from '@opp/data';
import type { Session } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

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

/** Admin sessions list: listSessions, New, Edit, Delete with confirm. */
export function AdminSessionsPage() {
  const { supabase } = useSupabase();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    listSessions(supabase)
      .then(setSessions)
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Failed to load sessions.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [supabase]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete session “${name}”?`)) return;
    try {
      await deleteSession(supabase, id);
      load();
    } catch (err) {
      alert(isDataError(err) ? err.message : 'Failed to delete session.');
    }
  };

  if (loading) return <p>Loading sessions…</p>;
  if (error) return <p role="alert" style={{ color: '#c00' }}>{error}</p>;

  return (
    <div>
      <h1>Sessions</h1>
      <p>
        <Link to="/admin/sessions/new">New session</Link>
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thTdStyle}>Name</th>
            <th style={thTdStyle}></th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id}>
              <td style={thTdStyle}>{s.name}</td>
              <td style={thTdStyle}>
                <Link to={`/admin/sessions/${s.id}`}>Edit</Link>
                {' · '}
                <button
                  type="button"
                  onClick={() => handleDelete(s.id, s.name)}
                  style={{ background: 'none', border: 'none', color: '#c00', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
