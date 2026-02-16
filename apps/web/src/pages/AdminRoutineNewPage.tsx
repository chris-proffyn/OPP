import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createRoutine, isDataError } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

/** New routine: form name, description (optional), submit createRoutine, redirect to edit. */
export function AdminRoutineNewPage() {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const routine = await createRoutine(supabase, {
        name,
        description: description.trim() || undefined,
      });
      navigate(`/admin/routines/${routine.id}`);
    } catch (err) {
      setError(isDataError(err) ? err.message : 'Failed to create routine.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1>New routine</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: '24rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="routine-name" style={{ display: 'block', marginBottom: '0.25rem' }}>
            Name
          </label>
          <input
            id="routine-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={submitting}
            style={{ width: '100%', padding: '0.35rem' }}
          />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="routine-desc" style={{ display: 'block', marginBottom: '0.25rem' }}>
            Description (optional)
          </label>
          <textarea
            id="routine-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            rows={3}
            style={{ width: '100%', padding: '0.35rem' }}
          />
        </div>
        {error && <p role="alert" style={{ color: '#c00', marginBottom: '0.5rem' }}>{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create'}
        </button>
        {' '}
        <Link to="/admin/routines">Cancel</Link>
      </form>
    </div>
  );
}
