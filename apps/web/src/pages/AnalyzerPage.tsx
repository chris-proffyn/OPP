/**
 * Performance Analyzer. P6 §6: Free tier — TR, session history (session + routine scores), basic trends (last 30 days).
 * Route /analyzer; guarded by AuthGuard + PlayerGuard.
 * Tier gating (P6 §7): Free sees only last-30-day trends and session/routine scores (no dart-level, no all-time).
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getSessionHistoryForPlayer,
  getTrendForPlayer,
  listMatchesForPlayer,
} from '@opp/data';
import type { SessionHistoryEntry, MatchWithOpponentDisplay } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { getEffectiveTier } from '../utils/tier';

const sectionStyle: React.CSSProperties = { marginBottom: '1.5rem' };
const tableStyle: React.CSSProperties = { borderCollapse: 'collapse', width: '100%', maxWidth: 600 };
const thTdStyle: React.CSSProperties = { border: '1px solid #ccc', padding: '0.5rem 0.75rem', textAlign: 'left' };

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function AnalyzerPage() {
  const { supabase, player } = useSupabase();
  const [history, setHistory] = useState<SessionHistoryEntry[]>([]);
  const [trendSessionScore, setTrendSessionScore] = useState<number | null>(null);
  const [trendSingles, setTrendSingles] = useState<number | null>(null);
  const [matches, setMatches] = useState<MatchWithOpponentDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const premiumTier = player ? (getEffectiveTier(player) === 'gold' || getEffectiveTier(player) === 'platinum') : false;

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
        const promises: [
          Promise<SessionHistoryEntry[]>,
          Promise<number | null>,
          Promise<number | null>,
        ] = [
          getSessionHistoryForPlayer(supabase, player.id, 50),
          getTrendForPlayer(supabase, player.id, { type: 'session_score', windowDays: 30 }),
          getTrendForPlayer(supabase, player.id, { type: 'routine', routineName: 'Singles', windowDays: 30 }),
        ];
        if (premiumTier) {
          const matchPromise = listMatchesForPlayer(supabase, player.id, { limit: 20 });
          const [historyRes, sessionTrendRes, singlesTrendRes, matchesRes] = await Promise.all([
            ...promises,
            matchPromise,
          ]);
          if (cancelled) return;
          setHistory(historyRes ?? []);
          setTrendSessionScore(sessionTrendRes ?? null);
          setTrendSingles(singlesTrendRes ?? null);
          setMatches(matchesRes ?? []);
        } else {
          const [historyRes, sessionTrendRes, singlesTrendRes] = await Promise.all(promises);
          if (cancelled) return;
          setHistory(historyRes ?? []);
          setTrendSessionScore(sessionTrendRes ?? null);
          setTrendSingles(singlesTrendRes ?? null);
          setMatches([]);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load performance data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, player?.id, premiumTier]);

  const tier = getEffectiveTier(player);
  const isPremiumTier = tier === 'gold' || tier === 'platinum';

  if (loading) {
    return (
      <>
        <h1>Performance</h1>
        <p>Loading…</p>
        <p><Link to="/home">← Back to Dashboard</Link></p>
      </>
    );
  }

  if (error) {
    return (
      <>
        <h1>Performance</h1>
        <p role="alert">{error}</p>
        <p><Link to="/analyzer">Retry</Link> · <Link to="/home">Dashboard</Link></p>
      </>
    );
  }

  return (
    <>
      <h1>Performance</h1>

      <section style={sectionStyle} aria-label="Current TR">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Current TR</h2>
        <p>{player?.training_rating != null ? String(player.training_rating) : '—'}</p>
      </section>

      <section style={sectionStyle} aria-label="Session history">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Session history</h2>
        {history.length === 0 ? (
          <p>No completed sessions yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thTdStyle}>Date</th>
                <th style={thTdStyle}>Session</th>
                <th style={thTdStyle}>Score %</th>
                <th style={thTdStyle}>Routines</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id}>
                  <td style={thTdStyle}>{formatDateTime(entry.completed_at)}</td>
                  <td style={thTdStyle}>{entry.session_name ?? '—'}</td>
                  <td style={thTdStyle}>
                    {entry.session_score != null ? `${Number(entry.session_score).toFixed(1)}%` : '—'}
                  </td>
                  <td style={thTdStyle}>
                    {entry.routine_scores.length === 0
                      ? '—'
                      : entry.routine_scores.map((r) => `${r.routine_name}: ${r.routine_score.toFixed(0)}%`).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={sectionStyle} aria-label="Trends (last 30 days)">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Trends — last 30 days</h2>
        <p>
          <strong>Session score (avg):</strong>{' '}
          {trendSessionScore != null ? `${trendSessionScore.toFixed(1)}%` : 'No data'}
        </p>
        <p>
          <strong>Singles (avg):</strong>{' '}
          {trendSingles != null ? `${trendSingles.toFixed(1)}%` : '—'}
        </p>
      </section>

      <section style={sectionStyle} aria-label="Match history">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Match history</h2>
        {isPremiumTier ? (
          matches.length === 0 ? (
            <p>No matches recorded yet.</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thTdStyle}>Date</th>
                  <th style={thTdStyle}>Opponent</th>
                  <th style={thTdStyle}>Format</th>
                  <th style={thTdStyle}>Result</th>
                  <th style={thTdStyle}>MR</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <tr key={m.id}>
                    <td style={thTdStyle}>{formatDateTime(m.played_at)}</td>
                    <td style={thTdStyle}>{m.opponent_display_name ?? '—'}</td>
                    <td style={thTdStyle}>Best of {m.format_best_of}</td>
                    <td style={thTdStyle}>{m.legs_won}–{m.legs_lost}</td>
                    <td style={thTdStyle}>{Number(m.match_rating).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          <p>Match history is available in Gold or Platinum.</p>
        )}
      </section>

      <p>
        <Link to="/home">← Back to Dashboard</Link>
      </p>
    </>
  );
}
