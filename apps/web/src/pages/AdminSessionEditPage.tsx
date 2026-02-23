import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getSessionById,
  isDataError,
  listRoutines,
  setSessionRoutines,
  updateSession,
} from '@opp/data';
import type { Routine, SessionRoutineInput } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

type RoutineRow = SessionRoutineInput;

/** Edit session: name + session_routines (routine_no, routine dropdown). */
export function AdminSessionEditPage() {
  const { supabase } = useSupabase();
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState('');
  const [routines, setRoutines] = useState<RoutineRow[]>([]);
  const [routineList, setRoutineList] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    Promise.all([
      getSessionById(supabase, id),
      listRoutines(supabase),
    ])
      .then(([data, routinesList]) => {
        setRoutineList(routinesList);
        if (data) {
          setName(data.session.name);
          setRoutines(
            data.routines.map((r) => ({
              routine_no: r.routine_no,
              routine_id: r.routine_id,
            }))
          );
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Failed to load session.');
      })
      .finally(() => setLoading(false));
  }, [supabase, id]);

  useEffect(() => {
    load();
  }, [load]);

  const addRow = () => {
    const nextNo = routines.length ? Math.max(...routines.map((r) => r.routine_no)) + 1 : 1;
    setRoutines((prev) => [...prev, { routine_no: nextNo, routine_id: '' }]);
  };

  const removeRow = (index: number) => {
    setRoutines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof RoutineRow, value: number | string) => {
    setRoutines((prev) => {
      const next = [...prev];
      (next[index] as unknown as Record<string, number | string>)[field] = value;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const invalid = routines.some((r) => r.routine_no < 1 || !r.routine_id);
    if (invalid) {
      setError('Each row must have routine no ≥ 1 and a routine selected.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await updateSession(supabase, id, { name });
      await setSessionRoutines(supabase, id, routines);
      load();
    } catch (err) {
      setError(isDataError(err) ? err.message : 'Failed to save session.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p>Loading…</p>;
  if (!id) return <p>Missing session id.</p>;
  if (notFound) return (<><p><Link to="/admin/sessions">← Back to sessions</Link></p><p role="alert">Session not found.</p></>);
  if (error && !name) return (<><p><Link to="/admin/sessions">← Back to sessions</Link></p><p role="alert" style={{ color: '#c00' }}>{error}</p></>);

  return (
    <div>
      <p>
        <Link to="/admin/sessions">← Back to sessions</Link>
      </p>
      <h1>Edit session</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: '36rem' }}>
        <div style={{ marginBottom: '1rem' }}>
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
            style={{ width: '100%', maxWidth: '20rem', padding: '0.35rem' }}
          />
        </div>

        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Routines</strong> (order, routine)
        </div>
        <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '0.75rem' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'left' }}>No</th>
              <th style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'left' }}>Routine</th>
              <th style={{ border: '1px solid #ccc', padding: '0.35rem' }}></th>
            </tr>
          </thead>
          <tbody>
            {routines.map((row, i) => (
              <tr key={i}>
                <td style={{ border: '1px solid #ccc', padding: '0.25rem' }}>
                  <input
                    type="number"
                    min={1}
                    value={row.routine_no}
                    onChange={(e) => updateRow(i, 'routine_no', parseInt(e.target.value, 10) || 1)}
                    disabled={submitting}
                    style={{ width: '4rem' }}
                  />
                </td>
                <td style={{ border: '1px solid #ccc', padding: '0.25rem' }}>
                  <select
                    value={row.routine_id}
                    onChange={(e) => updateRow(i, 'routine_id', e.target.value)}
                    disabled={submitting}
                    style={{ minWidth: '12rem' }}
                  >
                    <option value="">Select routine</option>
                    {routineList.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
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
