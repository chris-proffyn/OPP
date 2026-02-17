import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getCohortById,
  isDataError,
  listCalendarByCohort,
  listSessions,
  resetSessionForCalendar,
  updateCalendarEntry,
} from '@opp/data';
import type { CalendarWithSessionName, Session } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

const tableStyle: React.CSSProperties = {
  borderCollapse: 'collapse',
  width: '100%',
  maxWidth: '44rem',
};
const thTdStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '0.5rem 0.75rem',
  textAlign: 'left',
};

function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

/** Admin calendar view for a cohort: listCalendarByCohort, table of scheduled_at, day_no, session_no, session name. Edit per entry. */
export function AdminCohortCalendarPage() {
  const { supabase } = useSupabase();
  const { id } = useParams<{ id: string }>();
  const [cohortName, setCohortName] = useState<string | null>(null);
  const [entries, setEntries] = useState<CalendarWithSessionName[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [editSessionId, setEditSessionId] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    getCohortById(supabase, id)
      .then((data) => {
        if (data) {
          setCohortName(data.cohort.name);
          return listCalendarByCohort(supabase, id);
        }
        setNotFound(true);
        return [];
      })
      .then((list) => {
        if (Array.isArray(list)) setEntries(list);
      })
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Failed to load calendar.');
      })
      .finally(() => setLoading(false));
  }, [supabase, id]);

  const handleResetSession = useCallback(
    async (calendarId: string) => {
      if (
        !window.confirm(
          'Reset this session? This will remove all session runs, routine scores and dart scores for this session. It cannot be undone.'
        )
      ) {
        return;
      }
      setResetError(null);
      setResettingId(calendarId);
      try {
        await resetSessionForCalendar(supabase, calendarId);
        await load();
      } catch (err) {
        setResetError(isDataError(err) ? err.message : 'Failed to reset session.');
      } finally {
        setResettingId(null);
      }
    },
    [supabase, load]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    listSessions(supabase).then(setSessions).catch(() => setSessions([]));
  }, [supabase]);

  const startEdit = useCallback((e: CalendarWithSessionName) => {
    setEditingId(e.id);
    setEditScheduledAt(toDateTimeLocal(e.scheduled_at));
    setEditSessionId(e.session_id);
    setEditError(null);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingId) return;
    setEditError(null);
    setSavingId(editingId);
    try {
      await updateCalendarEntry(supabase, editingId, {
        scheduled_at: new Date(editScheduledAt).toISOString(),
        session_id: editSessionId,
      });
      setEditingId(null);
      await load();
    } catch (err) {
      setEditError(isDataError(err) ? err.message : 'Failed to update calendar entry.');
    } finally {
      setSavingId(null);
    }
  }, [supabase, editingId, editScheduledAt, editSessionId, load]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditError(null);
  }, []);

  if (loading) return <p>Loading calendar…</p>;
  if (!id) return <p>Missing cohort id.</p>;
  if (notFound) return (<><p><Link to="/admin/cohorts">← Back to cohorts</Link></p><p role="alert">Cohort not found.</p></>);
  if (error) return (<><p><Link to="/admin/cohorts">← Back to cohorts</Link></p><p role="alert" style={{ color: '#c00' }}>{error}</p></>);

  return (
    <div>
      <p>
        <Link to="/admin/cohorts">← Back to cohorts</Link>
        {' · '}
        <Link to={`/admin/cohorts/${id}`}>Edit cohort</Link>
      </p>
      <h1>Calendar{cohortName ? `: ${cohortName}` : ''}</h1>
      {(resetError || editError) && (
        <p role="alert" style={{ color: 'var(--color-error, #c00)', marginBottom: '0.5rem' }}>
          {resetError ?? editError}
        </p>
      )}
      {entries.length === 0 ? (
        <p>No calendar entries yet. Generate the calendar from the cohort edit page.</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thTdStyle}>Scheduled at</th>
              <th style={thTdStyle}>Day</th>
              <th style={thTdStyle}>Session no</th>
              <th style={thTdStyle}>Session</th>
              <th style={thTdStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                {editingId === e.id ? (
                    <>
                      <td style={thTdStyle}>
                        <input
                          type="datetime-local"
                          value={editScheduledAt}
                          onChange={(ev) => setEditScheduledAt(ev.target.value)}
                          style={{ padding: '0.35rem', minHeight: 'var(--tap-min, 44px)' }}
                          aria-label="Scheduled at"
                        />
                      </td>
                      <td style={thTdStyle}>{e.day_no}</td>
                      <td style={thTdStyle}>{e.session_no}</td>
                      <td style={thTdStyle}>
                        <select
                          value={editSessionId}
                          onChange={(ev) => setEditSessionId(ev.target.value)}
                          style={{ padding: '0.35rem', minHeight: 'var(--tap-min, 44px)' }}
                          aria-label="Session"
                        >
                          {sessions.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </td>
                      <td style={thTdStyle}>
                        <button type="button" onClick={handleSaveEdit} disabled={savingId === e.id} style={{ marginRight: '0.5rem', minHeight: 'var(--tap-min, 44px)', padding: '0.25rem 0.5rem', cursor: savingId === e.id ? 'wait' : 'pointer' }}>
                          {savingId === e.id ? 'Saving…' : 'Save'}
                        </button>
                        <button type="button" onClick={cancelEdit} disabled={savingId === e.id} style={{ minHeight: 'var(--tap-min, 44px)', padding: '0.25rem 0.5rem', cursor: 'pointer' }}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={thTdStyle}>{new Date(e.scheduled_at).toLocaleString()}</td>
                      <td style={thTdStyle}>{e.day_no}</td>
                      <td style={thTdStyle}>{e.session_no}</td>
                      <td style={thTdStyle}>{e.session_name ?? '—'}</td>
                      <td style={thTdStyle}>
                        <button type="button" onClick={() => startEdit(e)} style={{ marginRight: '0.5rem', minHeight: 'var(--tap-min, 44px)', padding: '0.25rem 0.5rem', cursor: 'pointer' }}>Edit</button>
                        <button
                          type="button"
                          onClick={() => handleResetSession(e.id)}
                          disabled={resettingId === e.id}
                          style={{ minHeight: 'var(--tap-min, 44px)', padding: '0.25rem 0.5rem', cursor: resettingId === e.id ? 'wait' : 'pointer' }}
                        >
                          {resettingId === e.id ? 'Resetting…' : 'Reset session'}
                        </button>
                      </td>
                    </>
                  )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
