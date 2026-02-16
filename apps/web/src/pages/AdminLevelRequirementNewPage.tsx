import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createLevelRequirement, isDataError } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

/** New level requirement: min_level, tgt_hits, darts_allowed. CONFLICT = min_level already exists. */
export function AdminLevelRequirementNewPage() {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [minLevel, setMinLevel] = useState<number>(0);
  const [tgtHits, setTgtHits] = useState<number>(0);
  const [dartsAllowed, setDartsAllowed] = useState<number>(9);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const row = await createLevelRequirement(supabase, {
        min_level: minLevel,
        tgt_hits: tgtHits,
        darts_allowed: dartsAllowed,
      });
      navigate(`/admin/level-requirements/${row.id}`);
    } catch (err) {
      setError(isDataError(err) ? err.message : 'Failed to create level requirement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1>New level requirement</h1>
      <p style={{ marginBottom: '0.75rem', color: '#666', fontSize: '0.9rem' }}>
        min_level is typically 0, 10, 20, …, 90 (one per decade).
      </p>
      <form onSubmit={handleSubmit} style={{ maxWidth: '16rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="lr-min-level" style={{ display: 'block', marginBottom: '0.25rem' }}>
            min_level
          </label>
          <input
            id="lr-min-level"
            type="number"
            min={0}
            value={minLevel}
            onChange={(e) => setMinLevel(parseInt(e.target.value, 10) || 0)}
            required
            disabled={submitting}
            style={{ width: '5rem', padding: '0.35rem' }}
          />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="lr-tgt-hits" style={{ display: 'block', marginBottom: '0.25rem' }}>
            tgt_hits
          </label>
          <input
            id="lr-tgt-hits"
            type="number"
            min={0}
            value={tgtHits}
            onChange={(e) => setTgtHits(parseInt(e.target.value, 10) || 0)}
            required
            disabled={submitting}
            style={{ width: '5rem', padding: '0.35rem' }}
          />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="lr-darts" style={{ display: 'block', marginBottom: '0.25rem' }}>
            darts_allowed
          </label>
          <input
            id="lr-darts"
            type="number"
            min={1}
            value={dartsAllowed}
            onChange={(e) => setDartsAllowed(parseInt(e.target.value, 10) || 1)}
            required
            disabled={submitting}
            style={{ width: '5rem', padding: '0.35rem' }}
          />
        </div>
        {error && <p role="alert" style={{ color: '#c00', marginBottom: '0.5rem' }}>{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create'}
        </button>
        {' '}
        <Link to="/admin/level-requirements">Cancel</Link>
      </form>
    </div>
  );
}
