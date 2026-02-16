import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  deleteLevelRequirement,
  isDataError,
  listLevelRequirements,
} from '@opp/data';
import type { LevelRequirement } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

const tableStyle: React.CSSProperties = {
  borderCollapse: 'collapse',
  width: '100%',
  maxWidth: '28rem',
};
const thTdStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '0.5rem 0.75rem',
  textAlign: 'left',
};

/** Admin level requirements list: listLevelRequirements, New, Edit, Delete. */
export function AdminLevelRequirementsPage() {
  const { supabase } = useSupabase();
  const [rows, setRows] = useState<LevelRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    listLevelRequirements(supabase)
      .then(setRows)
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Failed to load level requirements.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [supabase]);

  const handleDelete = async (id: string, minLevel: number) => {
    if (!confirm(`Delete level requirement for min_level ${minLevel}?`)) return;
    try {
      await deleteLevelRequirement(supabase, id);
      load();
    } catch (err) {
      alert(isDataError(err) ? err.message : 'Failed to delete.');
    }
  };

  if (loading) return <p>Loading level requirements…</p>;
  if (error) return <p role="alert" style={{ color: '#c00' }}>{error}</p>;

  return (
    <div>
      <h1>Level requirements</h1>
      <p style={{ marginBottom: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
        min_level is typically 0, 10, 20, …, 90 (one per decade).
      </p>
      <p>
        <Link to="/admin/level-requirements/new">New level requirement</Link>
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thTdStyle}>min_level</th>
            <th style={thTdStyle}>tgt_hits</th>
            <th style={thTdStyle}>darts_allowed</th>
            <th style={thTdStyle}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={thTdStyle}>{r.min_level}</td>
              <td style={thTdStyle}>{r.tgt_hits}</td>
              <td style={thTdStyle}>{r.darts_allowed}</td>
              <td style={thTdStyle}>
                <Link to={`/admin/level-requirements/${r.id}`}>Edit</Link>
                {' · '}
                <button
                  type="button"
                  onClick={() => handleDelete(r.id, r.min_level)}
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
