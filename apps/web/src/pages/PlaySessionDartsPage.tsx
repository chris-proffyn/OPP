/**
 * List all darts thrown in a completed session. Route: /play/session/:calendarId/summary/darts.
 * Mobile-optimised: routine dropdown, compact step/dart, thrown cell coloured green/red for hit/miss.
 */

import { useEffect, useMemo, useState } from 'react';
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
  minHeight: '100vh',
  boxSizing: 'border-box',
};
const titleStyle: React.CSSProperties = { margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 700 };
const sectionStyle: React.CSSProperties = { marginBottom: '1rem' };
const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.8rem',
};
const thTdStyle: React.CSSProperties = {
  border: '1px solid var(--color-border)',
  padding: '0.25rem 0.35rem',
  textAlign: 'left',
};
const thTdNarrowStyle: React.CSSProperties = {
  ...thTdStyle,
  width: '1%',
  whiteSpace: 'nowrap',
  textAlign: 'center',
};
const linkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 'var(--tap-min, 44px)',
  padding: '0.5rem 0',
  color: 'var(--color-link, var(--color-primary))',
  textDecoration: 'none',
  fontWeight: 600,
};
const selectStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '20rem',
  padding: '0.5rem 0.75rem',
  fontSize: '1rem',
  minHeight: 'var(--tap-min, 44px)',
  marginBottom: '0.75rem',
  border: '1px solid var(--color-border)',
  borderRadius: 6,
  backgroundColor: 'var(--color-bg)',
  color: 'var(--color-text)',
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
  const [selectedRoutineNo, setSelectedRoutineNo] = useState<number | 'all'>('all');

  const routineNumbers = useMemo(() => {
    const set = new Set(darts.map((d) => d.routine_no));
    return Array.from(set).sort((a, b) => a - b);
  }, [darts]);

  const filteredDarts = useMemo(() => {
    if (selectedRoutineNo === 'all') return darts;
    return darts.filter((d) => d.routine_no === selectedRoutineNo);
  }, [darts, selectedRoutineNo]);

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

  const showRoutineColumn = selectedRoutineNo === 'all' && routineNumbers.length > 1;

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
        <>
          {routineNumbers.length >= 1 && (
            <section style={sectionStyle} aria-label="Select routine">
              <label htmlFor="darts-routine" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', fontWeight: 600 }}>
                Routine
              </label>
              <select
                id="darts-routine"
                value={selectedRoutineNo}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedRoutineNo(v === 'all' ? 'all' : parseInt(v, 10));
                }}
                style={selectStyle}
                className="tap-target"
                aria-label="Filter by routine"
              >
                <option value="all">All routines</option>
                {routineNumbers.map((no) => (
                  <option key={no} value={no}>
                    Routine {no}
                  </option>
                ))}
              </select>
            </section>
          )}
          <section style={sectionStyle} aria-label="Darts thrown">
            <table style={tableStyle}>
              <thead>
                <tr>
                  {showRoutineColumn && (
                    <th style={thTdNarrowStyle}>Rout</th>
                  )}
                  <th style={thTdNarrowStyle}>Step</th>
                  <th style={thTdNarrowStyle}>Dart</th>
                  <th style={thTdStyle}>Target</th>
                  <th style={thTdStyle}>Thrown</th>
                </tr>
              </thead>
              <tbody>
                {filteredDarts.map((d) => (
                  <tr key={d.id}>
                    {showRoutineColumn && (
                      <td style={thTdNarrowStyle}>{d.routine_no}</td>
                    )}
                    <td style={thTdNarrowStyle}>{d.step_no}</td>
                    <td style={thTdNarrowStyle}>{d.dart_no}</td>
                    <td style={thTdStyle}>{segmentCodeToSpoken(d.target)}</td>
                    <td
                      style={{
                        ...thTdStyle,
                        backgroundColor: (d.result ?? '') === 'H' ? 'var(--color-success-bg, rgba(22, 163, 74, 0.2))' : 'var(--color-error-bg, rgba(220, 38, 38, 0.2))',
                        color: (d.result ?? '') === 'H' ? 'var(--color-success, #16a34a)' : 'var(--color-error, #dc2626)',
                        fontWeight: 600,
                      }}
                      aria-label={(d.result ?? '') === 'H' ? 'Hit' : 'Miss'}
                      title={(d.result ?? '') === 'H' ? 'Hit' : 'Miss'}
                    >
                      {formatDart(d)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
      <p>
        <Link to="/play" className="tap-target" style={linkStyle}>
          ← Back to Play
        </Link>
      </p>
    </div>
  );
}
