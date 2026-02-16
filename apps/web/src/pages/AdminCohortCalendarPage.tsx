import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCohortById, isDataError, listCalendarByCohort } from '@opp/data';
import type { CalendarWithSessionName } from '@opp/data';
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

/** Admin calendar view for a cohort: listCalendarByCohort, table of scheduled_at, day_no, session_no, session name. */
export function AdminCohortCalendarPage() {
  const { supabase } = useSupabase();
  const { id } = useParams<{ id: string }>();
  const [cohortName, setCohortName] = useState<string | null>(null);
  const [entries, setEntries] = useState<CalendarWithSessionName[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

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

  useEffect(() => {
    load();
  }, [load]);

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
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td style={thTdStyle}>{new Date(e.scheduled_at).toLocaleString()}</td>
                <td style={thTdStyle}>{e.day_no}</td>
                <td style={thTdStyle}>{e.session_no}</td>
                <td style={thTdStyle}>{e.session_name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
