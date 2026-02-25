import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  bulkAssignPlayersToCohorts,
  deleteCohort,
  isDataError,
  listCohortMembers,
  listSchedules,
  transitionCohortToConfirmed,
} from '@opp/data';
import type {
  BulkAssignResult,
  BulkAssignResultCohort,
  CohortMemberWithPlayer,
  Schedule,
} from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

const tableStyle: React.CSSProperties = {
  borderCollapse: 'collapse',
  width: '100%',
  maxWidth: '40rem',
};
const thTdStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '0.5rem 0.75rem',
  textAlign: 'left',
};

const sectionStyle: React.CSSProperties = { marginBottom: '1.5rem' };
const labelBlockStyle: React.CSSProperties = { display: 'block', marginBottom: '0.25rem' };
const inputStyle: React.CSSProperties = { padding: '0.35rem', minWidth: '12rem' };

/**
 * Bulk assignment UI (§8): form to assign unassigned players to new cohorts, then result view with Accept / Fine tune / Discard.
 */
export function AdminCohortBulkAssignPage() {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [namePrefix, setNamePrefix] = useState('Cohort');
  const [nameStartIndex, setNameStartIndex] = useState(1);
  const [playersPerCohort, setPlayersPerCohort] = useState(10);
  const [requiredFullCohort, setRequiredFullCohort] = useState(false);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [durationDays, setDurationDays] = useState(42);
  const [matchLevel, setMatchLevel] = useState(true);
  const [levelProximity, setLevelProximity] = useState(15);
  const [scheduleId, setScheduleId] = useState('');
  const [levelMetric, setLevelMetric] = useState<'training_rating' | 'player_rating'>('training_rating');
  const [level, setLevel] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkAssignResult | null>(null);
  const [memberDetails, setMemberDetails] = useState<Record<string, CohortMemberWithPlayer[]>>({});

  useEffect(() => {
    listSchedules(supabase)
      .then((list) => {
        setSchedules(list);
        if (list.length > 0 && !scheduleId) setScheduleId(list[0].id);
      })
      .catch(() => {});
  }, [supabase]);

  const loadMemberDetails = useCallback(
    async (cohorts: BulkAssignResultCohort[]) => {
      const map: Record<string, CohortMemberWithPlayer[]> = {};
      await Promise.all(
        cohorts.map(async (c) => {
          const members = await listCohortMembers(supabase, c.cohortId);
          map[c.cohortId] = members;
        })
      );
      setMemberDetails(map);
    },
    [supabase]
  );

  useEffect(() => {
    if (result?.cohorts?.length) {
      loadMemberDetails(result.cohorts);
    }
  }, [result, loadMemberDetails]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await bulkAssignPlayersToCohorts(supabase, {
        name_prefix: namePrefix,
        name_start_index: nameStartIndex,
        players_per_cohort: playersPerCohort,
        required_full_cohort: requiredFullCohort,
        start_date: startDate,
        duration_days: durationDays,
        match_level: matchLevel,
        level_proximity: levelProximity,
        schedule_id: scheduleId,
        level_metric: levelMetric,
        level,
      });
      setResult(res);
    } catch (err) {
      setError(isDataError(err) ? err.message : 'Bulk assign failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async () => {
    if (!result?.cohorts?.length) return;
    setError(null);
    setAccepting(true);
    try {
      for (const c of result.cohorts) {
        await transitionCohortToConfirmed(supabase, c.cohortId);
      }
      navigate('/admin/cohorts', { state: { bulkAssignAccepted: true } });
    } catch (err) {
      setError(isDataError(err) ? err.message : 'Failed to confirm cohorts.');
    } finally {
      setAccepting(false);
    }
  };

  const handleDiscard = async () => {
    if (!result?.cohorts?.length) return;
    if (!confirm('Delete all created cohorts and remove players from them? This cannot be undone.')) return;
    setError(null);
    setDiscarding(true);
    try {
      for (const c of result.cohorts) {
        await deleteCohort(supabase, c.cohortId);
      }
      setResult(null);
      setMemberDetails({});
    } catch (err) {
      setError(isDataError(err) ? err.message : 'Failed to discard cohorts.');
    } finally {
      setDiscarding(false);
    }
  };

  if (result && result.cohorts.length > 0) {
    return (
      <div>
        <p>
          <Link to="/admin/cohorts">← Back to cohorts</Link>
        </p>
        <h1>Bulk assign — result</h1>
        <p style={{ marginBottom: '1rem' }}>
          Cohorts created. Review and approve or fine-tune.
        </p>
        {error && (
          <p role="alert" style={{ color: '#c00', marginBottom: '0.75rem' }}>
            {error}
          </p>
        )}
        <p style={{ marginBottom: '1rem' }}>
          <button type="button" onClick={handleAccept} disabled={accepting} style={{ marginRight: '0.5rem', padding: '0.4rem 0.75rem' }}>
            {accepting ? 'Confirming…' : 'Accept all'}
          </button>
          <button type="button" onClick={handleDiscard} disabled={discarding} style={{ marginRight: '0.5rem', padding: '0.4rem 0.75rem' }}>
            {discarding ? 'Discarding…' : 'Discard'}
          </button>
          <span style={{ fontSize: '0.9rem', color: 'var(--color-muted, #666)' }}>
            Accept = set all to Confirmed. Discard = delete these cohorts.
          </span>
        </p>
        {result.cohorts.map((c) => (
          <section key={c.cohortId} style={{ ...sectionStyle, padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
            <h2 style={{ marginTop: 0 }}>
              {c.cohortName}
              {' — '}
              <Link to={`/admin/cohorts/${c.cohortId}`}>Fine tune</Link>
            </h2>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thTdStyle}>Player</th>
                </tr>
              </thead>
              <tbody>
                {(memberDetails[c.cohortId] ?? []).map((m) => (
                  <tr key={m.id}>
                    <td style={thTdStyle}>{m.display_name || m.player_id}</td>
                  </tr>
                ))}
                {!memberDetails[c.cohortId]?.length && c.playerIds.length > 0 && (
                  <tr>
                    <td style={thTdStyle}>Loading…</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div>
      <p>
        <Link to="/admin/cohorts">← Back to cohorts</Link>
      </p>
      <h1>Bulk assign players to cohorts</h1>
      <p style={{ marginBottom: '1.5rem', color: 'var(--color-muted, #666)' }}>
        Assign unassigned players to new cohorts. Choose naming, size, dates, and whether to group by skill level.
      </p>
      {error && (
        <p role="alert" style={{ color: '#c00', marginBottom: '0.75rem' }}>
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} style={{ maxWidth: '28rem' }}>
        <div style={sectionStyle}>
          <label htmlFor="bulk-name-prefix" style={labelBlockStyle}>Cohort name prefix</label>
          <input
            id="bulk-name-prefix"
            type="text"
            value={namePrefix}
            onChange={(e) => setNamePrefix(e.target.value)}
            required
            style={inputStyle}
            placeholder="Cohort"
          />
        </div>
        <div style={sectionStyle}>
          <label htmlFor="bulk-name-start" style={labelBlockStyle}>First cohort number</label>
          <input
            id="bulk-name-start"
            type="number"
            min={0}
            value={nameStartIndex}
            onChange={(e) => setNameStartIndex(parseInt(e.target.value, 10) || 0)}
            style={{ ...inputStyle, width: '6rem' }}
          />
          <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem' }}>→ names: &quot;{namePrefix} {nameStartIndex}&quot;, &quot;{namePrefix} {nameStartIndex + 1}&quot;, …</span>
        </div>
        <div style={sectionStyle}>
          <label htmlFor="bulk-players-per" style={labelBlockStyle}>Players per cohort</label>
          <input
            id="bulk-players-per"
            type="number"
            min={1}
            value={playersPerCohort}
            onChange={(e) => setPlayersPerCohort(parseInt(e.target.value, 10) || 1)}
            style={{ ...inputStyle, width: '6rem' }}
          />
        </div>
        <div style={sectionStyle}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={requiredFullCohort}
              onChange={(e) => setRequiredFullCohort(e.target.checked)}
            />
            Required full cohort (drop remainder if smaller)
          </label>
        </div>
        <div style={sectionStyle}>
          <label htmlFor="bulk-start-date" style={labelBlockStyle}>Start date</label>
          <input
            id="bulk-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            style={inputStyle}
          />
        </div>
        <div style={sectionStyle}>
          <label htmlFor="bulk-duration" style={labelBlockStyle}>Duration (days)</label>
          <input
            id="bulk-duration"
            type="number"
            min={1}
            value={durationDays}
            onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || 1)}
            style={{ ...inputStyle, width: '6rem' }}
          />
        </div>
        <div style={sectionStyle}>
          <label htmlFor="bulk-schedule" style={labelBlockStyle}>Schedule</label>
          <select
            id="bulk-schedule"
            value={scheduleId}
            onChange={(e) => setScheduleId(e.target.value)}
            required
            style={inputStyle}
          >
            <option value="">Select schedule…</option>
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div style={sectionStyle}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={matchLevel} onChange={(e) => setMatchLevel(e.target.checked)} />
            Match level (group by skill)
          </label>
        </div>
        {matchLevel && (
          <>
            <div style={sectionStyle}>
              <label htmlFor="bulk-level-proximity" style={labelBlockStyle}>Level proximity (max rating range in a cohort)</label>
              <input
                id="bulk-level-proximity"
                type="number"
                min={0}
                value={levelProximity}
                onChange={(e) => setLevelProximity(parseInt(e.target.value, 10) || 0)}
                style={{ ...inputStyle, width: '6rem' }}
              />
            </div>
            <div style={sectionStyle}>
              <span style={labelBlockStyle}>Rating to use</span>
              <label style={{ marginRight: '1rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="level_metric"
                  checked={levelMetric === 'training_rating'}
                  onChange={() => setLevelMetric('training_rating')}
                />{' '}
                Training rating
              </label>
              <label style={{ cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="level_metric"
                  checked={levelMetric === 'player_rating'}
                  onChange={() => setLevelMetric('player_rating')}
                />{' '}
                Player rating
              </label>
            </div>
          </>
        )}
        <div style={sectionStyle}>
          <label htmlFor="bulk-level" style={labelBlockStyle}>Cohort level (optional)</label>
          <input
            id="bulk-level"
            type="number"
            min={0}
            max={90}
            value={level}
            onChange={(e) => setLevel(parseInt(e.target.value, 10) || 0)}
            style={{ ...inputStyle, width: '6rem' }}
          />
        </div>
        <button type="submit" disabled={submitting || !scheduleId}>
          {submitting ? 'Assigning…' : 'Assign players'}
        </button>
      </form>
    </div>
  );
}
