/**
 * Player Dashboard. P5 §8.1: TR; P6 §4: profile, cohort, next session, ratings + trend, link to Analyzer.
 * Only reachable when authenticated and player exists (AuthGuard + PlayerGuard).
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getCurrentCohortForPlayer,
  getNextSessionForPlayer,
  getRecentSessionScoresForPlayer,
} from '@opp/data';
import type { Cohort } from '@opp/data';
import type { NextOrAvailableSession } from '@opp/data';
import type { RecentSessionScore } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { computeTRTrend } from '../utils/trTrend';

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
  const [recentScores, setRecentScores] = useState<RecentSessionScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const [cohortRes, nextRes, scoresRes] = await Promise.all([
          getCurrentCohortForPlayer(supabase, player.id),
          getNextSessionForPlayer(supabase, player.id),
          getRecentSessionScoresForPlayer(supabase, player.id, 4),
        ]);
        if (cancelled) return;
        setCohort(cohortRes ?? null);
        setNextSession(nextRes ?? null);
        setRecentScores(scoresRes ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load dashboard.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, player?.id]);

  const tr = player?.training_rating;
  const trDisplay = tr != null ? String(tr) : '—';
  const prDisplay = player?.player_rating != null ? String(player.player_rating) : '—';
  const mrDisplay = player?.match_rating != null ? String(player.match_rating) : 'N/A';
  const trend = computeTRTrend(recentScores);
  const trendSymbol = trend === 'up' ? '↑' : trend === 'down' ? '↓' : trend === 'stable' ? '→' : '';
  const trendLabel =
    trend === 'up' ? 'Trend: improving' : trend === 'down' ? 'Trend: declining' : trend === 'stable' ? 'Trend: stable' : '';

  if (loading) {
    return <p>Loading dashboard…</p>;
  }

  if (error) {
    return (
      <>
        <p role="alert">{error}</p>
        <p>
          <Link to="/home">Retry</Link>
        </p>
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
            <span>{player?.display_name ?? '—'}</span>
          </p>
        ) : (
          <p>{player?.display_name ?? '—'}</p>
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

      <section style={sectionStyle} aria-label="Next session">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Next training session</h2>
        {nextSession ? (
          <p>
            {formatDateTime(nextSession.scheduled_at)} — {nextSession.session_name}
            <br />
            <Link to={`/play/session/${nextSession.calendar_id}`}>Start session</Link>
          </p>
        ) : (
          <p>No upcoming session</p>
        )}
      </section>

      <section style={sectionStyle} aria-label="Next competition">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Next competition</h2>
        <p>—</p>
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
        <Link to="/analyzer">View performance</Link>
      </section>
    </>
  );
}
