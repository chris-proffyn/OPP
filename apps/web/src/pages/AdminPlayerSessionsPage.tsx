/**
 * Admin drill-down: Players → Sessions. Lists completed session runs for a player.
 * Route: /admin/players/:id/sessions.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getPlayerById,
  listCompletedSessionRunsForPlayer,
  resetSessionForCalendar,
  isDataError,
} from '@opp/data';
import type { Player, SessionHistoryEntry } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

const tableStyle: React.CSSProperties = { borderCollapse: 'collapse', width: '100%', maxWidth: '56rem' };
const thTdStyle: React.CSSProperties = { border: '1px solid #ccc', padding: '0.5rem 0.75rem', textAlign: 'left' };
const linkStyle: React.CSSProperties = { minHeight: 'var(--tap-min, 44px)', display: 'inline-flex', alignItems: 'center' };

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function AdminPlayerSessionsPage() {
  const { supabase } = useSupabase();
  const { id } = useParams<{ id: string }>();
  const [player, setPlayer] = useState<Player | null>(null);
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [resettingCalendarId, setResettingCalendarId] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    Promise.all([
      getPlayerById(supabase, id),
      listCompletedSessionRunsForPlayer(supabase, id, { limit: 100 }),
    ])
      .then(([playerData, sessionList]) => {
        if (playerData) {
          setPlayer(playerData);
          setSessions(sessionList);
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Failed to load sessions.');
      })
      .finally(() => setLoading(false));
  }, [supabase, id]);

  const handleResetSession = useCallback(
    async (calendarId: string) => {
      if (
        !window.confirm(
          'Reset this session? This will remove all session runs, routine scores and dart scores for this session (all players). It cannot be undone.'
        )
      ) {
        return;
      }
      setResetError(null);
      setResettingCalendarId(calendarId);
      try {
        await resetSessionForCalendar(supabase, calendarId);
        await load();
      } catch (err) {
        setResetError(isDataError(err) ? err.message : 'Failed to reset session.');
      } finally {
        setResettingCalendarId(null);
      }
    },
    [supabase, load]
  );

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSpinner message="Loading sessions…" />;
  if (notFound) return <p>Player not found.</p>;
  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!player) return null;

  return (
    <div>
      <h1>Sessions: {player.nickname}</h1>
      <p>
        <Link to="/admin/players" style={linkStyle}>← Players</Link>
        {' · '}
        <Link to={`/admin/players/${id}`} style={linkStyle}>View player</Link>
      </p>
      <section style={{ marginTop: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Completed session runs</h2>
        {resetError && (
          <p role="alert" style={{ color: '#c00', marginBottom: '0.5rem' }}>
            {resetError}
          </p>
        )}
        {sessions.length === 0 ? (
          <p>No completed sessions yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thTdStyle}>Session</th>
                <th style={thTdStyle}>Completed</th>
                <th style={thTdStyle}>Session score</th>
                <th style={thTdStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((run) => (
                <tr key={run.id}>
                  <td style={thTdStyle}>{run.session_name ?? '—'}</td>
                  <td style={thTdStyle}>{formatDate(run.completed_at)}</td>
                  <td style={thTdStyle}>
                    {run.session_score != null ? `${run.session_score.toFixed(1)}%` : '—'}
                  </td>
                  <td style={thTdStyle}>
                    <Link to={`/admin/players/${id}/sessions/${run.id}`} style={linkStyle}>
                      Routines & scores
                    </Link>
                    {' · '}
                    <button
                      type="button"
                      onClick={() => handleResetSession(run.calendar_id)}
                      disabled={resettingCalendarId === run.calendar_id}
                      style={{
                        minHeight: 'var(--tap-min, 44px)',
                        padding: '0.25rem 0.5rem',
                        cursor: resettingCalendarId === run.calendar_id ? 'wait' : 'pointer',
                        background: 'none',
                        border: 'none',
                        font: 'inherit',
                        color: 'inherit',
                        textDecoration: 'underline',
                      }}
                    >
                      {resettingCalendarId === run.calendar_id ? 'Resetting…' : 'Reset session'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
