/**
 * Performance Analyzer. P6 §6: Free tier — TR, session history, basic trends (last 30 days).
 * P8 §6: Gold/Platinum — View darts, 90-day and all-time trends, match history.
 * P8 §7: Gold/Platinum — PR, TR, MR in header; Platinum only — AI insights placeholder.
 * Route /analyzer; guarded by AuthGuard + PlayerGuard.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getDartScoresForSessionRun,
  getSessionHistoryForPlayer,
  getTrendForPlayer,
  listMatchesForPlayer,
} from '@opp/data';
import type { DartScore, SessionHistoryEntry, MatchWithOpponentDisplay } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { getEffectiveTier } from '../utils/tier';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

const sectionStyle: React.CSSProperties = { marginBottom: '1.5rem' };
const tableStyle: React.CSSProperties = { borderCollapse: 'collapse', width: '100%', maxWidth: 600 };
const thTdStyle: React.CSSProperties = { border: '1px solid #ccc', padding: '0.5rem 0.75rem', textAlign: 'left' };

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** P8 §6.1 — Darts list grouped by routine_no for View darts (Gold/Platinum). */
function DartsList({ darts }: { darts: DartScore[] }) {
  const byRoutine = new Map<number, DartScore[]>();
  for (const d of darts) {
    const list = byRoutine.get(d.routine_no) ?? [];
    list.push(d);
    byRoutine.set(d.routine_no, list);
  }
  const routineNos = Array.from(byRoutine.keys()).sort((a, b) => a - b);
  return (
    <div style={{ padding: '0.5rem 0', fontSize: '0.9rem' }}>
      {routineNos.map((no) => (
        <div key={no} style={{ marginBottom: '0.75rem' }}>
          <strong>Routine {no}</strong>
          <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0, listStyle: 'none' }}>
            {(byRoutine.get(no) ?? []).map((d) => (
              <li key={d.id}>
                Step {d.step_no}, dart {d.dart_no}: target {d.target} → actual {d.actual} ({d.result === 'H' ? 'hit' : 'miss'})
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function AnalyzerPage() {
  const { supabase, player } = useSupabase();
  const [history, setHistory] = useState<SessionHistoryEntry[]>([]);
  const [trendSessionScore, setTrendSessionScore] = useState<number | null>(null);
  const [trendSingles, setTrendSingles] = useState<number | null>(null);
  const [trendSessionScore90, setTrendSessionScore90] = useState<number | null>(null);
  const [trendSingles90, setTrendSingles90] = useState<number | null>(null);
  const [trendSessionScoreAll, setTrendSessionScoreAll] = useState<number | null>(null);
  const [trendSinglesAll, setTrendSinglesAll] = useState<number | null>(null);
  const [matches, setMatches] = useState<MatchWithOpponentDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [dartsForRun, setDartsForRun] = useState<DartScore[]>([]);
  const [dartsLoading, setDartsLoading] = useState(false);

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
          const trend90 = [
            getTrendForPlayer(supabase, player.id, { type: 'session_score', windowDays: 90 }),
            getTrendForPlayer(supabase, player.id, { type: 'routine', routineName: 'Singles', windowDays: 90 }),
          ];
          const trendAll = [
            getTrendForPlayer(supabase, player.id, { type: 'session_score', windowDays: null }),
            getTrendForPlayer(supabase, player.id, { type: 'routine', routineName: 'Singles', windowDays: null }),
          ];
          const [historyRes, sessionTrendRes, singlesTrendRes, matchesRes, ...rest] = await Promise.all([
            ...promises,
            matchPromise,
            ...trend90,
            ...trendAll,
          ]);
          if (cancelled) return;
          setHistory(historyRes ?? []);
          setTrendSessionScore(sessionTrendRes ?? null);
          setTrendSingles(singlesTrendRes ?? null);
          setMatches(matchesRes ?? []);
          setTrendSessionScore90(rest[0] ?? null);
          setTrendSingles90(rest[1] ?? null);
          setTrendSessionScoreAll(rest[2] ?? null);
          setTrendSinglesAll(rest[3] ?? null);
        } else {
          const [historyRes, sessionTrendRes, singlesTrendRes] = await Promise.all(promises);
          if (cancelled) return;
          setHistory(historyRes ?? []);
          setTrendSessionScore(sessionTrendRes ?? null);
          setTrendSingles(singlesTrendRes ?? null);
          setMatches([]);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Performance data could not be loaded. Try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, player?.id, premiumTier, retryTrigger]);

  const toggleDarts = useCallback(
    async (runId: string) => {
      if (expandedRunId === runId) {
        setExpandedRunId(null);
        setDartsForRun([]);
        return;
      }
      setExpandedRunId(runId);
      setDartsLoading(true);
      setDartsForRun([]);
      try {
        const list = await getDartScoresForSessionRun(supabase, runId);
        setDartsForRun(list);
      } catch {
        setDartsForRun([]);
      } finally {
        setDartsLoading(false);
      }
    },
    [supabase, expandedRunId]
  );

  const tier = getEffectiveTier(player);
  const isPremiumTier = tier === 'gold' || tier === 'platinum';
  const isPlatinum = tier === 'platinum';

  if (loading) {
    return (
      <>
        <h1>Performance</h1>
        <LoadingSpinner message="Loading performance…" />
        <p style={{ marginTop: '1rem' }}><Link to="/home" className="tap-target" style={{ display: 'inline-flex' }}>← Back to Dashboard</Link></p>
      </>
    );
  }

  if (error) {
    return (
      <>
        <h1>Performance</h1>
        <ErrorMessage
          message={error}
          onRetry={() => {
            setError(null);
            setLoading(true);
            setRetryTrigger((t) => t + 1);
          }}
        />
        <p><Link to="/home" className="tap-target" style={{ display: 'inline-flex' }}>Dashboard</Link></p>
      </>
    );
  }

  return (
    <>
      <h1>Performance</h1>

      <section style={sectionStyle} aria-label="Ratings">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
          {isPremiumTier ? 'PR, TR, MR' : 'Current TR'}
        </h2>
        {isPremiumTier ? (
          <p>
            <strong>PR:</strong> {player?.player_rating != null ? String(player.player_rating) : '—'}
            {' · '}
            <strong>TR:</strong> {player?.training_rating != null ? String(player.training_rating) : '—'}
            {' · '}
            <strong>MR:</strong> {player?.match_rating != null ? String(player.match_rating) : 'N/A'}
          </p>
        ) : (
          <p>{player?.training_rating != null ? String(player.training_rating) : '—'}</p>
        )}
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
                {isPremiumTier && <th style={thTdStyle}>Darts</th>}
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <React.Fragment key={entry.id}>
                  <tr>
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
                    {isPremiumTier && (
                      <td style={thTdStyle}>
                        <button
                          type="button"
                          onClick={() => toggleDarts(entry.id)}
                          aria-expanded={expandedRunId === entry.id}
                          aria-controls={`darts-${entry.id}`}
                          style={{
                            minHeight: 'var(--tap-min, 44px)',
                            minWidth: 'var(--tap-min, 44px)',
                            padding: '0.5rem 0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          {expandedRunId === entry.id ? 'Hide darts' : 'View darts'}
                        </button>
                      </td>
                    )}
                  </tr>
                  {isPremiumTier && expandedRunId === entry.id && (
                    <tr key={`${entry.id}-darts`}>
                      <td style={thTdStyle} colSpan={5}>
                        <div id={`darts-${entry.id}`} role="region" aria-label="Darts for this session">
                          {dartsLoading ? (
                            <LoadingSpinner message="Loading darts…" />
                          ) : dartsForRun.length === 0 ? (
                            <p>No dart data.</p>
                          ) : (
                            <DartsList darts={dartsForRun} />
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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

      {isPremiumTier && (
        <>
          <section style={sectionStyle} aria-label="Trends (last 90 days)">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Trends — last 90 days</h2>
            <p>
              <strong>Session score (avg):</strong>{' '}
              {trendSessionScore90 != null ? `${trendSessionScore90.toFixed(1)}%` : 'No data'}
            </p>
            <p>
              <strong>Singles (avg):</strong>{' '}
              {trendSingles90 != null ? `${trendSingles90.toFixed(1)}%` : '—'}
            </p>
          </section>
          <section style={sectionStyle} aria-label="Trends (all time)">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Trends — all time</h2>
            <p>
              <strong>Session score (avg):</strong>{' '}
              {trendSessionScoreAll != null ? `${trendSessionScoreAll.toFixed(1)}%` : 'No data'}
            </p>
            <p>
              <strong>Singles (avg):</strong>{' '}
              {trendSinglesAll != null ? `${trendSinglesAll.toFixed(1)}%` : '—'}
            </p>
          </section>
        </>
      )}

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
