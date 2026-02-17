/**
 * P7 — Admin competitions list. listCompetitions (all); New, Edit, Delete (with confirm).
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listCompetitions,
  listCohorts,
  deleteCompetition,
  isDataError,
} from '@opp/data';
import type { Competition } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

const tableStyle: React.CSSProperties = {
  borderCollapse: 'collapse',
  width: '100%',
  maxWidth: '56rem',
};
const thTdStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '0.5rem 0.75rem',
  textAlign: 'left',
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function AdminCompetitionsPage() {
  const { supabase } = useSupabase();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [cohortMap, setCohortMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      listCompetitions(supabase, { order: 'asc' }),
      listCohorts(supabase),
    ])
      .then(([list, cohorts]) => {
        setCompetitions(list);
        const map: Record<string, string> = {};
        cohorts.forEach((c) => { map[c.id] = c.name; });
        setCohortMap(map);
      })
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Failed to load competitions.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [supabase]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete competition “${name}”? Matches will keep their data but competition_id will be set to null.`)) return;
    try {
      await deleteCompetition(supabase, id);
      load();
    } catch (err) {
      alert(isDataError(err) ? err.message : 'Failed to delete competition.');
    }
  };

  if (loading) return <p>Loading competitions…</p>;
  if (error) return <p role="alert" style={{ color: '#c00' }}>{error}</p>;

  return (
    <div>
      <h1>Competitions</h1>
      <p>
        <Link to="/admin/competitions/new">New competition</Link>
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thTdStyle}>Name</th>
            <th style={thTdStyle}>Type</th>
            <th style={thTdStyle}>Cohort</th>
            <th style={thTdStyle}>Scheduled</th>
            <th style={thTdStyle}>Format</th>
            <th style={thTdStyle}></th>
          </tr>
        </thead>
        <tbody>
          {competitions.map((c) => (
            <tr key={c.id}>
              <td style={thTdStyle}>{c.name}</td>
              <td style={thTdStyle}>{c.competition_type}</td>
              <td style={thTdStyle}>{c.cohort_id ? cohortMap[c.cohort_id] ?? c.cohort_id : '—'}</td>
              <td style={thTdStyle}>{formatDateTime(c.scheduled_at)}</td>
              <td style={thTdStyle}>
                {c.format_legs != null ? `Best of ${c.format_legs}` : '—'}
                {c.format_target != null ? ` · ${c.format_target}` : ''}
              </td>
              <td style={thTdStyle}>
                <Link to={`/admin/competitions/${c.id}`}>View</Link>
                {' · '}
                <Link to={`/admin/competitions/${c.id}/edit`}>Edit</Link>
                {' · '}
                <button
                  type="button"
                  onClick={() => handleDelete(c.id, c.name)}
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
