/**
 * Player Dashboard. P5 §8.1: TR; P6 §4: profile, cohort, next session, ratings + trend, link to Analyzer.
 * P8 §2: GO notifications — "Up next" derived from getNextSessionForPlayer (Option A; no player_notifications table).
 * Only reachable when authenticated and player exists (AuthGuard + PlayerGuard).
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getCurrentCohortForPlayer,
  getNextCompetitionForPlayer,
  getNextSessionForPlayer,
  getRecentSessionScoresForPlayer,
} from '@opp/data';
import type { Cohort, Competition } from '@opp/data';
import type { NextOrAvailableSession } from '@opp/data';
import type { RecentSessionScore } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { computeTRTrend } from '../utils/trTrend';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

const sectionStyle: React.CSSProperties = { marginBottom: '1.5rem' };
const labelStyle: React.CSSProperties = { fontWeight: 600, marginRight: '0.5rem' };

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function HomePage() {
  const { supabase, player } = useSupabase();
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [nextSession, setNextSession] = useState<NextOrAvailableSession | null>(null);
  const [nextCompetition, setNextCompetition] = useState<Competition | null>(null);
  const [recentScores, setRecentScores] = useState<RecentSessionScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

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
        const [cohortRes, nextRes, nextCompRes, scoresRes] = await Promise.all([
          getCurrentCohortForPlayer(supabase, player.id),
          getNextSessionForPlayer(supabase, player.id),
          getNextCompetitionForPlayer(supabase, player.id),
          getRecentSessionScoresForPlayer(supabase, player.id, 4),
        ]);
        if (cancelled) return;
        setCohort(cohortRes ?? null);
        setNextSession(nextRes ?? null);
        setNextCompetition(nextCompRes ?? null);
        setRecentScores(scoresRes ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Dashboard could not be loaded. Try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, player?.id, retryTrigger]);

  const tr = player?.training_rating;
  const trDisplay = tr != null ? String(tr) : '—';
  const prDisplay = player?.player_rating != null ? String(player.player_rating) : '—';
  const mrDisplay = player?.match_rating != null ? String(player.match_rating) : 'N/A';
  const trend = computeTRTrend(recentScores);
  const trendSymbol = trend === 'up' ? '↑' : trend === 'down' ? '↓' : trend === 'stable' ? '→' : '';
  const trendLabel =
    trend === 'up' ? 'Trend: improving' : trend === 'down' ? 'Trend: declining' : trend === 'stable' ? 'Trend: stable' : '';

  if (loading) {
    return <LoadingSpinner message="Loading dashboard…" />;
  }

  if (error) {
    return (
      <>
        <h1>Dashboard</h1>
        <ErrorMessage
          message={error}
          onRetry={() => {
            setError(null);
            setLoading(true);
            setRetryTrigger((t) => t + 1);
          }}
        />
      </>
    );
  }

  return (
    <>
      <h1>Dashboard</h1>

      <section style={sectionStyle} aria-label="Profile">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Profile</h2>
        {player?.avatar_url ? (
          <p>
            <img src={player.avatar_url} alt="" width={48} height={48} style={{ borderRadius: 4, marginRight: '0.5rem', verticalAlign: 'middle' }} />
            <span>{player?.nickname ?? '—'}</span>
          </p>
        ) : (
          <p>{player?.nickname ?? '—'}</p>
        )}
      </section>

      <section style={sectionStyle} aria-label="Cohort">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Cohort</h2>
        {cohort ? (
          <p>
            <span style={labelStyle}>{cohort.name}</span>
            {formatDate(cohort.start_date)} – {formatDate(cohort.end_date)}
          </p>
        ) : (
          <p>No cohort</p>
        )}
      </section>

      <section style={sectionStyle} aria-label="Up next">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Up next</h2>
        {nextSession ? (
          <p>
            Up next: Day {nextSession.day_no} — {nextSession.session_name} on {formatDateTime(nextSession.scheduled_at)}
            {cohort && (
              <>
                <br />
                <span style={{ fontSize: '0.9rem', color: 'var(--muted, #666)' }}>{cohort.name}</span>
              </>
            )}
            <br />
            <Link to={`/play/session/${nextSession.calendar_id}`} className="tap-target" style={{ display: 'inline-flex' }}>Start session</Link>
          </p>
        ) : (
          <p>No upcoming session</p>
        )}
      </section>

      <section style={sectionStyle} aria-label="Next competition">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Next competition</h2>
        {nextCompetition?.scheduled_at ? (
          <p>
            {formatDateTime(nextCompetition.scheduled_at)} — {nextCompetition.name}
            <br />
            <Link to="/play/record-match" className="tap-target" style={{ display: 'inline-flex' }}>Record match</Link>
          </p>
        ) : (
          <p>—</p>
        )}
      </section>

      <section style={sectionStyle} aria-label="Ratings">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Ratings</h2>
        <p>
          <span style={labelStyle}>PR:</span> {prDisplay}
          <span style={{ marginLeft: '1rem' }}>
            <span style={labelStyle}>TR:</span> {trDisplay}
            {trendSymbol && (
              <span aria-label={trendLabel} title={trendLabel} style={{ marginLeft: '0.25rem' }}>
                {trendSymbol}
              </span>
            )}
          </span>
          <span style={{ marginLeft: '1rem' }}>
            <span style={labelStyle}>MR:</span> {mrDisplay}
          </span>
        </p>
      </section>

      <section style={sectionStyle}>
        <Link to="/analyzer" className="tap-target" style={{ display: 'inline-flex' }}>View performance</Link>
      </section>
    </>
  );
}
