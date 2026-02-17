/**
 * P8 §8.1 — Admin cohort performance report. getCohortPerformanceReport(client, cohortId).
 * Route: /admin/cohorts/:id/report.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCohortById, getCohortPerformanceReport, isDataError } from '@opp/data';
import type { CohortPerformanceReport } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

const sectionStyle: React.CSSProperties = { marginBottom: '1.5rem' };
const tableStyle: React.CSSProperties = { borderCollapse: 'collapse', width: '100%', maxWidth: '56rem' };
const thTdStyle: React.CSSProperties = { border: '1px solid #ccc', padding: '0.5rem 0.75rem', textAlign: 'left' };

export function AdminCohortReportPage() {
  const { supabase } = useSupabase();
  const { id } = useParams<{ id: string }>();
  const [cohortName, setCohortName] = useState<string | null>(null);
  const [report, setReport] = useState<CohortPerformanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    Promise.all([getCohortById(supabase, id), getCohortPerformanceReport(supabase, id)])
      .then(([cohortData, reportData]) => {
        if (cohortData) {
          setCohortName(cohortData.cohort.name);
          setReport(reportData);
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Cohort report could not be loaded. Try again.');
      })
      .finally(() => setLoading(false));
  }, [supabase, id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSpinner message="Loading cohort report…" />;
  if (notFound) return <p>Cohort not found.</p>;
  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!report) return null;

  return (
    <div>
      <h1>Cohort performance: {cohortName ?? report.cohortId}</h1>
      <p>
        <Link to="/admin/cohorts" style={{ minHeight: 'var(--tap-min, 44px)', display: 'inline-flex', alignItems: 'center' }}>← Cohorts</Link>
        {' · '}
        <Link to={`/admin/cohorts/${id}`} style={{ minHeight: 'var(--tap-min, 44px)', display: 'inline-flex', alignItems: 'center' }}>Edit cohort</Link>
        {' · '}
        <Link to={`/admin/cohorts/${id}/players`} style={{ minHeight: 'var(--tap-min, 44px)', display: 'inline-flex', alignItems: 'center' }}>Players</Link>
        {' · '}
        <Link to={`/admin/cohorts/${id}/calendar`} style={{ minHeight: 'var(--tap-min, 44px)', display: 'inline-flex', alignItems: 'center' }}>Calendar</Link>
      </p>
      <section style={sectionStyle}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Performance by player</h2>
        {report.rows.length === 0 ? (
          <p>No members in this cohort.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thTdStyle}>Player</th>
                <th style={thTdStyle}>Sessions planned</th>
                <th style={thTdStyle}>Sessions completed</th>
                <th style={thTdStyle}>Completion %</th>
                <th style={thTdStyle}>Avg session score</th>
                <th style={thTdStyle}>TR</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row.player_id}>
                  <td style={thTdStyle}>
                    <Link to={`/admin/players/${row.player_id}`}>{row.display_name ?? row.player_id.slice(0, 8)}</Link>
                    {' · '}
                    <Link to={`/admin/players/${row.player_id}/sessions`}>Sessions</Link>
                  </td>
                  <td style={thTdStyle}>{row.sessions_planned}</td>
                  <td style={thTdStyle}>{row.sessions_completed}</td>
                  <td style={thTdStyle}>
                    {row.sessions_planned > 0 ? `${(row.completion_pct * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td style={thTdStyle}>
                    {row.average_session_score != null ? `${row.average_session_score.toFixed(1)}%` : '—'}
                  </td>
                  <td style={thTdStyle}>{row.training_rating != null ? String(row.training_rating) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
