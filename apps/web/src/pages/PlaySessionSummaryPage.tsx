/**
 * Summary for a completed session: session score, routine scores, and link to view all darts.
 * Route: /play/session/:calendarId/summary. Used when player taps a completed session on Play landing.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createSessionRun,
  getAggregatedSessionScoreForPlayerAndCalendar,
  getCalendarEntryById,
  getSessionRunByPlayerAndCalendar,
  listRoutineScoresForSessionRun,
  listSessionRunsByPlayerAndCalendar,
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
const labelStyle: React.CSSProperties = { fontWeight: 600, marginRight: '0.5rem' };
const buttonTapStyle: React.CSSProperties = {
  minHeight: 'var(--tap-min, 44px)',
  minWidth: 'var(--tap-min, 44px)',
  padding: '0.5rem 0.75rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
};

export function PlaySessionSummaryPage() {
  const { calendarId } = useParams<{ calendarId: string }>();
  const navigate = useNavigate();
  const { supabase, player } = useSupabase();
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [sessionScore, setSessionScore] = useState<number | null>(null);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [routineScores, setRoutineScores] = useState<{ routine_name: string; routine_score: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [replayError, setReplayError] = useState(false);

  useEffect(() => {
    if (!calendarId || !supabase || !player) return;
    let cancelled = false;
    (async () => {
      const [run, runs, aggregatedScore] = await Promise.all([
        getSessionRunByPlayerAndCalendar(supabase, player.id, calendarId),
        listSessionRunsByPlayerAndCalendar(supabase, player.id, calendarId),
        getAggregatedSessionScoreForPlayerAndCalendar(supabase, player.id, calendarId),
      ]);
      if (cancelled) return;
      if (!run || !run.completed_at) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setAttemptCount(runs.length);
      setSessionScore(aggregatedScore ?? run.session_score ?? 0);
      const [entry, routines] = await Promise.all([
        getCalendarEntryById(supabase, calendarId),
        listRoutineScoresForSessionRun(supabase, run.id),
      ]);
      if (cancelled) return;
      setSessionName(entry?.session_name ?? 'Session');
      setRoutineScores(routines.map((r) => ({ routine_name: r.routine_name, routine_score: r.routine_score })));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [calendarId, supabase, player]);

  useEffect(() => {
    if (notFound && calendarId) navigate(`/play/session/${calendarId}`, { replace: true });
  }, [notFound, calendarId, navigate]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <h1 style={titleStyle}>Session summary</h1>
        <LoadingSpinner message="Loading…" />
      </div>
    );
  }
  if (notFound) return null;

  const handleReplay = async () => {
    if (!player?.id || !supabase || !calendarId) return;
    setReplayError(false);
    try {
      const newRun = await createSessionRun(supabase, player.id, calendarId);
      navigate(`/play/session/${calendarId}`, { state: { runId: newRun.id } });
    } catch {
      setReplayError(true);
    }
  };

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Session complete: {sessionName}</h1>
      <section style={sectionStyle} aria-label="Scores">
        {attemptCount > 0 && (
          <p>
            <span style={labelStyle}>Attempts:</span> {attemptCount}
          </p>
        )}
        <p>
          <span style={labelStyle}>Session score{attemptCount > 1 ? ' (avg)' : ''}:</span>
          {sessionScore != null ? `${sessionScore.toFixed(1)}%` : '—'}
        </p>
        {routineScores.length > 0 && (
          <p>
            <span style={labelStyle}>Routine scores (last attempt):</span>
            {routineScores.map((r) => `${r.routine_name} ${r.routine_score.toFixed(0)}%`).join(' · ')}
          </p>
        )}
      </section>
      {replayError && (
        <p role="alert" style={{ color: 'var(--color-error, #b91c1c)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          Could not start replay. Try again.
        </p>
      )}
      <section style={sectionStyle}>
        <NavButton to={`/play/session/${calendarId}/summary/darts`}>
          View all darts thrown
        </NavButton>
        <button
          type="button"
          onClick={handleReplay}
          title="Repeat this session; your score will be averaged with previous attempts."
          aria-label="Replay this session (score will be averaged with previous attempts)"
          style={{ ...buttonTapStyle, marginLeft: '0.5rem' }}
          className="tap-target"
        >
          Replay
        </button>
      </section>
      <p>
        <NavButton to="/play" variant="secondary">← Back to Play</NavButton>
      </p>
    </div>
  );
}
