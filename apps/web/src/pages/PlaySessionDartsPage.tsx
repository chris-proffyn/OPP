/**
 * List all darts thrown in a completed session. Route: /play/session/:calendarId/summary/darts.
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getCalendarEntryById,
  getSessionRunByPlayerAndCalendar,
  listDartScoresByTrainingId,
} from '@opp/data';
import type { DartScore } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { segmentCodeToSpoken } from '../constants/segments';
import { LoadingSpinner } from '../components/LoadingSpinner';

const pageStyle: React.CSSProperties = {
  padding: '0 0.5rem 2rem',
  maxWidth: '36rem',
  margin: '0 auto',
};
const titleStyle: React.CSSProperties = { margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 700 };
const sectionStyle: React.CSSProperties = { marginBottom: '1rem' };
const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.9rem',
};
const thTdStyle: React.CSSProperties = {
  border: '1px solid var(--color-border, #374151)',
  padding: '0.35rem 0.5rem',
  textAlign: 'left',
};
const linkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 'var(--tap-min, 44px)',
  padding: '0.5rem 0',
  color: 'var(--color-primary, #3b82f6)',
  textDecoration: 'none',
  fontWeight: 600,
};

function formatDart(d: DartScore): string {
  return segmentCodeToSpoken(d.actual);
}

export function PlaySessionDartsPage() {
  const { calendarId } = useParams<{ calendarId: string }>();
  const { supabase, player } = useSupabase();
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [darts, setDarts] = useState<DartScore[]>([]);
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
      const [entry, dartList] = await Promise.all([
        getCalendarEntryById(supabase, calendarId),
        listDartScoresByTrainingId(supabase, run.id),
      ]);
      if (cancelled) return;
      setSessionName(entry?.session_name ?? 'Session');
      setDarts(dartList);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [calendarId, supabase, player]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <h1 style={titleStyle}>All darts</h1>
        <LoadingSpinner message="Loading…" />
      </div>
    );
  }
  if (notFound) {
    return (
      <div style={pageStyle}>
        <p>Session not found or not completed.</p>
        <Link to="/play" style={linkStyle}>← Back to Play</Link>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>All darts: {sessionName}</h1>
      <section style={sectionStyle}>
        <Link
          to={`/play/session/${calendarId}/summary`}
          style={linkStyle}
          className="tap-target"
        >
          ← Back to session summary
        </Link>
      </section>
      {darts.length === 0 ? (
        <p>No darts recorded for this session.</p>
      ) : (
        <section style={sectionStyle} aria-label="Darts thrown">
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thTdStyle}>Routine</th>
                <th style={thTdStyle}>Step</th>
                <th style={thTdStyle}>Dart</th>
                <th style={thTdStyle}>Target</th>
                <th style={thTdStyle}>Thrown</th>
                <th style={thTdStyle}>Hit</th>
              </tr>
            </thead>
            <tbody>
              {darts.map((d) => (
                <tr key={d.id}>
                  <td style={thTdStyle}>{d.routine_no}</td>
                  <td style={thTdStyle}>{d.step_no}</td>
                  <td style={thTdStyle}>{d.dart_no}</td>
                  <td style={thTdStyle}>{segmentCodeToSpoken(d.target)}</td>
                  <td style={thTdStyle}>{formatDart(d)}</td>
                  <td style={thTdStyle}>{d.result === 'H' ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <p>
        <Link to="/play" className="tap-target" style={linkStyle}>
          ← Back to Play
        </Link>
      </p>
    </div>
  );
}
