/**
 * Summary for a completed session: session score, routine scores, and link to view all darts.
 * Route: /play/session/:calendarId/summary. Used when player taps a completed session on Play landing.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getCalendarEntryById,
  getSessionRunByPlayerAndCalendar,
  listRoutineScoresForSessionRun,
} from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

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
const linkStyle: React.CSSProperties = {
  ...buttonTapStyle,
  textDecoration: 'none',
  color: 'var(--color-primary, #3b82f6)',
  fontWeight: 600,
};

export function PlaySessionSummaryPage() {
  const { calendarId } = useParams<{ calendarId: string }>();
  const navigate = useNavigate();
  const { supabase, player } = useSupabase();
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [sessionScore, setSessionScore] = useState<number | null>(null);
  const [routineScores, setRoutineScores] = useState<{ routine_name: string; routine_score: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!calendarId || !supabase || !player) return;
    let cancelled = false;
    (async () => {
      const run = await getSessionRunByPlayerAndCalendar(supabase, player.id, calendarId);
      if (cancelled) return;
      if (!run || !run.completed_at) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const [entry, routines] = await Promise.all([
        getCalendarEntryById(supabase, calendarId),
        listRoutineScoresForSessionRun(supabase, run.id),
      ]);
      if (cancelled) return;
      setSessionName(entry?.session_name ?? 'Session');
      setSessionScore(run.session_score ?? 0);
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

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Session complete: {sessionName}</h1>
      <section style={sectionStyle} aria-label="Scores">
        <p>
          <span style={labelStyle}>Session score:</span>
          {sessionScore != null ? `${sessionScore.toFixed(1)}%` : '—'}
        </p>
        {routineScores.length > 0 && (
          <p>
            <span style={labelStyle}>Routine scores:</span>
            {routineScores.map((r) => `${r.routine_name} ${r.routine_score.toFixed(0)}%`).join(' · ')}
          </p>
        )}
      </section>
      <section style={sectionStyle}>
        <Link
          to={`/play/session/${calendarId}/summary/darts`}
          style={linkStyle}
          className="tap-target"
        >
          View all darts thrown
        </Link>
      </section>
      <p>
        <Link to="/play" className="tap-target" style={{ ...linkStyle, color: 'inherit' }}>
          ← Back to Play
        </Link>
      </p>
    </div>
  );
}
