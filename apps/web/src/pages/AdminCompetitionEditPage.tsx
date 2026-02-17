/**
 * P7 — Admin edit competition. Same form as new; updateCompetition.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getCompetitionById,
  updateCompetition,
  listCohorts,
  isDataError,
} from '@opp/data';
import type { Cohort } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

const COMPETITION_TYPES = ['competition_day', 'finals_night'] as const;

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${h}:${min}`;
  } catch {
    return '';
  }
}

export function AdminCompetitionEditPage() {
  const { supabase } = useSupabase();
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState('');
  const [competitionType, setCompetitionType] = useState<'competition_day' | 'finals_night'>('competition_day');
  const [cohortId, setCohortId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [formatLegs, setFormatLegs] = useState('');
  const [formatTarget, setFormatTarget] = useState('');
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    Promise.all([getCompetitionById(supabase, id), listCohorts(supabase)])
      .then(([comp, cohortList]) => {
        setCohorts(cohortList);
        if (comp) {
          setName(comp.name);
          setCompetitionType(comp.competition_type);
          setCohortId(comp.cohort_id ?? '');
          setScheduledAt(toDatetimeLocal(comp.scheduled_at));
          setFormatLegs(comp.format_legs != null ? String(comp.format_legs) : '');
          setFormatTarget(comp.format_target != null ? String(comp.format_target) : '');
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Failed to load competition.');
      })
      .finally(() => setLoading(false));
  }, [supabase, id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !name.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      await updateCompetition(supabase, id, {
        name: name.trim(),
        competition_type: competitionType,
        cohort_id: cohortId || null,
        scheduled_at: scheduledAt || null,
        format_legs: formatLegs ? parseInt(formatLegs, 10) : null,
        format_target: formatTarget ? parseInt(formatTarget, 10) : null,
      });
      load();
    } catch (err) {
      setError(isDataError(err) ? err.message : 'Failed to save competition.');
    } finally {
      setSubmitting(false);
    }
  };

  const blockStyle = { marginBottom: '0.75rem' };
  const labelBlock = { display: 'block' as const, marginBottom: '0.25rem' };
  const inputW = { width: '100%', maxWidth: '24rem', padding: '0.35rem' };

  if (loading) return <p>Loading…</p>;
  if (notFound) return <p>Competition not found.</p>;

  return (
    <div>
      <h1>Edit competition</h1>
      <p><Link to={`/admin/competitions/${id}`}>View</Link> · <Link to="/admin/competitions">Back to list</Link></p>
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
          <label htmlFor="comp-legs" style={labelBlock}>Format legs (optional)</label>
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
          <label htmlFor="comp-target" style={labelBlock}>Format target (optional)</label>
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
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  );
}
