import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createSchedule, isDataError } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

/** New schedule: form name, submit createSchedule, redirect to edit. */
export function AdminScheduleNewPage() {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const schedule = await createSchedule(supabase, { name });
      navigate(`/admin/schedules/${schedule.id}`);
    } catch (err) {
      setError(isDataError(err) ? err.message : 'Failed to create schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1>New schedule</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: '20rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="schedule-name" style={{ display: 'block', marginBottom: '0.25rem' }}>
            Name
          </label>
          <input
            id="schedule-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={submitting}
            style={{ width: '100%', padding: '0.35rem' }}
          />
        </div>
        {error && <p role="alert" style={{ color: '#c00', marginBottom: '0.5rem' }}>{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create'}
        </button>
        {' '}
        <Link to="/admin/schedules">Cancel</Link>
      </form>
    </div>
  );
}
