import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  deleteLevelRequirement,
  isDataError,
  listLevelRequirements,
  ROUTINE_TYPES,
} from '@opp/data';
import type { LevelRequirement, RoutineType } from '@opp/data';
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

/** Admin level requirements list: listLevelRequirements, New, Edit, Delete. Filter by routine_type; C rows show attempt_count and allowed_throws_per_attempt. */
export function AdminLevelRequirementsPage() {
  const { supabase } = useSupabase();
  const [rows, setRows] = useState<LevelRequirement[]>([]);
  const [filterType, setFilterType] = useState<RoutineType | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filtered = filterType ? rows.filter((r) => r.routine_type === filterType) : rows;

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

  const handleDelete = async (id: string, minLevel: number, routineType: string) => {
    if (!confirm(`Delete level requirement for min_level ${minLevel}, routine_type ${routineType}?`)) return;
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
        One row per (min_level, routine_type). min_level is typically 0, 10, 20, …, 90. <strong>darts_allowed</strong> = darts per step (SS/SD/ST) or stored for C. For <strong>C (checkout)</strong>: <strong>allowed_throws_per_attempt</strong> = darts per attempt (e.g. 9), <strong>attempt_count</strong> = attempts per step (e.g. 3) — player gets up to attempt_count × allowed_throws_per_attempt darts to checkout.
      </p>
      <p style={{ marginBottom: '0.5rem' }}>
        <Link to="/admin/level-requirements/new">New level requirement</Link>
        {' · '}
        <label>
          Filter by routine_type:{' '}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as RoutineType | '')}
            style={{ padding: '0.25rem' }}
          >
            <option value="">All</option>
            {ROUTINE_TYPES.map((rt) => (
              <option key={rt} value={rt}>{rt}</option>
            ))}
          </select>
        </label>
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thTdStyle}>min_level</th>
            <th style={thTdStyle}>routine_type</th>
            <th style={thTdStyle}>tgt_hits</th>
            <th style={thTdStyle}>darts_allowed</th>
            <th style={thTdStyle}>attempt_count</th>
            <th style={thTdStyle}>throws/attempt</th>
            <th style={thTdStyle}></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id}>
              <td style={thTdStyle}>{r.min_level}</td>
              <td style={thTdStyle}>{r.routine_type}</td>
              <td style={thTdStyle}>{r.tgt_hits}</td>
              <td style={thTdStyle}>{r.darts_allowed}</td>
              <td style={thTdStyle}>{r.routine_type === 'C' ? (r.attempt_count ?? '—') : '—'}</td>
              <td style={thTdStyle}>{r.routine_type === 'C' ? (r.allowed_throws_per_attempt ?? '—') : '—'}</td>
              <td style={thTdStyle}>
                <Link to={`/admin/level-requirements/${r.id}`}>Edit</Link>
                {' · '}
                <button
                  type="button"
                  onClick={() => handleDelete(r.id, r.min_level, r.routine_type)}
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
