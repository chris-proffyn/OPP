/**
 * Admin level averages list: CRUD for level_averages (level bands with 3DA and accuracy %).
 * Route: /admin/level-averages.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  deleteLevelAverage,
  isDataError,
  listLevelAverages,
} from '@opp/data';
import type { LevelAverage } from '@opp/data';
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

function formatNum(n: number | null): string {
  if (n === null || n === undefined) return '—';
  return String(n);
}

export function AdminLevelAveragesPage() {
  const { supabase } = useSupabase();
  const [rows, setRows] = useState<LevelAverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    listLevelAverages(supabase)
      .then(setRows)
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Failed to load level averages.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [supabase]);

  const handleDelete = async (row: LevelAverage) => {
    if (!confirm(`Delete level band ${row.level_min}–${row.level_max} (${row.description})?`)) return;
    try {
      await deleteLevelAverage(supabase, row.id);
      load();
    } catch (err) {
      alert(isDataError(err) ? err.message : 'Failed to delete.');
    }
  };

  if (loading) return <p>Loading level averages…</p>;
  if (error) return <p role="alert" style={{ color: '#c00' }}>{error}</p>;

  return (
    <div>
      <h1>Level averages</h1>
      <p style={{ marginBottom: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
        Level bands (level_min–level_max) with description, expected 3-dart average, and accuracy % by segment.
      </p>
      <p>
        <Link to="/admin/level-averages/new">New level average</Link>
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thTdStyle}>level_min</th>
              <th style={thTdStyle}>level_max</th>
              <th style={thTdStyle}>description</th>
              <th style={thTdStyle}>three_dart_avg</th>
              <th style={thTdStyle}>single_acc_pct</th>
              <th style={thTdStyle}>double_acc_pct</th>
              <th style={thTdStyle}>treble_acc_pct</th>
              <th style={thTdStyle}>bull_acc_pct</th>
              <th style={thTdStyle}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={thTdStyle}>{r.level_min}</td>
                <td style={thTdStyle}>{r.level_max}</td>
                <td style={thTdStyle}>{r.description}</td>
                <td style={thTdStyle}>{r.three_dart_avg}</td>
                <td style={thTdStyle}>{formatNum(r.single_acc_pct)}</td>
                <td style={thTdStyle}>{formatNum(r.double_acc_pct)}</td>
                <td style={thTdStyle}>{formatNum(r.treble_acc_pct)}</td>
                <td style={thTdStyle}>{formatNum(r.bull_acc_pct)}</td>
                <td style={thTdStyle}>
                  <Link to={`/admin/level-averages/${r.id}`}>Edit</Link>
                  {' · '}
                  <button
                    type="button"
                    onClick={() => handleDelete(r)}
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
    </div>
  );
}
