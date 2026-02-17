/**
 * P7 — Admin new competition. Form: name, competition_type, cohort_id, scheduled_at, format_legs, format_target.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createCompetition, listCohorts, isDataError } from '@opp/data';
import type { Cohort } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

const COMPETITION_TYPES = ['competition_day', 'finals_night'] as const;

export function AdminCompetitionNewPage() {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [competitionType, setCompetitionType] = useState<'competition_day' | 'finals_night'>('competition_day');
  const [cohortId, setCohortId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [formatLegs, setFormatLegs] = useState('');
  const [formatTarget, setFormatTarget] = useState('');
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCohorts(supabase).then(setCohorts).catch(() => setCohorts([]));
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const comp = await createCompetition(supabase, {
        name: name.trim(),
        competition_type: competitionType,
        cohort_id: cohortId || null,
        scheduled_at: scheduledAt || null,
        format_legs: formatLegs ? parseInt(formatLegs, 10) : null,
        format_target: formatTarget ? parseInt(formatTarget, 10) : null,
      });
      navigate(`/admin/competitions/${comp.id}`);
    } catch (err) {
      setError(isDataError(err) ? err.message : 'Failed to create competition.');
    } finally {
      setSubmitting(false);
    }
  };

  const blockStyle = { marginBottom: '0.75rem' };
  const labelBlock = { display: 'block' as const, marginBottom: '0.25rem' };
  const inputW = { width: '100%', maxWidth: '24rem', padding: '0.35rem' };

  return (
    <div>
      <h1>New competition</h1>
      <form onSubmit={handleSubmit}>
        <div style={blockStyle}>
          <label htmlFor="comp-name" style={labelBlock}>Name</label>
          <input
            id="comp-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={submitting}
            style={inputW}
          />
        </div>
        <div style={blockStyle}>
          <label htmlFor="comp-type" style={labelBlock}>Type</label>
          <select
            id="comp-type"
            value={competitionType}
            onChange={(e) => setCompetitionType(e.target.value as 'competition_day' | 'finals_night')}
            disabled={submitting}
            style={inputW}
          >
            {COMPETITION_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div style={blockStyle}>
          <label htmlFor="comp-cohort" style={labelBlock}>Cohort (optional)</label>
          <select
            id="comp-cohort"
            value={cohortId}
            onChange={(e) => setCohortId(e.target.value)}
            disabled={submitting}
            style={inputW}
          >
            <option value="">None</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div style={blockStyle}>
          <label htmlFor="comp-scheduled" style={labelBlock}>Scheduled at (optional)</label>
          <input
            id="comp-scheduled"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            disabled={submitting}
            style={inputW}
          />
        </div>
        <div style={blockStyle}>
          <label htmlFor="comp-legs" style={labelBlock}>Format legs (e.g. 5 for best-of-5, optional)</label>
          <input
            id="comp-legs"
            type="number"
            min={5}
            value={formatLegs}
            onChange={(e) => setFormatLegs(e.target.value)}
            disabled={submitting}
            style={{ ...inputW, width: '6rem' }}
          />
        </div>
        <div style={blockStyle}>
          <label htmlFor="comp-target" style={labelBlock}>Format target (e.g. 501, optional)</label>
          <input
            id="comp-target"
            type="number"
            min={1}
            value={formatTarget}
            onChange={(e) => setFormatTarget(e.target.value)}
            disabled={submitting}
            style={{ ...inputW, width: '6rem' }}
          />
        </div>
        {error && <p role="alert" style={{ color: '#c00', marginBottom: '0.5rem' }}>{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create'}
        </button>
        {' '}
        <Link to="/admin/competitions">Cancel</Link>
      </form>
    </div>
  );
}
