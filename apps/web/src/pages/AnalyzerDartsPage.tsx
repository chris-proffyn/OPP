/**
 * View individual dart scores for one session run. Route: /analyzer/darts/:runId.
 * Linked from AnalyzerPage session history. P8 §6 — View darts (Gold/Platinum).
 */

import { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { getDartScoresForSessionRun } from '@opp/data';
import type { DartScore } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

const sectionStyle: React.CSSProperties = { marginBottom: '1.5rem' };
const tableStyle: React.CSSProperties = { borderCollapse: 'collapse', width: '100%', maxWidth: 600 };
const thTdStyle: React.CSSProperties = { border: '1px solid #ccc', padding: '0.5rem 0.75rem', textAlign: 'left' };
const linkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 'var(--tap-min, 44px)',
  color: 'var(--color-primary, #3b82f6)',
  textDecoration: 'none',
  fontWeight: 500,
};

function DartsTable({ darts }: { darts: DartScore[] }) {
  if (darts.length === 0) return <p>No dart data for this session.</p>;
  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          <th style={thTdStyle}>Routine</th>
          <th style={thTdStyle}>Step</th>
          <th style={thTdStyle}>Attempt</th>
          <th style={thTdStyle}>Dart</th>
          <th style={thTdStyle}>Target</th>
          <th style={thTdStyle}>Actual</th>
          <th style={thTdStyle}>Result</th>
        </tr>
      </thead>
      <tbody>
        {darts.map((d) => (
          <tr key={d.id}>
            <td style={thTdStyle}>{d.routine_no}</td>
            <td style={thTdStyle}>{d.step_no}</td>
            <td style={thTdStyle}>{d.attempt_index != null ? d.attempt_index : '—'}</td>
            <td style={thTdStyle}>{d.dart_no}</td>
            <td style={thTdStyle}>{d.target}</td>
            <td style={thTdStyle}>{d.actual}</td>
            <td style={thTdStyle}>{d.result === 'H' ? 'hit' : 'miss'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function AnalyzerDartsPage() {
  const { runId } = useParams<{ runId: string }>();
  const location = useLocation();
  const sessionName = (location.state as { sessionName?: string } | null)?.sessionName ?? null;
  const { supabase } = useSupabase();
  const [darts, setDarts] = useState<DartScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId || !supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDartScoresForSessionRun(supabase, runId)
      .then((list) => {
        if (!cancelled) setDarts(list);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load dart scores.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [runId, supabase]);

  return (
    <>
      <h1>Dart scores</h1>
      {sessionName && (
        <p style={{ marginBottom: '1rem', color: 'var(--color-muted, #525252)' }}>
          Session: {sessionName}
        </p>
      )}
      <section style={sectionStyle} aria-label="Dart scores">
        {loading && <LoadingSpinner message="Loading darts…" />}
        {error && <p role="alert" style={{ color: 'var(--color-error, #b91c1c)' }}>{error}</p>}
        {!loading && !error && <DartsTable darts={darts} />}
      </section>
      <p>
        <Link to="/analyzer" className="tap-target" style={linkStyle}>
          ← Back to Performance
        </Link>
      </p>
    </>
  );
}
