/**
 * P7 — Record match. Opponent (cohort), format, result (legs, 3DA, doubles), optional competition. Submit → recordMatch.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getOpponentsInCurrentCohort,
  getCurrentCohortForPlayer,
  listCompetitions,
  recordMatch,
  isDataError,
} from '@opp/data';
import type { OpponentOption } from '@opp/data';
import type { Competition } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { hasCompletedITA } from '../utils/ita';

const FORMAT_OPTIONS = [5, 7, 9, 11] as const;

const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '28rem' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.25rem' };
const inputStyle: React.CSSProperties = { padding: '0.5rem', fontSize: '1rem' };
const buttonStyle: React.CSSProperties = { padding: '0.6rem 1rem', cursor: 'pointer' };

export function RecordMatchPage() {
  const { supabase, player } = useSupabase();
  const navigate = useNavigate();
  const [opponents, setOpponents] = useState<OpponentOption[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [opponentId, setOpponentId] = useState('');
  const [formatBestOf, setFormatBestOf] = useState<number>(5);
  const [legsWon, setLegsWon] = useState('');
  const [legsLost, setLegsLost] = useState('');
  const [threeDartAvg, setThreeDartAvg] = useState('');
  const [doublesAttempted, setDoublesAttempted] = useState('');
  const [doublesHit, setDoublesHit] = useState('');
  const [competitionId, setCompetitionId] = useState('');

  useEffect(() => {
    if (!player?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [_cohort, opps, comps] = await Promise.all([
          getCurrentCohortForPlayer(supabase, player.id),
          getOpponentsInCurrentCohort(supabase, player.id),
          getCurrentCohortForPlayer(supabase, player.id).then((c) =>
            c ? listCompetitions(supabase, { cohortId: c.id, limit: 20, order: 'asc' }) : []
          ),
        ]);
        if (cancelled) return;
        setOpponents(opps);
        setCompetitions(comps ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [supabase, player?.id]);

  const totalLegs = (n: number, m: number) => n + m;
  const legsW = legsWon === '' ? 0 : parseInt(legsWon, 10);
  const legsL = legsLost === '' ? 0 : parseInt(legsLost, 10);
  const valid =
    opponentId &&
    formatBestOf >= 5 &&
    Number.isInteger(legsW) &&
    Number.isInteger(legsL) &&
    legsW >= 0 &&
    legsL >= 0 &&
    totalLegs(legsW, legsL) <= formatBestOf &&
    totalLegs(legsW, legsL) >= 1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!valid || !player) return;
    const threeDart = threeDartAvg === '' ? undefined : parseFloat(threeDartAvg);
    const dAttempted = doublesAttempted === '' ? undefined : parseInt(doublesAttempted, 10);
    const dHit = doublesHit === '' ? undefined : parseInt(doublesHit, 10);
    setSubmitLoading(true);
    try {
      await recordMatch(supabase, {
        playerId: player.id,
        opponentId,
        formatBestOf,
        legsWon: legsW,
        legsLost: legsL,
        threeDartAvg: threeDart,
        doublesAttempted: dAttempted,
        doublesHit: dHit,
        competitionId: competitionId || undefined,
      });
      setSuccess(true);
      setTimeout(() => navigate('/home', { replace: true }), 1500);
    } catch (err) {
      setError(
        isDataError(err) ? err.message : err instanceof Error ? err.message : 'Something went wrong.'
      );
    } finally {
      setSubmitLoading(false);
    }
  }

  if (loading) return <p>Loading…</p>;

  if (success) {
    return (
      <>
        <h1>Record match</h1>
        <p>Match recorded. Your ratings have been updated. Redirecting to dashboard…</p>
      </>
    );
  }

  if (player && !hasCompletedITA(player) && player.role !== 'admin') {
    return (
      <>
        <h1>Record match</h1>
        <p>Complete your Initial Training Assessment before recording matches.</p>
        <p>
          <Link to="/play/ita" style={{ fontWeight: 500 }}>Complete ITA</Link>
          {' · '}
          <Link to="/profile" style={{ fontWeight: 500 }}>Profile</Link>
          {' · '}
          <Link to="/play" style={{ fontWeight: 500 }}>Play</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1>Record match</h1>
      <p><Link to="/play">← Play</Link> · <Link to="/home">Dashboard</Link></p>
      {opponents.length === 0 && (
        <p role="alert" style={{ color: '#c00' }}>
          You need to be in a cohort with other members to record a match. Join a cohort or ask your coach.
        </p>
      )}
      {error && <p role="alert" style={{ color: '#c00' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={formStyle} aria-label="Record match form">
        <label style={labelStyle}>
          Opponent
          <select
            value={opponentId}
            onChange={(e) => setOpponentId(e.target.value)}
            style={inputStyle}
            required
            disabled={opponents.length === 0}
          >
            <option value="">Select opponent</option>
            {opponents.map((o) => (
              <option key={o.player_id} value={o.player_id}>
                {o.display_name ?? o.player_id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Format (best of)
          <select
            value={formatBestOf}
            onChange={(e) => setFormatBestOf(Number(e.target.value))}
            style={inputStyle}
          >
            {FORMAT_OPTIONS.map((n) => (
              <option key={n} value={n}>Best of {n}</option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Legs won
          <input
            type="number"
            min={0}
            max={formatBestOf}
            value={legsWon}
            onChange={(e) => setLegsWon(e.target.value)}
            style={inputStyle}
            required
          />
        </label>
        <label style={labelStyle}>
          Legs lost
          <input
            type="number"
            min={0}
            max={formatBestOf}
            value={legsLost}
            onChange={(e) => setLegsLost(e.target.value)}
            style={inputStyle}
            required
          />
        </label>
        <label style={labelStyle}>
          Three-dart average (optional but recommended for MR)
          <input
            type="number"
            min={0}
            step={0.1}
            value={threeDartAvg}
            onChange={(e) => setThreeDartAvg(e.target.value)}
            style={inputStyle}
            placeholder="e.g. 45.2"
          />
        </label>
        <label style={labelStyle}>
          Doubles attempted (optional)
          <input
            type="number"
            min={0}
            value={doublesAttempted}
            onChange={(e) => setDoublesAttempted(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Doubles hit (optional)
          <input
            type="number"
            min={0}
            value={doublesHit}
            onChange={(e) => setDoublesHit(e.target.value)}
            style={inputStyle}
          />
        </label>
        {competitions.length > 0 && (
          <label style={labelStyle}>
            Competition (optional)
            <select
              value={competitionId}
              onChange={(e) => setCompetitionId(e.target.value)}
              style={inputStyle}
            >
              <option value="">None</option>
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.scheduled_at ? new Date(c.scheduled_at).toLocaleDateString() : '—'}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="submit" style={buttonStyle} disabled={!valid || submitLoading}>
          {submitLoading ? 'Recording…' : 'Record match'}
        </button>
      </form>
    </>
  );
}
