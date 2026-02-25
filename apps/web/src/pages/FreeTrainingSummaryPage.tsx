/**
 * Summary for a completed free-training run. Route: /play/free-training/run/:runId/summary.
 * Per OPP_EXTRA_TRAINING_IMPLEMENTATION_CHECKLIST §8.
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getSessionRunById,
  listRoutineScoresForSessionRun,
} from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { NavButton } from '../components/NavButton';

const pageStyle: React.CSSProperties = {
  padding: '0 0.5rem 2rem',
  maxWidth: '36rem',
  margin: '0 auto',
};
const titleStyle: React.CSSProperties = { margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 700 };
const sectionStyle: React.CSSProperties = { marginBottom: '1.5rem' };
const buttonTapStyle: React.CSSProperties = {
  minHeight: 'var(--tap-min, 44px)',
  minWidth: 'var(--tap-min, 44px)',
  padding: '0.5rem 0.75rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginRight: '0.5rem',
  marginBottom: '0.25rem',
};

export function FreeTrainingSummaryPage() {
  const { runId } = useParams<{ runId: string }>();
  const { supabase, player } = useSupabase();
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [sessionScore, setSessionScore] = useState<number | null>(null);
  const [routineScores, setRoutineScores] = useState<{ routine_name: string; routine_score: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!runId || !supabase || !player) return;
    let cancelled = false;
    (async () => {
      const run = await getSessionRunById(supabase, runId);
      if (cancelled) return;
      if (!run || run.player_id !== player.id || run.run_type !== 'free' || !run.completed_at) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setSessionScore(run.session_score ?? 0);
      const routines = await listRoutineScoresForSessionRun(supabase, run.id);
      if (cancelled) return;
      const name = routines[0]?.routine_name ?? 'Routine';
      setSessionName(`Free Training — ${name}`);
      setRoutineScores(routines.map((r) => ({ routine_name: r.routine_name, routine_score: r.routine_score })));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [runId, supabase, player]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <h1 style={titleStyle}>Free Training</h1>
        <LoadingSpinner message="Loading…" />
      </div>
    );
  }
  if (notFound) {
    return (
      <div style={pageStyle}>
        <h1 style={titleStyle}>Free Training</h1>
        <p role="alert">Run not found or not completed.</p>
        <p>
          <NavButton to="/play/free-training" variant="secondary">← Back to Free Training</NavButton>
        </p>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Done</h1>
      <p style={{ color: 'var(--color-muted)', margin: '0 0 1rem 0' }}>{sessionName}</p>
      <section style={sectionStyle}>
        <p>
          <strong>Routine score: {sessionScore != null ? `${sessionScore.toFixed(1)}%` : '—'}</strong>
        </p>
        {routineScores.length > 0 && (
          <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)' }}>
            {routineScores.map((r) => `${r.routine_name}: ${r.routine_score.toFixed(0)}%`).join(' · ')}
          </p>
        )}
      </section>
      <p>
        <NavButton to="/play/free-training" variant="secondary" style={buttonTapStyle}>
          Another routine
        </NavButton>
        <NavButton to="/play" variant="secondary" style={buttonTapStyle}>
          ← Back to Play
        </NavButton>
      </p>
    </div>
  );
}
