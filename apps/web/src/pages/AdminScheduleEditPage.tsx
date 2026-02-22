import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getScheduleById,
  isDataError,
  listSessions,
  setScheduleEntries,
  updateSchedule,
} from '@opp/data';
import type { ScheduleEntryInput, Session } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

type EntryRow = ScheduleEntryInput;

/** Edit schedule: name + schedule_entries (day_no, session_no, session dropdown). */
export function AdminScheduleEditPage() {
  const { supabase } = useSupabase();
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState('');
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
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
      getScheduleById(supabase, id),
      listSessions(supabase),
    ])
      .then(([data, sessionList]) => {
        setSessions(sessionList);
        if (data) {
          setName(data.schedule.name);
          setEntries(
            data.entries.map((e) => ({
              day_no: e.day_no,
              session_no: e.session_no,
              session_id: e.session_id,
            }))
          );
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Failed to load schedule.');
      })
      .finally(() => setLoading(false));
  }, [supabase, id]);

  useEffect(() => {
    load();
  }, [load]);

  const addRow = () => {
    const nextDay = entries.length ? Math.max(...entries.map((e) => e.day_no)) : 1;
    const nextSession = entries.filter((e) => e.day_no === nextDay).length + 1;
    setEntries((prev) => [...prev, { day_no: nextDay, session_no: nextSession, session_id: '' }]);
  };

  const removeRow = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof EntryRow, value: number | string) => {
    setEntries((prev) => {
      const next = [...prev];
      (next[index] as Record<string, number | string>)[field] = value;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const invalid = entries.some(
      (e) => e.day_no < 1 || e.session_no < 1 || !e.session_id
    );
    if (invalid) {
      setError('Each entry must have day no ≥ 1, session no ≥ 1, and a session selected.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await updateSchedule(supabase, id, { name });
      await setScheduleEntries(supabase, id, entries);
      load();
    } catch (err) {
      setError(isDataError(err) ? err.message : 'Failed to save schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p>Loading…</p>;
  if (!id) return <p>Missing schedule id.</p>;
  if (notFound) return (<><p><Link to="/admin/schedules">← Back to schedules</Link></p><p role="alert">Schedule not found.</p></>);
  if (error && !name) return (<><p><Link to="/admin/schedules">← Back to schedules</Link></p><p role="alert" style={{ color: '#c00' }}>{error}</p></>);

  return (
    <div>
      <p>
        <Link to="/admin/schedules">← Back to schedules</Link>
      </p>
      <h1>Edit schedule</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: '36rem' }}>
        <div style={{ marginBottom: '1rem' }}>
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
            style={{ width: '100%', maxWidth: '20rem', padding: '0.35rem' }}
          />
        </div>

        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Entries</strong> (day no, session no, session)
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-muted, #525252)', marginBottom: '0.5rem' }}>
          ITA is no longer part of schedules; players complete ITA from the home screen.
        </p>
        <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '0.75rem' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'left' }}>Day</th>
              <th style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'left' }}>Session no</th>
              <th style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'left' }}>Session</th>
              <th style={{ border: '1px solid #ccc', padding: '0.35rem' }}></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((row, i) => (
              <tr key={i}>
                <td style={{ border: '1px solid #ccc', padding: '0.25rem' }}>
                  <input
                    type="number"
                    min={1}
                    value={row.day_no}
                    onChange={(e) => updateEntry(i, 'day_no', parseInt(e.target.value, 10) || 1)}
                    disabled={submitting}
                    style={{ width: '4rem' }}
                  />
                </td>
                <td style={{ border: '1px solid #ccc', padding: '0.25rem' }}>
                  <input
                    type="number"
                    min={1}
                    value={row.session_no}
                    onChange={(e) => updateEntry(i, 'session_no', parseInt(e.target.value, 10) || 1)}
                    disabled={submitting}
                    style={{ width: '4rem' }}
                  />
                </td>
                <td style={{ border: '1px solid #ccc', padding: '0.25rem' }}>
                  <select
                    value={row.session_id}
                    onChange={(e) => updateEntry(i, 'session_id', e.target.value)}
                    disabled={submitting}
                    style={{ minWidth: '12rem' }}
                  >
                    <option value="">Select session</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
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
