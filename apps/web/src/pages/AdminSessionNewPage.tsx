import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createSession, isDataError } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

/** New session: form name, submit createSession, redirect to edit. */
export function AdminSessionNewPage() {
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
      const session = await createSession(supabase, { name });
      navigate(`/admin/sessions/${session.id}`);
    } catch (err) {
      setError(isDataError(err) ? err.message : 'Failed to create session.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1>New session</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: '20rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="session-name" style={{ display: 'block', marginBottom: '0.25rem' }}>
            Name
          </label>
          <input
            id="session-name"
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
        <Link to="/admin/sessions">Cancel</Link>
      </form>
    </div>
  );
}
