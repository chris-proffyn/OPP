/**
 * Generate Solo Training Schedule — choose schedule and start date (§2).
 * Route: /play/solo/new. Lists schedules, start date picker, confirmation, then create.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createSoloTrainingCohort,
  listSchedulesForSolo,
  isDataError,
} from '@opp/data';
import type { Schedule } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

const pageStyle: React.CSSProperties = {
  padding: '0 0.5rem 2rem',
  maxWidth: '36rem',
  margin: '0 auto',
};
const titleStyle: React.CSSProperties = { margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 700 };
const sectionStyle: React.CSSProperties = { marginBottom: '1.5rem' };
const linkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 'var(--tap-min, 44px)',
  color: 'var(--color-primary, #3b82f6)',
  textDecoration: 'none',
  fontWeight: 500,
};
const cardStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.75rem 1rem',
  textAlign: 'left',
  border: '1px solid var(--color-border, #374151)',
  borderRadius: 8,
  cursor: 'pointer',
  minHeight: 'var(--tap-min, 44px)',
  boxSizing: 'border-box',
  marginBottom: '0.5rem',
  backgroundColor: 'var(--color-surface, #1f2937)',
  color: 'inherit',
};
const cardSelectedStyle: React.CSSProperties = {
  ...cardStyle,
  borderColor: 'var(--color-primary, #3b82f6)',
  outline: '2px solid var(--color-primary, #3b82f6)',
  outlineOffset: 2,
};
const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  fontSize: '1rem',
  minHeight: 'var(--tap-min, 44px)',
  width: '100%',
  maxWidth: '14rem',
  boxSizing: 'border-box',
};
const buttonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  minHeight: 'var(--tap-min, 44px)',
  fontWeight: 600,
  fontSize: '1rem',
  cursor: 'pointer',
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PlaySoloNewPage() {
  const { supabase, player } = useSupabase();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [startDate, setStartDate] = useState(todayISO);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    listSchedulesForSolo(supabase)
      .then(setSchedules)
      .catch((err) => setError(isDataError(err) ? err.message : 'Could not load schedules.'))
      .finally(() => setLoading(false));
  }, [supabase]);

  const cohortName = player?.nickname?.trim() ? `${player.nickname.trim()} solo cohort` : 'Player solo cohort';
  const startDateValid = startDate.length === 10 && startDate >= todayISO();
  const canSubmit = selectedSchedule && startDateValid && player && !submitting;

  const handleCreate = async () => {
    if (!canSubmit || !selectedSchedule || !player) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await createSoloTrainingCohort(supabase!, player.id, {
        scheduleId: selectedSchedule.id,
        startDate,
      });
      navigate('/play', { replace: true, state: { soloScheduleCreated: true } });
    } catch (err) {
      setSubmitError(isDataError(err) ? err.message : 'Could not create solo schedule. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!player) return null;

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Generate Solo Training Schedule</h1>
      <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: 'var(--color-muted, #6b7280)' }}>
        Choose a schedule and start date to create your own training plan.
      </p>

      <section style={sectionStyle} aria-label="Choose a schedule">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Choose a schedule</h2>
        {loading && <LoadingSpinner message="Loading schedules…" />}
        {error && (
          <p role="alert" style={{ color: 'var(--color-error, #b91c1c)', marginBottom: '0.5rem' }}>
            {error}
          </p>
        )}
        {!loading && !error && schedules.length === 0 && (
          <p style={{ color: 'var(--color-muted, #6b7280)' }}>No schedules available.</p>
        )}
        {!loading && schedules.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {schedules.map((s) => (
              <button
                key={s.id}
                type="button"
                style={selectedSchedule?.id === s.id ? cardSelectedStyle : cardStyle}
                onClick={() => setSelectedSchedule(s)}
                aria-pressed={selectedSchedule?.id === s.id}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedSchedule && (
        <>
          <section style={sectionStyle} aria-label="Start date">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Start date</h2>
            <input
              type="date"
              value={startDate}
              min={todayISO()}
              onChange={(e) => setStartDate(e.target.value.slice(0, 10))}
              style={inputStyle}
              aria-label="Start date"
            />
            {startDate && startDate < todayISO() && (
              <p style={{ fontSize: '0.9rem', color: 'var(--color-error, #b91c1c)', marginTop: '0.25rem' }}>
                Start date cannot be in the past.
              </p>
            )}
          </section>

          <section style={sectionStyle} aria-label="Confirmation">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Confirm</h2>
            <p style={{ marginBottom: '0.5rem' }}>
              Create your solo training from <strong>{selectedSchedule.name}</strong> starting <strong>{startDate}</strong>.
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-muted, #6b7280)', marginBottom: '0.75rem' }}>
              Your cohort will be named: <strong>{cohortName}</strong>
            </p>
            {submitError && (
              <p role="alert" style={{ color: 'var(--color-error, #b91c1c)', marginBottom: '0.5rem' }}>
                {submitError}
              </p>
            )}
            <button
              type="button"
              style={buttonStyle}
              onClick={handleCreate}
              disabled={!canSubmit}
              aria-busy={submitting}
            >
              {submitting ? 'Creating…' : 'Generate schedule'}
            </button>
          </section>
        </>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link to="/play" className="tap-target" style={linkStyle}>
          ← Back to Play
        </Link>
      </p>
    </div>
  );
}
