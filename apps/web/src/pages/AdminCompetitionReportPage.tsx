/**
 * P8 §8.2 — Admin competition report. getCompetitionReport(client, competitionId).
 * Route: /admin/competitions/:id/report. Matches table + summary by player.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCompetitionReport, isDataError } from '@opp/data';
import type { CompetitionReport } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

const sectionStyle: React.CSSProperties = { marginBottom: '1.5rem' };
const tableStyle: React.CSSProperties = { borderCollapse: 'collapse', width: '100%', maxWidth: '56rem' };
const thTdStyle: React.CSSProperties = { border: '1px solid #ccc', padding: '0.5rem 0.75rem', textAlign: 'left' };

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function AdminCompetitionReportPage() {
  const { supabase } = useSupabase();
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<CompetitionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    getCompetitionReport(supabase, id)
      .then(setReport)
      .catch((err) => {
        setNotFound(isDataError(err) && (err as { code?: string }).code === 'NOT_FOUND');
        setError(isDataError(err) ? err.message : 'Competition report could not be loaded. Try again.');
      })
      .finally(() => setLoading(false));
  }, [supabase, id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSpinner message="Loading competition report…" />;
  if (notFound || (!report && error)) return <p>Competition not found.</p>;
  if (error && !report) return <ErrorMessage message={error} onRetry={load} />;
  if (!report) return null;

  const { competition, matches, summary } = report;

  return (
    <div>
      <h1>Competition report: {competition.name}</h1>
      <p>
        <Link to="/admin/competitions" style={{ minHeight: 'var(--tap-min, 44px)', display: 'inline-flex', alignItems: 'center' }}>← Competitions</Link>
        {' · '}
        <Link to={`/admin/competitions/${id}`} style={{ minHeight: 'var(--tap-min, 44px)', display: 'inline-flex', alignItems: 'center' }}>View competition</Link>
        {' · '}
        <Link to={`/admin/competitions/${id}/edit`} style={{ minHeight: 'var(--tap-min, 44px)', display: 'inline-flex', alignItems: 'center' }}>Edit</Link>
      </p>
      <section style={sectionStyle}>
        <p><strong>Type:</strong> {competition.competition_type}</p>
        <p><strong>Scheduled:</strong> {competition.scheduled_at ? formatDateTime(competition.scheduled_at) : '—'}</p>
      </section>
      <section style={sectionStyle}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Summary by player</h2>
        {summary.length === 0 ? (
          <p>No players with matches.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thTdStyle}>Player</th>
                <th style={thTdStyle}>Matches</th>
                <th style={thTdStyle}>Wins</th>
                <th style={thTdStyle}>Losses</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => (
                <tr key={row.player_id}>
                  <td style={thTdStyle}>{row.display_name ?? row.player_id.slice(0, 8)}</td>
                  <td style={thTdStyle}>{row.match_count}</td>
                  <td style={thTdStyle}>{row.wins}</td>
                  <td style={thTdStyle}>{row.losses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section style={sectionStyle}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Matches</h2>
        {matches.length === 0 ? (
          <p>No matches recorded for this competition.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thTdStyle}>Player</th>
                <th style={thTdStyle}>Opponent</th>
                <th style={thTdStyle}>Played</th>
                <th style={thTdStyle}>Result</th>
                <th style={thTdStyle}>MR</th>
                <th style={thTdStyle}>Eligible</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id}>
                  <td style={thTdStyle}>{m.player_display_name ?? m.player_id.slice(0, 8)}</td>
                  <td style={thTdStyle}>{m.opponent_display_name ?? m.opponent_id.slice(0, 8)}</td>
                  <td style={thTdStyle}>{formatDateTime(m.played_at)}</td>
                  <td style={thTdStyle}>{m.result}</td>
                  <td style={thTdStyle}>{Number(m.match_rating).toFixed(1)}</td>
                  <td style={thTdStyle}>{m.eligible ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
