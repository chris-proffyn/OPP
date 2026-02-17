/**
 * Admin drill-down: Players → Sessions → Routines & scores. One session run: routine scores and dart scores.
 * Route: /admin/players/:id/sessions/:runId.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getPlayerById,
  getSessionRunById,
  getCalendarEntryById,
  listRoutineScoresForSessionRun,
  getDartScoresForSessionRun,
  isDataError,
} from '@opp/data';
import type { Player, SessionRun, RoutineScoreForRun, DartScore } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

const tableStyle: React.CSSProperties = { borderCollapse: 'collapse', width: '100%', maxWidth: '40rem' };
const thTdStyle: React.CSSProperties = { border: '1px solid #ccc', padding: '0.5rem 0.75rem', textAlign: 'left' };
const linkStyle: React.CSSProperties = { minHeight: 'var(--tap-min, 44px)', display: 'inline-flex', alignItems: 'center' };
const sectionStyle: React.CSSProperties = { marginTop: '1.5rem' };

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function AdminPlayerSessionRunDetailPage() {
  const { supabase } = useSupabase();
  const { id: playerId, runId } = useParams<{ id: string; runId: string }>();
  const [player, setPlayer] = useState<Player | null>(null);
  const [run, setRun] = useState<SessionRun | null>(null);
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [routineScores, setRoutineScores] = useState<RoutineScoreForRun[]>([]);
  const [dartScores, setDartScores] = useState<DartScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    if (!playerId || !runId) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    getSessionRunById(supabase, runId)
      .then((runData) => {
        if (!runData) {
          setNotFound(true);
          return;
        }
        setRun(runData);
        return Promise.all([
          getPlayerById(supabase, runData.player_id),
          getCalendarEntryById(supabase, runData.calendar_id),
          listRoutineScoresForSessionRun(supabase, runId),
          getDartScoresForSessionRun(supabase, runId),
        ]);
      })
      .then((result) => {
        if (!result) return;
        const [playerData, calendarEntry, routineList, dartList] = result;
        if (playerData) setPlayer(playerData);
        if (calendarEntry) setSessionName(calendarEntry.session_name ?? null);
        setRoutineScores(routineList);
        setDartScores(dartList);
      })
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Failed to load session run.');
      })
      .finally(() => setLoading(false));
  }, [supabase, playerId, runId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSpinner message="Loading session run…" />;
  if (notFound) return <p>Session run not found.</p>;
  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!run) return null;

  return (
    <div>
      <h1>Session run: {sessionName ?? 'Session'}</h1>
      <p>
        <Link to="/admin/players" style={linkStyle}>← Players</Link>
        {' · '}
        <Link to={`/admin/players/${playerId}`} style={linkStyle}>View player</Link>
        {' · '}
        <Link to={`/admin/players/${playerId}/sessions`} style={linkStyle}>Sessions</Link>
      </p>
      <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.25rem 1.5rem', marginTop: '1rem', maxWidth: '28rem' }}>
        <dt>Player</dt>
        <dd>{player?.nickname ?? run.player_id}</dd>
        <dt>Completed</dt>
        <dd>{formatDate(run.completed_at)}</dd>
        <dt>Session score</dt>
        <dd>{run.session_score != null ? `${run.session_score.toFixed(1)}%` : '—'}</dd>
      </dl>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Routine scores</h2>
        {routineScores.length === 0 ? (
          <p>No routine scores for this run.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thTdStyle}>Routine</th>
                <th style={thTdStyle}>Score %</th>
              </tr>
            </thead>
            <tbody>
              {routineScores.map((r) => (
                <tr key={r.routine_id}>
                  <td style={thTdStyle}>{r.routine_name || r.routine_id.slice(0, 8)}</td>
                  <td style={thTdStyle}>{r.routine_score.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Dart scores</h2>
        {dartScores.length === 0 ? (
          <p>No dart scores for this run.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thTdStyle}>Routine #</th>
                <th style={thTdStyle}>Step</th>
                <th style={thTdStyle}>Dart</th>
                <th style={thTdStyle}>Target</th>
                <th style={thTdStyle}>Actual</th>
                <th style={thTdStyle}>Result</th>
              </tr>
            </thead>
            <tbody>
              {dartScores.map((d) => (
                <tr key={d.id}>
                  <td style={thTdStyle}>{d.routine_no}</td>
                  <td style={thTdStyle}>{d.step_no}</td>
                  <td style={thTdStyle}>{d.dart_no}</td>
                  <td style={thTdStyle}>{d.target}</td>
                  <td style={thTdStyle}>{d.actual}</td>
                  <td style={thTdStyle}>{d.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
