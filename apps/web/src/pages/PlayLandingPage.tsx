/**
 * GE landing: list all sessions for the player with status (Completed, Due, Future) and session score.
 * Display session name, scheduled_at, day no, session no, status, score; Start/View → /play/session/:calendarId.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllSessionsForPlayer, isDataError } from '@opp/data';
import type { SessionWithStatus } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { hasCompletedITA, PLAY_MUST_COMPLETE_ITA_MESSAGE } from '../utils/ita';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

function formatScheduledAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

const tableStyle: React.CSSProperties = {
  borderCollapse: 'collapse',
  width: '100%',
  maxWidth: '50rem',
};
const thTdStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '0.5rem 0.75rem',
  textAlign: 'left',
};

export function PlayLandingPage() {
  const { supabase, player } = useSupabase();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Direct to ITA when player has not completed ITA (admins can still see play list). OPP_ITA §3; message per OPP_ITA_UPDATE §2.
  useEffect(() => {
    if (!player || player.role === 'admin') return;
    if (!hasCompletedITA(player)) {
      navigate('/play/ita', { replace: true, state: { message: PLAY_MUST_COMPLETE_ITA_MESSAGE } });
    }
  }, [player, navigate]);

  useEffect(() => {
    if (!player) return;
    if (!hasCompletedITA(player) && player.role !== 'admin') return;
    setLoading(true);
    setError(null);
    getAllSessionsForPlayer(supabase, player.id)
      .then(setSessions)
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Sessions could not be loaded. Try again.');
      })
      .finally(() => setLoading(false));
  }, [supabase, player, retryTrigger]);

  if (player && !hasCompletedITA(player) && player.role !== 'admin') {
    return <><h1>Play</h1><LoadingSpinner message="Taking you to ITA…" /></>;
  }
  if (loading) return <><h1>Play</h1><LoadingSpinner message="Loading sessions…" /></>;
  if (error) {
    return (
      <>
        <h1>Play</h1>
        <ErrorMessage
          message={error}
          onRetry={() => {
            setError(null);
            setLoading(true);
            setRetryTrigger((t) => t + 1);
          }}
        />
        <p style={{ color: 'var(--color-muted, #525252)', fontSize: '0.9rem' }}>
          You may not be in a cohort yet, or there are no calendar entries. Check with your coach or try again.
        </p>
      </>
    );
  }

  if (sessions.length === 0) {
    return (
      <>
        <h1>Play</h1>
        <p>No sessions. If you expect to see sessions here, make sure you're in a cohort with a generated calendar.</p>
      </>
    );
  }

  return (
    <>
      <h1>Play</h1>
      <p>
        <Link to="/play/record-match" className="tap-target" style={{ display: 'inline-flex' }}>Record match</Link>
        {' · '}
        All your sessions. Choose one to start (Due or Future) or view (Completed).
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thTdStyle}>Session</th>
            <th style={thTdStyle}>Scheduled</th>
            <th style={thTdStyle}>Day</th>
            <th style={thTdStyle}>Session no.</th>
            <th style={thTdStyle}>Status</th>
            <th style={thTdStyle}>Score</th>
            <th style={thTdStyle}></th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.calendar_id}>
              <td style={thTdStyle}>{s.session_name || '—'}</td>
              <td style={thTdStyle}>{formatScheduledAt(s.scheduled_at)}</td>
              <td style={thTdStyle}>{s.day_no}</td>
              <td style={thTdStyle}>{s.session_no}</td>
              <td style={thTdStyle}>{s.status}</td>
              <td style={thTdStyle}>
                {s.session_score != null ? `${Number(s.session_score).toFixed(1)}%` : '—'}
              </td>
              <td style={thTdStyle}>
                <button
                  type="button"
                  onClick={() => navigate(`/play/session/${s.calendar_id}`)}
                  style={{
                    minHeight: 'var(--tap-min, 44px)',
                    minWidth: 'var(--tap-min, 44px)',
                    padding: '0.5rem 0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  {s.status === 'Completed' ? 'View' : 'Start'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
