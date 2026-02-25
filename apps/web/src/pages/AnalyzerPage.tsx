/**
 * Performance Analyzer. P6 §6: Free tier — TR, session history, basic trends (last 30 days).
 * P8 §6: Gold/Platinum — View darts, 90-day and all-time trends, match history.
 * P8 §7: Gold/Platinum — PR, TR, MR in header; Platinum only — AI insights placeholder.
 * Route /analyzer; guarded by AuthGuard + PlayerGuard.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getSessionHistoryForPlayer,
  getTrendForPlayer,
  listMatchesForPlayer,
} from '@opp/data';
import type { SessionHistoryEntry, MatchWithOpponentDisplay } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { getEffectiveTier } from '../utils/tier';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { NavButton } from '../components/NavButton';

const pageStyle: React.CSSProperties = {
  padding: '0 0.5rem 2rem',
  maxWidth: '36rem',
  margin: '0 auto',
  boxSizing: 'border-box',
};
const sectionStyle: React.CSSProperties = { marginBottom: '1.5rem' };
const tableStyle: React.CSSProperties = {
  borderCollapse: 'collapse',
  width: '100%',
  maxWidth: 600,
  fontSize: '0.9rem',
};
const thTdStyle: React.CSSProperties = {
  border: '1px solid var(--color-border, #ccc)',
  padding: '0.5rem 0.5rem',
  textAlign: 'left',
};
const tableWrapStyle: React.CSSProperties = { overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: '0.5rem' };
const sessionTableStyle: React.CSSProperties = {
  ...tableStyle,
  minWidth: 200,
  tableLayout: 'fixed',
  width: '100%',
};
const sessionNameCellStyle: React.CSSProperties = { ...thTdStyle, wordBreak: 'break-word', overflowWrap: 'break-word' };

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** dd/mm/yy for session history table. */
function formatDateDDMMYY(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = String(d.getFullYear()).slice(-2);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

/** Duration option for trends: 7, 30, 60, 90 days or null = All time. */
const TREND_DURATION_OPTIONS: { value: number | null; label: string }[] = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
  { value: null, label: 'All time' },
];

export function AnalyzerPage() {
  const { supabase, player } = useSupabase();
  const [history, setHistory] = useState<SessionHistoryEntry[]>([]);
  const [trendDuration, setTrendDuration] = useState<number | null>(30);
  const [trendSessionScore, setTrendSessionScore] = useState<number | null>(null);
  const [trendSS, setTrendSS] = useState<number | null>(null);
  const [trendSD, setTrendSD] = useState<number | null>(null);
  const [trendST, setTrendST] = useState<number | null>(null);
  const [trendC, setTrendC] = useState<number | null>(null);
  const [matches, setMatches] = useState<MatchWithOpponentDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const premiumTier = player ? (getEffectiveTier(player) === 'gold' || getEffectiveTier(player) === 'platinum') : false;

  useEffect(() => {
    if (!player?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const windowDays = trendDuration;
    (async () => {
      try {
        const basePromises: [Promise<SessionHistoryEntry[]>, Promise<number | null>, Promise<number | null>, Promise<number | null>, Promise<number | null>, Promise<number | null>] = [
          getSessionHistoryForPlayer(supabase, player.id, 50),
          getTrendForPlayer(supabase, player.id, { type: 'session_score', windowDays }),
          getTrendForPlayer(supabase, player.id, { type: 'routine', routineType: 'SS', windowDays }),
          getTrendForPlayer(supabase, player.id, { type: 'routine', routineType: 'SD', windowDays }),
          getTrendForPlayer(supabase, player.id, { type: 'routine', routineType: 'ST', windowDays }),
          getTrendForPlayer(supabase, player.id, { type: 'routine', routineType: 'C', windowDays }),
        ];
        const allPromises = premiumTier
          ? [...basePromises, listMatchesForPlayer(supabase, player.id, { limit: 20 })]
          : basePromises;
        const results = await Promise.all(allPromises);
        if (cancelled) return;
        setHistory((results[0] ?? []) as SessionHistoryEntry[]);
        setTrendSessionScore((results[1] ?? null) as number | null);
        setTrendSS((results[2] ?? null) as number | null);
        setTrendSD((results[3] ?? null) as number | null);
        setTrendST((results[4] ?? null) as number | null);
        setTrendC((results[5] ?? null) as number | null);
        if (premiumTier) setMatches((results[6] ?? []) as MatchWithOpponentDisplay[]);
        else setMatches([]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Performance data could not be loaded. Try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, player?.id, premiumTier, retryTrigger, trendDuration]);

  const tier = getEffectiveTier(player);
  const isPremiumTier = tier === 'gold' || tier === 'platinum';
  const isPlatinum = tier === 'platinum';

  if (loading) {
    return (
      <div style={pageStyle}>
        <h1>Performance</h1>
        <LoadingSpinner message="Loading performance…" />
        <p style={{ marginTop: '1rem' }}><NavButton to="/home" variant="secondary">← Back to Dashboard</NavButton></p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <h1>Performance</h1>
        <ErrorMessage
          message={error}
          onRetry={() => {
            setError(null);
            setLoading(true);
            setRetryTrigger((t) => t + 1);
          }}
        />
        <p><NavButton to="/home" variant="secondary">Dashboard</NavButton></p>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <h1>Performance</h1>

      <section style={sectionStyle} aria-label="Ratings">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Ratings</h2>
        {isPremiumTier ? (
          <p>
            <strong>PR:</strong> {player?.player_rating != null ? String(player.player_rating) : '—'}
            {' · '}
            <strong>TR:</strong> {player?.training_rating != null ? String(player.training_rating) : '—'}
            {' · '}
            <strong>MR:</strong> {player?.match_rating != null ? String(player.match_rating) : 'N/A'}
          </p>
        ) : (
          <p><strong>TR:</strong> {player?.training_rating != null ? String(player.training_rating) : '—'}</p>
        )}
      </section>

      <section style={sectionStyle} aria-label="Session history">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Session history</h2>
        {history.length === 0 ? (
          <p>No completed sessions yet.</p>
        ) : (
          <div style={tableWrapStyle}>
          <table style={sessionTableStyle}>
            <thead>
              <tr>
                <th style={{ ...thTdStyle, width: '4.5rem' }}>Date</th>
                <th style={thTdStyle}>Session</th>
                <th style={{ ...thTdStyle, width: '4rem' }}>Score</th>
                {isPremiumTier && <th style={{ ...thTdStyle, width: '4rem' }}>View</th>}
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id}>
                  <td style={{ ...thTdStyle, whiteSpace: 'nowrap' }}>{formatDateDDMMYY(entry.completed_at)}</td>
                  <td style={sessionNameCellStyle}>{entry.session_name ?? '—'}</td>
                  <td style={thTdStyle}>
                    {entry.session_score != null ? `${Number(entry.session_score).toFixed(1)}%` : '—'}
                  </td>
                  {isPremiumTier && (
                    <td style={thTdStyle}>
                      <NavButton
                        to={`/analyzer/darts/${entry.id}`}
                        state={{ sessionName: entry.session_name ?? undefined }}
                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
                      >
                        View
                      </NavButton>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>

      <section style={sectionStyle} aria-label="Trends">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Trends</h2>
        <div style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="analyzer-trend-duration" style={{ fontSize: '0.9rem', marginRight: '0.5rem' }}>Duration:</label>
          <select
            id="analyzer-trend-duration"
            value={trendDuration ?? 'all'}
            onChange={(e) => {
              const v = e.target.value;
              setTrendDuration(v === 'all' ? null : Number(v));
            }}
            style={{
              padding: '0.35rem 0.5rem',
              fontSize: '0.9rem',
              borderRadius: 6,
              border: '1px solid var(--color-border, #ccc)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
            }}
          >
            {TREND_DURATION_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value ?? 'all'}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thTdStyle}>Metric</th>
                <th style={{ ...thTdStyle, width: '6rem' }}>Avg</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={thTdStyle}>Session score</td>
                <td style={thTdStyle}>{trendSessionScore != null ? `${trendSessionScore.toFixed(1)}%` : '—'}</td>
              </tr>
              <tr>
                <td style={thTdStyle}>SS (single segment)</td>
                <td style={thTdStyle}>{trendSS != null ? `${trendSS.toFixed(1)}%` : '—'}</td>
              </tr>
              <tr>
                <td style={thTdStyle}>SD (double)</td>
                <td style={thTdStyle}>{trendSD != null ? `${trendSD.toFixed(1)}%` : '—'}</td>
              </tr>
              <tr>
                <td style={thTdStyle}>ST (treble)</td>
                <td style={thTdStyle}>{trendST != null ? `${trendST.toFixed(1)}%` : '—'}</td>
              </tr>
              <tr>
                <td style={thTdStyle}>C (checkout)</td>
                <td style={thTdStyle}>{trendC != null ? `${trendC.toFixed(1)}%` : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {isPlatinum && (
        <section style={sectionStyle} aria-label="AI insights">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>AI insights</h2>
          <p>AI-powered analysis will appear here. Coming soon.</p>
        </section>
      )}

      <section style={sectionStyle} aria-label="Match history">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Match history</h2>
        {isPremiumTier ? (
          matches.length === 0 ? (
            <p>No matches recorded yet.</p>
          ) : (
            <div style={tableWrapStyle}>
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
            </div>
          )
        ) : (
          <p>Match history is available in Gold or Platinum.</p>
        )}
      </section>

      <p>
        <NavButton to="/home" variant="secondary">← Back to Dashboard</NavButton>
      </p>
    </div>
  );
}
