import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  deleteCohort,
  isDataError,
  listCohortMembers,
  listCohorts,
  listSchedules,
} from '@opp/data';
import type { Cohort, Schedule } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

const tableStyle: React.CSSProperties = {
  borderCollapse: 'collapse',
  width: '100%',
  maxWidth: '50rem',
};
const thTdStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '0.5rem 0.75rem',
  textAlign: 'left',
};

/** Admin cohorts list: listCohorts, schedule names, member counts, New, Edit, Delete. */
export function AdminCohortsPage() {
  const { supabase } = useSupabase();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [scheduleMap, setScheduleMap] = useState<Record<string, string>>({});
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    listCohorts(supabase)
      .then((list) => {
        setCohorts(list);
        return list;
      })
      .then((list) => {
        return Promise.all([
          listSchedules(supabase).then((schedules: Schedule[]) => {
            const map: Record<string, string> = {};
            schedules.forEach((s) => { map[s.id] = s.name; });
            setScheduleMap(map);
          }),
          Promise.all(list.map((c) => listCohortMembers(supabase, c.id))).then((memberLists) => {
            const counts: Record<string, number> = {};
            list.forEach((c, i) => { counts[c.id] = memberLists[i].length; });
            setMemberCounts(counts);
          }),
        ]);
      })
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Failed to load cohorts.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [supabase]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete cohort “${name}”? This will remove all members, calendar entries, and player calendar rows.`)) return;
    try {
      await deleteCohort(supabase, id);
      load();
    } catch (err) {
      alert(isDataError(err) ? err.message : 'Failed to delete cohort.');
    }
  };

  if (loading) return <p>Loading cohorts…</p>;
  if (error) return <p role="alert" style={{ color: '#c00' }}>{error}</p>;

  return (
    <div>
      <h1>Cohorts</h1>
      <p>
        <Link to="/admin/cohorts/new">New cohort</Link>
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thTdStyle}>Name</th>
            <th style={thTdStyle}>Level</th>
            <th style={thTdStyle}>Start</th>
            <th style={thTdStyle}>End</th>
            <th style={thTdStyle}>Schedule</th>
            <th style={thTdStyle}>Members</th>
            <th style={thTdStyle}></th>
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => (
            <tr key={c.id}>
              <td style={thTdStyle}>{c.name}</td>
              <td style={thTdStyle}>{c.level}</td>
              <td style={thTdStyle}>{c.start_date}</td>
              <td style={thTdStyle}>{c.end_date}</td>
              <td style={thTdStyle}>{scheduleMap[c.schedule_id] ?? c.schedule_id}</td>
              <td style={thTdStyle}>{memberCounts[c.id] ?? 0}</td>
              <td style={thTdStyle}>
                <Link to={`/admin/cohorts/${c.id}`}>Edit</Link>
                {' · '}
                <Link to={`/admin/cohorts/${c.id}/calendar`}>Calendar</Link>
                {' · '}
                <button
                  type="button"
                  onClick={() => handleDelete(c.id, c.name)}
                  style={{ background: 'none', border: 'none', color: '#c00', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
