import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  deleteRoutine,
  isDataError,
  listRoutines,
} from '@opp/data';
import type { Routine } from '@opp/data';
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

function descriptionSnippet(desc: string | null): string {
  if (!desc) return '—';
  return desc.length > 50 ? `${desc.slice(0, 50)}…` : desc;
}

/** Admin routines list: listRoutines, New, Edit, Delete with confirm. */
export function AdminRoutinesPage() {
  const { supabase } = useSupabase();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    listRoutines(supabase)
      .then(setRoutines)
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Failed to load routines.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [supabase]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete routine “${name}”?`)) return;
    try {
      await deleteRoutine(supabase, id);
      load();
    } catch (err) {
      alert(isDataError(err) ? err.message : 'Failed to delete routine.');
    }
  };

  if (loading) return <p>Loading routines…</p>;
  if (error) return <p role="alert" style={{ color: '#c00' }}>{error}</p>;

  return (
    <div>
      <h1>Routines</h1>
      <p>
        <Link to="/admin/routines/new">New routine</Link>
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thTdStyle}>Name</th>
            <th style={thTdStyle}>Description</th>
            <th style={thTdStyle}></th>
          </tr>
        </thead>
        <tbody>
          {routines.map((r) => (
            <tr key={r.id}>
              <td style={thTdStyle}>{r.name}</td>
              <td style={thTdStyle}>{descriptionSnippet(r.description)}</td>
              <td style={thTdStyle}>
                <Link to={`/admin/routines/${r.id}`}>Edit</Link>
                {' · '}
                <button
                  type="button"
                  onClick={() => handleDelete(r.id, r.name)}
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
