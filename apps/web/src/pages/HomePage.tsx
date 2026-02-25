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
} from '@opp/data';
import type { Cohort, Competition } from '@opp/data';
import type { NextOrAvailableSession } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { hasCompletedITA } from '../utils/ita';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { NavButton } from '../components/NavButton';

const sectionStyle: React.CSSProperties = { marginBottom: '1.5rem' };
const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '7rem 1fr',
  gap: '0.25rem 1rem',
  alignItems: 'baseline',
  maxWidth: '100%',
};
const sectionLabelStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: 'var(--color-muted, #6b7280)',
};
const mainValueStyle: React.CSSProperties = { fontSize: '1.15rem', fontWeight: 700 };
const secondaryStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: 'var(--color-muted, #6b7280)',
  marginTop: '0.15rem',
};

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
        const [cohortRes, nextRes, nextCompRes] = await Promise.all([
          getCurrentCohortForPlayer(supabase, player.id),
          getNextSessionForPlayer(supabase, player.id),
          getNextCompetitionForPlayer(supabase, player.id),
        ]);
        if (cancelled) return;
        setCohort(cohortRes ?? null);
        setNextSession(nextRes ?? null);
        setNextCompetition(nextCompRes ?? null);
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

  const levelDisplay =
    player?.training_rating != null
      ? String(Math.round(player.training_rating))
      : player?.baseline_rating != null
        ? String(Math.round(player.baseline_rating))
        : '—';

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

  const showCompleteITA = player && !hasCompletedITA(player);

  return (
    <>
      <h1>Dashboard</h1>

      {showCompleteITA && (
        <section style={{ ...sectionStyle, padding: '1rem', border: '1px solid var(--color-border, #ccc)', borderRadius: 6 }} aria-label="Complete ITA">
          <p style={{ margin: 0, marginBottom: '0.5rem' }}>
            <Link
              to="/play/ita"
              className="tap-target"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: 'var(--tap-min, 44px)',
                fontWeight: 600,
                fontSize: '1.05rem',
              }}
            >
              Complete ITA
            </Link>
          </p>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-muted, #525252)' }}>
            Required before training
          </p>
        </section>
      )}

      <section style={sectionStyle} aria-label="Profile">
        <div style={gridStyle}>
          <span style={sectionLabelStyle}>Profile</span>
          <div>
            {player?.avatar_url && (
              <img src={player.avatar_url} alt="" width={48} height={48} style={{ borderRadius: 4, marginRight: '0.5rem', verticalAlign: 'middle' }} />
            )}
            <span style={mainValueStyle}>{player?.nickname ?? '—'}</span>
            <div style={secondaryStyle}>Level: {levelDisplay}</div>
          </div>
        </div>
      </section>

      <section style={sectionStyle} aria-label="Cohort">
        <div style={gridStyle}>
          <span style={sectionLabelStyle}>Cohort</span>
          <div>
            {cohort ? (
              <>
                <span style={mainValueStyle}>{cohort.name}</span>
                <div style={secondaryStyle}>
                  {formatDate(cohort.start_date)} – {formatDate(cohort.end_date)}
                </div>
              </>
            ) : (
              <span style={mainValueStyle}>No cohort</span>
            )}
          </div>
        </div>
      </section>

      <section style={sectionStyle} aria-label="Up next">
        <div style={gridStyle}>
          <span style={sectionLabelStyle}>Up Next</span>
          <div>
            {showCompleteITA ? (
              <>
                <span style={mainValueStyle}>Complete ITA</span>
                <div style={secondaryStyle}>Required before training</div>
                <NavButton to="/play/ita" style={{ marginTop: '0.5rem' }}>Start ITA</NavButton>
              </>
            ) : nextSession ? (
              <>
                <span style={mainValueStyle}>{nextSession.session_name}</span>
                <div style={secondaryStyle}>{formatDateTime(nextSession.scheduled_at)}</div>
                <NavButton to={`/play/session/${nextSession.calendar_id}`}>Start session</NavButton>
              </>
            ) : (
              <span style={mainValueStyle}>No upcoming session</span>
            )}
          </div>
        </div>
      </section>

      {cohort?.competitions_enabled && (
        <section style={sectionStyle} aria-label="Next competition">
          <div style={gridStyle}>
            <span style={sectionLabelStyle}>Next competition</span>
            <div>
              {nextCompetition?.scheduled_at ? (
                <>
                  <span style={mainValueStyle}>{nextCompetition.name}</span>
                  <div style={secondaryStyle}>{formatDateTime(nextCompetition.scheduled_at)}</div>
                  <NavButton to="/play/record-match" style={{ marginTop: '0.5rem' }}>Record match</NavButton>
                </>
              ) : (
                <span style={secondaryStyle}>—</span>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
