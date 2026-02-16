import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  deleteSchedule,
  isDataError,
  listSchedules,
} from '@opp/data';
import type { Schedule } from '@opp/data';
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

/** Admin schedules list: listSchedules, New, Edit, Delete with confirm. */
export function AdminSchedulesPage() {
  const { supabase } = useSupabase();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    listSchedules(supabase)
      .then(setSchedules)
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Failed to load schedules.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [supabase]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete schedule “${name}”? This will remove all its entries.`)) return;
    try {
      await deleteSchedule(supabase, id);
      load();
    } catch (err) {
      alert(isDataError(err) ? err.message : 'Failed to delete schedule.');
    }
  };

  if (loading) return <p>Loading schedules…</p>;
  if (error) return <p role="alert" style={{ color: '#c00' }}>{error}</p>;

  return (
    <div>
      <h1>Schedules</h1>
      <p>
        <Link to="/admin/schedules/new">New schedule</Link>
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thTdStyle}>Name</th>
            <th style={thTdStyle}></th>
          </tr>
        </thead>
        <tbody>
          {schedules.map((s) => (
            <tr key={s.id}>
              <td style={thTdStyle}>{s.name}</td>
              <td style={thTdStyle}>
                <Link to={`/admin/schedules/${s.id}`}>Edit</Link>
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
