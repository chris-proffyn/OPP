import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  deleteCohort,
  isDataError,
  listCohortMembers,
  listCohorts,
  listPlayersWithoutCohort,
  listSchedules,
} from '@opp/data';
import type { Cohort, Player, Schedule } from '@opp/data';
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

function formatCohortStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** Admin cohorts list: listCohorts, schedule names, member counts, New, Edit, Delete. */
export function AdminCohortsPage() {
  const { supabase } = useSupabase();
  const location = useLocation();
  const bulkAssignAccepted = (location.state as { bulkAssignAccepted?: boolean } | null)?.bulkAssignAccepted;
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [scheduleMap, setScheduleMap] = useState<Record<string, string>>({});
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [awaitingPlayers, setAwaitingPlayers] = useState<Player[]>([]);
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
            list.forEach((c, i) => { counts[c.id] = memberLists[i]?.length ?? 0; });
            setMemberCounts(counts);
          }),
          listPlayersWithoutCohort(supabase).then(setAwaitingPlayers),
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
      {bulkAssignAccepted && (
        <p role="status" style={{ padding: '0.5rem', background: 'var(--color-success-bg, #e6f4ea)', marginBottom: '1rem', borderRadius: '4px' }}>
          Bulk-assigned cohorts have been confirmed.
        </p>
      )}
      <p>
        <Link to="/admin/cohorts/new">New cohort</Link>
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thTdStyle}>Name</th>
            <th style={thTdStyle}>Status</th>
            <th style={thTdStyle}>Level</th>
            <th style={thTdStyle}>Start</th>
            <th style={thTdStyle}>End</th>
            <th style={thTdStyle}>Schedule</th>
            <th style={thTdStyle}>Competitions</th>
            <th style={thTdStyle}>Members</th>
            <th style={thTdStyle}></th>
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => (
            <tr key={c.id}>
              <td style={thTdStyle}>{c.name}</td>
              <td style={thTdStyle}>{formatCohortStatus(c.cohort_status)}</td>
              <td style={thTdStyle}>{c.level}</td>
              <td style={thTdStyle}>{c.start_date}</td>
              <td style={thTdStyle}>{c.end_date}</td>
              <td style={thTdStyle}>{scheduleMap[c.schedule_id] ?? c.schedule_id}</td>
              <td style={thTdStyle}>{c.competitions_enabled !== false ? 'Yes' : 'No'}</td>
              <td style={thTdStyle}>{memberCounts[c.id] ?? 0}</td>
              <td style={thTdStyle}>
                <Link to={`/admin/cohorts/${c.id}`}>Edit</Link>
                {' · '}
                <Link to={`/admin/cohorts/${c.id}/players`}>Players</Link>
                {' · '}
                <Link to={`/admin/cohorts/${c.id}/calendar`}>Calendar</Link>
                {' · '}
                <Link to={`/admin/cohorts/${c.id}/report`}>Report</Link>
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

      <section style={{ marginTop: '2.5rem' }}>
        <h2>Players awaiting cohort assignment</h2>
        <p style={{ marginBottom: '0.75rem' }}>
          <Link to="/admin/cohorts/bulk-assign">Bulk assign</Link>
          <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: 'var(--color-muted, #666)' }}>
            — Assign unassigned players to cohorts in bulk.
          </span>
        </p>
        {awaitingPlayers.length === 0 ? (
          <p style={{ color: 'var(--color-muted, #666)' }}>All players have been assigned to a cohort.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thTdStyle}>Player</th>
                <th style={thTdStyle}>Rating</th>
              </tr>
            </thead>
            <tbody>
              {awaitingPlayers.map((p) => (
                <tr key={p.id}>
                  <td style={thTdStyle}>{p.nickname || p.display_name || p.id}</td>
                  <td style={thTdStyle}>
                    {p.training_rating != null ? p.training_rating : p.player_rating != null ? p.player_rating : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
