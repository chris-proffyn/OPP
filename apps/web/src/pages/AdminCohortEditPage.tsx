import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addCohortMember,
  generateCalendarForCohort,
  getCohortById,
  isDataError,
  listCalendarByCohort,
  listCohortMembers,
  listPlayers,
  listSchedules,
  removeCohortMember,
  updateCohort,
} from '@opp/data';
import type { CohortMemberWithPlayer, Player, Schedule } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

/** Edit cohort: name, level, dates, schedule; members (list, add, remove); Generate calendar. */
export function AdminCohortEditPage() {
  const { supabase } = useSupabase();
  const { id } = useParams<{ id: string }>();
  const [cohort, setCohort] = useState<{ cohort: { id: string; name: string; level: number; start_date: string; end_date: string; schedule_id: string; competitions_enabled?: boolean }; schedule_name: string | null; member_count: number } | null>(null);
  const [members, setMembers] = useState<CohortMemberWithPlayer[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState('');
  const [level, setLevel] = useState(20);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [competitionsEnabled, setCompetitionsEnabled] = useState(true);
  const [addPlayerId, setAddPlayerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [genCalendarLoading, setGenCalendarLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    Promise.all([
      getCohortById(supabase, id),
      listCohortMembers(supabase, id),
      listSchedules(supabase),
      listPlayers(supabase),
    ])
      .then(([cohortData, memberList, scheduleList, playerList]) => {
        setSchedules(scheduleList);
        setPlayers(playerList);
        if (cohortData) {
          setCohort(cohortData);
          setName(cohortData.cohort.name);
          setLevel(cohortData.cohort.level);
          setStartDate(cohortData.cohort.start_date);
          setEndDate(cohortData.cohort.end_date);
          setScheduleId(cohortData.cohort.schedule_id);
          setCompetitionsEnabled(cohortData.cohort.competitions_enabled !== false);
          setMembers(memberList);
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Failed to load cohort.');
      })
      .finally(() => setLoading(false));
  }, [supabase, id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (new Date(endDate) < new Date(startDate)) {
      setError('End date must be on or after start date.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await updateCohort(supabase, id, { name, level, start_date: startDate, end_date: endDate, schedule_id: scheduleId, competitions_enabled: competitionsEnabled });
      load();
    } catch (err) {
      setError(isDataError(err) ? err.message : 'Failed to save cohort.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMember = async () => {
    if (!id || !addPlayerId) return;
    setError(null);
    setSubmitting(true);
    try {
      await addCohortMember(supabase, id, addPlayerId);
      setAddPlayerId('');
      load();
    } catch (err) {
      setError(isDataError(err) ? err.message : 'Failed to add member. Player may already be in another active cohort.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (playerId: string, displayName: string) => {
    if (!id || !confirm(`Remove ${displayName || 'this player'} from the cohort?`)) return;
    try {
      await removeCohortMember(supabase, id, playerId);
      load();
    } catch (err) {
      alert(isDataError(err) ? err.message : 'Failed to remove member.');
    }
  };

  const handleGenerateCalendar = async () => {
    if (!id) return;
    const hasCalendar = await listCalendarByCohort(supabase, id).then((list) => list.length > 0).catch(() => false);
    if (hasCalendar && !confirm('This cohort already has calendar entries. Replace them? (Existing player_calendar rows for this cohort will be removed.)')) return;
    setError(null);
    setGenCalendarLoading(true);
    try {
      await generateCalendarForCohort(supabase, id);
      alert('Calendar generated. You can view it on the Calendar tab.');
      load();
    } catch (err) {
      setError(isDataError(err) ? err.message : 'Failed to generate calendar.');
    } finally {
      setGenCalendarLoading(false);
    }
  };

  const memberPlayerIds = new Set(members.map((m) => m.player_id));
  const playersNotInCohort = players.filter((p) => !memberPlayerIds.has(p.id));

  if (loading) return <p>Loading…</p>;
  if (!id) return <p>Missing cohort id.</p>;
  if (notFound) return (<><p><Link to="/admin/cohorts">← Back to cohorts</Link></p><p role="alert">Cohort not found.</p></>);
  if (error && !cohort) return (<><p><Link to="/admin/cohorts">← Back to cohorts</Link></p><p role="alert" style={{ color: '#c00' }}>{error}</p></>);

  return (
    <div>
      <p>
        <Link to="/admin/cohorts">← Back to cohorts</Link>
        {' · '}
        <Link to={`/admin/cohorts/${id}/players`}>Players</Link>
        {' · '}
        <Link to={`/admin/cohorts/${id}/calendar`}>Calendar</Link>
        {' · '}
        <Link to={`/admin/cohorts/${id}/report`}>Cohort performance</Link>
      </p>
      <h1>Edit cohort</h1>

      <form onSubmit={handleSave} style={{ maxWidth: '28rem', marginBottom: '2rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="cohort-name" style={{ display: 'block', marginBottom: '0.25rem' }}>Name</label>
          <input id="cohort-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required disabled={submitting} style={{ width: '100%', padding: '0.35rem' }} />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="cohort-level" style={{ display: 'block', marginBottom: '0.25rem' }}>Level</label>
          <input id="cohort-level" type="number" min={0} max={90} value={level} onChange={(e) => setLevel(parseInt(e.target.value, 10) || 0)} disabled={submitting} style={{ width: '6rem', padding: '0.35rem' }} />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="cohort-start" style={{ display: 'block', marginBottom: '0.25rem' }}>Start date</label>
          <input id="cohort-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required disabled={submitting} style={{ padding: '0.35rem' }} />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="cohort-end" style={{ display: 'block', marginBottom: '0.25rem' }}>End date</label>
          <input id="cohort-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required disabled={submitting} style={{ padding: '0.35rem' }} />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="cohort-schedule" style={{ display: 'block', marginBottom: '0.25rem' }}>Schedule</label>
          <select id="cohort-schedule" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)} required disabled={submitting} style={{ minWidth: '14rem', padding: '0.35rem' }}>
            {schedules.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={competitionsEnabled}
              onChange={(e) => setCompetitionsEnabled(e.target.checked)}
              disabled={submitting}
            />
            Competitions enabled
          </label>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-muted, #666)' }}>
            When enabled, this cohort can have competitions and match recording.
          </p>
        </div>
        {error && <p role="alert" style={{ color: '#c00', marginBottom: '0.5rem' }}>{error}</p>}
        <button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
      </form>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Members ({members.length})</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {members.map((m) => (
            <li key={m.id} style={{ marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{m.display_name || m.player_id}</span>
              <button type="button" onClick={() => handleRemoveMember(m.player_id, m.display_name ?? '')} disabled={submitting} style={{ background: 'none', border: 'none', color: '#c00', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}>Remove</button>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: '0.75rem' }}>
          <select value={addPlayerId} onChange={(e) => setAddPlayerId(e.target.value)} disabled={submitting} style={{ minWidth: '14rem', padding: '0.35rem', marginRight: '0.5rem' }}>
            <option value="">Add player…</option>
            {playersNotInCohort.map((p) => (
              <option key={p.id} value={p.id}>{p.nickname} ({p.email})</option>
            ))}
          </select>
          <button type="button" onClick={handleAddMember} disabled={submitting || !addPlayerId}>Add</button>
        </div>
        <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>A player can only be in one active cohort at a time. If add fails, they may already be in another cohort.</p>
      </section>

      <section>
        <h2>Calendar</h2>
        <button type="button" onClick={handleGenerateCalendar} disabled={genCalendarLoading}>
          {genCalendarLoading ? 'Generating…' : 'Generate calendar'}
        </button>
        <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>Creates calendar entries from the schedule and start date, then player_calendar rows for each member. View on the Calendar link above.</p>
      </section>
    </div>
  );
}
