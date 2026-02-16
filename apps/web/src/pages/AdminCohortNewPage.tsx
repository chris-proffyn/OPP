import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createCohort, isDataError, listSchedules } from '@opp/data';
import type { Schedule } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

/** New cohort: form name, level, start_date, end_date, schedule; validate end_date >= start_date; createCohort; redirect to edit. */
export function AdminCohortNewPage() {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [level, setLevel] = useState<number>(20);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSchedules(supabase).then(setSchedules).catch(() => setSchedules([]));
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError('Start date and end date are required.');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('End date must be on or after start date.');
      return;
    }
    if (!scheduleId) {
      setError('Please select a schedule.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const cohort = await createCohort(supabase, {
        name,
        level,
        start_date: startDate,
        end_date: endDate,
        schedule_id: scheduleId,
      });
      navigate(`/admin/cohorts/${cohort.id}`);
    } catch (err) {
      setError(isDataError(err) ? err.message : 'Failed to create cohort.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1>New cohort</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: '24rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="cohort-name" style={{ display: 'block', marginBottom: '0.25rem' }}>Name</label>
          <input
            id="cohort-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={submitting}
            style={{ width: '100%', padding: '0.35rem' }}
          />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="cohort-level" style={{ display: 'block', marginBottom: '0.25rem' }}>Level (decade, e.g. 20)</label>
          <input
            id="cohort-level"
            type="number"
            min={0}
            max={90}
            value={level}
            onChange={(e) => setLevel(parseInt(e.target.value, 10) || 0)}
            disabled={submitting}
            style={{ width: '6rem', padding: '0.35rem' }}
          />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="cohort-start" style={{ display: 'block', marginBottom: '0.25rem' }}>Start date</label>
          <input
            id="cohort-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            disabled={submitting}
            style={{ padding: '0.35rem' }}
          />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="cohort-end" style={{ display: 'block', marginBottom: '0.25rem' }}>End date</label>
          <input
            id="cohort-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            disabled={submitting}
            style={{ padding: '0.35rem' }}
          />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="cohort-schedule" style={{ display: 'block', marginBottom: '0.25rem' }}>Schedule</label>
          <select
            id="cohort-schedule"
            value={scheduleId}
            onChange={(e) => setScheduleId(e.target.value)}
            required
            disabled={submitting}
            style={{ minWidth: '14rem', padding: '0.35rem' }}
          >
            <option value="">Select schedule</option>
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        {error && <p role="alert" style={{ color: '#c00', marginBottom: '0.5rem' }}>{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create'}
        </button>
        {' '}
        <Link to="/admin/cohorts">Cancel</Link>
      </form>
    </div>
  );
}
