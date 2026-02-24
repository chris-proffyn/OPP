/**
 * GE landing: list all sessions for the player with status (Completed, Due, Future) and session score.
 * Display session name, scheduled_at, day no, session no, status, score; Start/View → /play/session/:calendarId.
 * Supports list view and calendar view with a toggle.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getAllSessionsForPlayer, isDataError } from '@opp/data';
import type { SessionWithStatus } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { hasCompletedITA, PLAY_MUST_COMPLETE_ITA_MESSAGE } from '../utils/ita';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

type ViewMode = 'list' | 'calendar';

function formatScheduledShort(iso: string): { date: string; time: string } {
  try {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    };
  } catch {
    return { date: iso, time: '' };
  }
}

function dateToKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getSessionsByDateKey(sessions: SessionWithStatus[]): Map<string, SessionWithStatus[]> {
  const map = new Map<string, SessionWithStatus[]>();
  for (const s of sessions) {
    try {
      const d = new Date(s.scheduled_at);
      const key = dateToKey(d);
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    } catch {
      // skip invalid dates
    }
  }
  return map;
}

/** Returns { year, month, days[] } for the calendar grid. days has 0..6 padding at start for weekday alignment. */
function getMonthGrid(year: number, month: number): { year: number; month: number; days: (number | null)[] } {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay(); // 0 = Sun
  const daysInMonth = last.getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return { year, month, days };
}

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
const introStyle: React.CSSProperties = {
  margin: '0 0 1rem 0',
  fontSize: '0.9rem',
  color: 'var(--color-muted)',
  lineHeight: 1.4,
};
const recordLinkStyle: React.CSSProperties = {
  display: 'inline-block',
  marginBottom: '0.25rem',
  color: 'var(--color-link)',
};
const listStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};
const cardStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.75rem 1rem',
  textAlign: 'left',
  textDecoration: 'none',
  color: 'var(--color-text)',
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  cursor: 'pointer',
  minHeight: 'var(--tap-min, 44px)',
  boxSizing: 'border-box',
};
const cardSessionNameStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: '1rem',
  margin: '0 0 0.35rem 0',
  color: 'var(--color-text)',
};
const cardMetaStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: 'var(--color-muted)',
  margin: 0,
  lineHeight: 1.35,
};
const cardScoreStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  marginTop: '0.25rem',
  fontWeight: 600,
  color: 'var(--color-text)',
};

const toggleRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 0,
  marginBottom: '1rem',
  borderRadius: 8,
  overflow: 'hidden',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface-elevated)',
};
const toggleButtonStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '0.6rem 0.75rem',
  border: 'none',
  borderRadius: 0,
  cursor: 'pointer',
  fontSize: '0.9rem',
  fontWeight: 600,
  backgroundColor: active ? 'var(--color-primary)' : 'transparent',
  color: active ? 'var(--color-primary-contrast)' : 'var(--color-muted)',
  minHeight: 'var(--tap-min, 44px)',
});

const calendarMonthHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '0.75rem',
  gap: '0.5rem',
};
const calendarMonthTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1.1rem',
  fontWeight: 600,
  color: 'var(--color-text)',
};
const calendarNavButtonStyle: React.CSSProperties = {
  padding: '0.4rem 0.75rem',
  minHeight: 'var(--tap-min, 44px)',
  minWidth: 'var(--tap-min, 44px)',
  border: '1px solid var(--color-border)',
  borderRadius: 6,
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text)',
  cursor: 'pointer',
  fontSize: '1rem',
};
const calendarGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: '2px',
  marginBottom: '1rem',
};
const calendarWeekdayStyle: React.CSSProperties = {
  textAlign: 'center',
  fontSize: '0.7rem',
  color: 'var(--color-muted)',
  padding: '0.25rem 0',
};
const calendarDayStyle = (hasSession: boolean, isPadding: boolean): React.CSSProperties => ({
  aspectRatio: '1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.85rem',
  borderRadius: 6,
  backgroundColor: isPadding ? 'transparent' : hasSession ? 'var(--color-primary-subtle)' : 'var(--color-surface)',
  color: isPadding ? 'transparent' : 'var(--color-text)',
  border: isPadding ? 'none' : '1px solid var(--color-border)',
});
const calendarSessionsSectionStyle: React.CSSProperties = {
  marginTop: '1rem',
};
const calendarDateHeadingStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--color-muted)',
  margin: '0.75rem 0 0.25rem 0',
};

export function PlayLandingPage() {
  const { supabase, player } = useSupabase();
  const navigate = useNavigate();
  const location = useLocation();
  const [sessions, setSessions] = useState<SessionWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [showSoloSuccess, setShowSoloSuccess] = useState(false);

  // Solo schedule created: show success message and clear navigation state (§5).
  useEffect(() => {
    const state = location.state as { soloScheduleCreated?: boolean } | null;
    if (state?.soloScheduleCreated) {
      setShowSoloSuccess(true);
      navigate('/play', { replace: true }); // clear state so message doesn't reappear on refresh
      const t = setTimeout(() => setShowSoloSuccess(false), 6000);
      return () => clearTimeout(t);
    }
  }, [location.state, navigate]);

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

  const sessionsByDate = useMemo(() => getSessionsByDateKey(sessions), [sessions]);
  const monthGrid = useMemo(
    () => getMonthGrid(calendarYear, calendarMonth),
    [calendarYear, calendarMonth]
  );
  const sessionsInMonth = useMemo(() => {
    const list: { key: string; sessions: SessionWithStatus[] }[] = [];
    for (let d = 1; d <= 31; d++) {
      const key = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const daySessions = sessionsByDate.get(key);
      if (daySessions && daySessions.length > 0) list.push({ key, sessions: daySessions });
    }
    return list;
  }, [calendarYear, calendarMonth, sessionsByDate]);

  if (player && !hasCompletedITA(player) && player.role !== 'admin') {
    return (
      <div style={pageStyle}>
        <h1 style={titleStyle}>Play</h1>
        <LoadingSpinner message="Taking you to ITA…" />
      </div>
    );
  }
  if (loading) {
    return (
      <div style={pageStyle}>
        <h1 style={titleStyle}>Play</h1>
        <LoadingSpinner message="Loading sessions…" />
      </div>
    );
  }
  if (error) {
    return (
      <div style={pageStyle}>
        <h1 style={titleStyle}>Play</h1>
        <ErrorMessage
          message={error}
          onRetry={() => {
            setError(null);
            setLoading(true);
            setRetryTrigger((t) => t + 1);
          }}
        />
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>
          You may not be in a cohort yet, or there are no calendar entries. Check with your coach or try again.
        </p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div style={pageStyle}>
        <h1 style={titleStyle}>Play</h1>
        <div style={introStyle}>
          <p style={{ margin: 0 }}>
            No sessions. Generate a solo training schedule to get started, or check with your coach if you're in a cohort.
          </p>
          <Link to="/play/solo/new" className="tap-target" style={{ ...recordLinkStyle, marginTop: '0.5rem', display: 'inline-block' }}>
            Generate Solo Training Schedule
          </Link>
        </div>
      </div>
    );
  }

  const monthTitle = new Date(calendarYear, calendarMonth).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Play</h1>
      <div style={introStyle}>
        <Link to="/play/record-match" className="tap-target" style={recordLinkStyle}>
          Record match
        </Link>
        {' · '}
        <Link to="/play/solo/new" className="tap-target" style={recordLinkStyle}>
          Generate Solo Training Schedule
        </Link>
        <p style={{ margin: 0 }}>
          Tap a session to start (Due or Future) or view (Completed).
        </p>
      </div>

      {showSoloSuccess && (
        <p
          role="status"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--color-success-bg, rgba(34, 197, 94, 0.15))',
            color: 'var(--color-success, #16a34a)',
            borderRadius: 8,
            fontWeight: 500,
          }}
        >
          Solo training schedule created. Your sessions are now on Play.
        </p>
      )}

      <div style={toggleRowStyle} role="tablist" aria-label="View mode">
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'list'}
          style={toggleButtonStyle(viewMode === 'list')}
          onClick={() => setViewMode('list')}
          className="tap-target"
        >
          List
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'calendar'}
          style={toggleButtonStyle(viewMode === 'calendar')}
          onClick={() => setViewMode('calendar')}
          className="tap-target"
        >
          Calendar
        </button>
      </div>

      {viewMode === 'list' && (
        <ul style={listStyle} role="list">
          {sessions.map((s) => {
            const { date, time } = formatScheduledShort(s.scheduled_at);
            const scoreStr =
              s.session_score != null ? `${Number(s.session_score).toFixed(1)}%` : null;
            const actionLabel = s.status === 'Completed' ? 'View' : 'Start';
            return (
              <li key={s.calendar_id}>
                <button
                  type="button"
                  onClick={() => navigate(s.status === 'Completed' ? `/play/session/${s.calendar_id}/summary` : `/play/session/${s.calendar_id}`)}
                  style={cardStyle}
                  className="tap-target"
                  aria-label={`${s.session_name || 'Session'} — ${date} ${time} — ${actionLabel}`}
                >
                  <div style={cardSessionNameStyle}>{s.session_name || '—'}</div>
                  <p style={cardMetaStyle}>
                    {date} {time} · Day {s.day_no} · Session {s.session_no} · {s.status}
                  </p>
                  {scoreStr != null && (
                    <div style={cardScoreStyle}>Score: {scoreStr}</div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {viewMode === 'calendar' && (
        <>
          <div style={calendarMonthHeaderStyle}>
            <button
              type="button"
              style={calendarNavButtonStyle}
              onClick={() => {
                if (calendarMonth === 0) {
                  setCalendarMonth(11);
                  setCalendarYear((y) => y - 1);
                } else setCalendarMonth((m) => m - 1);
              }}
              aria-label="Previous month"
              className="tap-target"
            >
              ←
            </button>
            <h2 style={calendarMonthTitleStyle}>{monthTitle}</h2>
            <button
              type="button"
              style={calendarNavButtonStyle}
              onClick={() => {
                if (calendarMonth === 11) {
                  setCalendarMonth(0);
                  setCalendarYear((y) => y + 1);
                } else setCalendarMonth((m) => m + 1);
              }}
              aria-label="Next month"
              className="tap-target"
            >
              →
            </button>
          </div>
          <div style={calendarGridStyle}>
            {weekdays.map((w, i) => (
              <div key={i} style={calendarWeekdayStyle}>
                {w}
              </div>
            ))}
            {monthGrid.days.map((day, i) => {
              const isPadding = day === null;
              const key =
                !isPadding && day !== null
                  ? `${monthGrid.year}-${String(monthGrid.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  : '';
              const hasSession = !!key && sessionsByDate.has(key);
              return (
                <div
                  key={i}
                  style={calendarDayStyle(hasSession, isPadding)}
                  aria-hidden={isPadding}
                >
                  {isPadding ? '' : day}
                </div>
              );
            })}
          </div>
          <section style={calendarSessionsSectionStyle} aria-label="Sessions this month">
            {sessionsInMonth.length === 0 ? (
              <p style={{ ...cardMetaStyle, margin: 0 }}>No sessions this month.</p>
            ) : (
              sessionsInMonth.map(({ key, sessions: daySessions }) => {
                const dateLabel = new Date(key + 'T12:00:00').toLocaleDateString(undefined, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                });
                return (
                  <div key={key}>
                    <p style={calendarDateHeadingStyle}>{dateLabel}</p>
                    {daySessions.map((s) => {
                      const { time } = formatScheduledShort(s.scheduled_at);
                      const scoreStr =
                        s.session_score != null ? `${Number(s.session_score).toFixed(1)}%` : null;
                      return (
                        <button
                          key={s.calendar_id}
                          type="button"
                          onClick={() => navigate(s.status === 'Completed' ? `/play/session/${s.calendar_id}/summary` : `/play/session/${s.calendar_id}`)}
                          style={cardStyle}
                          className="tap-target"
                          aria-label={`${s.session_name || 'Session'} ${time}`}
                        >
                          <div style={cardSessionNameStyle}>{s.session_name || '—'}</div>
                          <p style={cardMetaStyle}>
                            {time} · {s.status}
                            {scoreStr != null ? ` · ${scoreStr}` : ''}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </section>
        </>
      )}
    </div>
  );
}
