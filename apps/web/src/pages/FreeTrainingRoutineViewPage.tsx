/**
 * Free Training: read-only view of a routine's steps. Route: /play/free-training/routine/:routineId.
 * Per OPP_EXTRA_TRAINING_IMPLEMENTATION_CHECKLIST §7 — View steps.
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getRoutineWithSteps, isDataError } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

const pageStyle: React.CSSProperties = {
  padding: '0 0.5rem 2rem',
  maxWidth: '36rem',
  margin: '0 auto',
};
const titleStyle: React.CSSProperties = {
  margin: '0 0 0.5rem 0',
  fontSize: '1.5rem',
  fontWeight: 700,
  color: 'var(--color-text)',
};
const tableStyle: React.CSSProperties = {
  borderCollapse: 'collapse',
  width: '100%',
  marginTop: '0.75rem',
};
const thTdStyle: React.CSSProperties = {
  border: '1px solid var(--color-border)',
  padding: '0.5rem 0.75rem',
  textAlign: 'left',
  backgroundColor: 'var(--color-surface)',
};

export function FreeTrainingRoutineViewPage() {
  const { supabase } = useSupabase();
  const { routineId } = useParams<{ routineId: string }>();
  const [name, setName] = useState<string | null>(null);
  const [steps, setSteps] = useState<{ step_no: number; target: string; routine_type?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !routineId) return;
    setLoading(true);
    setError(null);
    getRoutineWithSteps(supabase, routineId)
      .then((data) => {
        if (data) {
          setName(data.routine.name);
          setSteps(data.steps.map((s) => ({ step_no: s.step_no, target: s.target, routine_type: s.routine_type })));
        } else {
          setError('Routine not found.');
        }
      })
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Failed to load routine.');
      })
      .finally(() => setLoading(false));
  }, [supabase, routineId]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <h1 style={titleStyle}>View steps</h1>
        <LoadingSpinner message="Loading…" />
      </div>
    );
  }

  if (error || !routineId) {
    return (
      <div style={pageStyle}>
        <h1 style={titleStyle}>View steps</h1>
        <p role="alert" style={{ color: 'var(--color-error, #b91c1c)' }}>{error ?? 'Missing routine.'}</p>
        <p style={{ marginTop: '0.5rem' }}>
          <Link to="/play/free-training" style={{ color: 'var(--color-link)' }}>← Back to Free Training</Link>
        </p>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>{name ?? 'Routine'}</h1>
      <p>
        <Link to="/play/free-training" style={{ color: 'var(--color-link)', fontSize: '0.9rem' }}>← Back to Free Training</Link>
      </p>
      <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)', margin: '0.5rem 0 0 0' }}>
        Steps (read-only)
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thTdStyle}>No</th>
            <th style={thTdStyle}>Target</th>
            <th style={thTdStyle}>Type</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((s, i) => (
            <tr key={i}>
              <td style={thTdStyle}>{s.step_no}</td>
              <td style={thTdStyle}>{s.target}</td>
              <td style={thTdStyle}>{s.routine_type ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
