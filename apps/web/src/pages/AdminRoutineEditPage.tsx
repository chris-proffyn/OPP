import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getRoutineById,
  isDataError,
  setRoutineSteps,
  updateRoutine,
} from '@opp/data';
import type { RoutineStepInput } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

type StepRow = RoutineStepInput;

/** Edit routine: name, description, routine_steps (step_no, target). */
export function AdminRoutineEditPage() {
  const { supabase } = useSupabase();
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<StepRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    getRoutineById(supabase, id)
      .then((data) => {
        if (data) {
          setName(data.routine.name);
          setDescription(data.routine.description ?? '');
          setSteps(
            data.steps.map((s) => ({
              step_no: s.step_no,
              target: s.target,
            }))
          );
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Failed to load routine.');
      })
      .finally(() => setLoading(false));
  }, [supabase, id]);

  useEffect(() => {
    load();
  }, [load]);

  const addRow = () => {
    const nextNo = steps.length ? Math.max(...steps.map((s) => s.step_no)) + 1 : 1;
    setSteps((prev) => [...prev, { step_no: nextNo, target: '' }]);
  };

  const removeRow = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof StepRow, value: number | string) => {
    setSteps((prev) => {
      const next = [...prev];
      (next[index] as Record<string, number | string>)[field] = value;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const invalid = steps.some((s) => s.step_no < 1 || !s.target.trim());
    if (invalid) {
      setError('Each step must have step no ≥ 1 and a non-empty target.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await updateRoutine(supabase, id, { name, description: description.trim() || null });
      await setRoutineSteps(supabase, id, steps.map((s) => ({ step_no: s.step_no, target: s.target.trim() })));
      load();
    } catch (err) {
      setError(isDataError(err) ? err.message : 'Failed to save routine.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p>Loading…</p>;
  if (!id) return <p>Missing routine id.</p>;
  if (notFound) return (<><p><Link to="/admin/routines">← Back to routines</Link></p><p role="alert">Routine not found.</p></>);
  if (error && !name) return (<><p><Link to="/admin/routines">← Back to routines</Link></p><p role="alert" style={{ color: '#c00' }}>{error}</p></>);

  return (
    <div>
      <p>
        <Link to="/admin/routines">← Back to routines</Link>
      </p>
      <h1>Edit routine</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: '36rem' }}>
        <div style={{ marginBottom: '1rem' }}>
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
            style={{ width: '100%', maxWidth: '20rem', padding: '0.35rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="routine-desc" style={{ display: 'block', marginBottom: '0.25rem' }}>
            Description (optional)
          </label>
          <textarea
            id="routine-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            rows={3}
            style={{ width: '100%', maxWidth: '24rem', padding: '0.35rem' }}
          />
        </div>

        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Steps</strong> (step no, target e.g. S20, D16)
        </div>
        <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '0.75rem' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'left' }}>No</th>
              <th style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'left' }}>Target</th>
              <th style={{ border: '1px solid #ccc', padding: '0.35rem' }}></th>
            </tr>
          </thead>
          <tbody>
            {steps.map((row, i) => (
              <tr key={i}>
                <td style={{ border: '1px solid #ccc', padding: '0.25rem' }}>
                  <input
                    type="number"
                    min={1}
                    value={row.step_no}
                    onChange={(e) => updateStep(i, 'step_no', parseInt(e.target.value, 10) || 1)}
                    disabled={submitting}
                    style={{ width: '4rem' }}
                  />
                </td>
                <td style={{ border: '1px solid #ccc', padding: '0.25rem' }}>
                  <input
                    type="text"
                    value={row.target}
                    onChange={(e) => updateStep(i, 'target', e.target.value)}
                    disabled={submitting}
                    placeholder="e.g. S20, D16"
                    style={{ width: '8rem' }}
                  />
                </td>
                <td style={{ border: '1px solid #ccc', padding: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={submitting}
                    style={{ background: 'none', border: 'none', color: '#c00', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={addRow} disabled={submitting} style={{ marginBottom: '1rem' }}>
          Add row
        </button>

        {error && <p role="alert" style={{ color: '#c00', marginBottom: '0.5rem' }}>{error}</p>}
        <div>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
