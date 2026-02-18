import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  isDataError,
  listLevelRequirements,
  ROUTINE_TYPES,
  updateLevelRequirement,
} from '@opp/data';
import type { LevelRequirement, RoutineType, UpdateLevelRequirementPayload } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

/** Edit level requirement: load from list by id, form min_level, routine_type, tgt_hits, darts_allowed. */
export function AdminLevelRequirementEditPage() {
  const { supabase } = useSupabase();
  const { id } = useParams<{ id: string }>();
  const [row, setRow] = useState<LevelRequirement | null>(null);
  const [minLevel, setMinLevel] = useState<number>(0);
  const [routineType, setRoutineType] = useState<RoutineType>('SS');
  const [tgtHits, setTgtHits] = useState<number>(0);
  const [dartsAllowed, setDartsAllowed] = useState<number>(9);
  const [attemptCount, setAttemptCount] = useState<number>(9);
  const [allowedThrowsPerAttempt, setAllowedThrowsPerAttempt] = useState<number>(9);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    listLevelRequirements(supabase)
      .then((list) => {
        const found = list.find((r) => r.id === id) ?? null;
        setRow(found);
        if (found) {
          setMinLevel(found.min_level);
          setRoutineType(found.routine_type);
          setTgtHits(found.tgt_hits);
          setDartsAllowed(found.darts_allowed);
          setAttemptCount(found.attempt_count ?? 9);
          setAllowedThrowsPerAttempt(found.allowed_throws_per_attempt ?? 9);
        }
      })
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Failed to load.');
      })
      .finally(() => setLoading(false));
  }, [supabase, id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (routineType === 'C' && (attemptCount < 1 || allowedThrowsPerAttempt < 1)) {
      setError('For checkout (C), attempt_count and allowed_throws_per_attempt must be ≥ 1.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload: UpdateLevelRequirementPayload = {
        min_level: minLevel,
        routine_type: routineType,
        tgt_hits: tgtHits,
        darts_allowed: dartsAllowed,
      };
      if (routineType === 'C') {
        payload.attempt_count = attemptCount;
        payload.allowed_throws_per_attempt = allowedThrowsPerAttempt;
      }
      await updateLevelRequirement(supabase, id, payload);
      load();
    } catch (err) {
      setError(isDataError(err) ? err.message : 'Failed to save.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p>Loading…</p>;
  if (!id) return <p>Missing id.</p>;
  if (!row) return (<><p><Link to="/admin/level-requirements">← Back to level requirements</Link></p><p role="alert">{error || 'Level requirement not found.'}</p></>);

  return (
    <div>
      <p>
        <Link to="/admin/level-requirements">← Back to level requirements</Link>
      </p>
      <h1>Edit level requirement</h1>
      <p style={{ marginBottom: '0.75rem', color: '#666', fontSize: '0.9rem' }}>
        One row per (min_level, routine_type). min_level is typically 0, 10, 20, …, 90.
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
          <label htmlFor="lr-routine-type" style={{ display: 'block', marginBottom: '0.25rem' }}>
            routine_type
          </label>
          <select
            id="lr-routine-type"
            value={routineType}
            onChange={(e) => setRoutineType(e.target.value as RoutineType)}
            disabled={submitting}
            style={{ padding: '0.35rem', minWidth: '6rem' }}
          >
            {ROUTINE_TYPES.map((rt) => (
              <option key={rt} value={rt}>{rt}</option>
            ))}
          </select>
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
        {routineType === 'C' && (
          <>
            <div style={{ marginBottom: '0.75rem' }}>
              <label htmlFor="lr-attempt-count" style={{ display: 'block', marginBottom: '0.25rem' }}>
                attempt_count (checkout)
              </label>
              <input
                id="lr-attempt-count"
                type="number"
                min={1}
                max={99}
                value={attemptCount}
                onChange={(e) => setAttemptCount(parseInt(e.target.value, 10) || 1)}
                required
                disabled={submitting}
                style={{ width: '5rem', padding: '0.35rem' }}
              />
              <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#666' }}>attempts per step</span>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label htmlFor="lr-throws-per-attempt" style={{ display: 'block', marginBottom: '0.25rem' }}>
                allowed_throws_per_attempt (checkout)
              </label>
              <input
                id="lr-throws-per-attempt"
                type="number"
                min={1}
                max={9}
                value={allowedThrowsPerAttempt}
                onChange={(e) => setAllowedThrowsPerAttempt(parseInt(e.target.value, 10) || 1)}
                required
                disabled={submitting}
                style={{ width: '5rem', padding: '0.35rem' }}
              />
              <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#666' }}>darts per attempt</span>
            </div>
          </>
        )}
        {error && <p role="alert" style={{ color: '#c00', marginBottom: '0.5rem' }}>{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  );
}
