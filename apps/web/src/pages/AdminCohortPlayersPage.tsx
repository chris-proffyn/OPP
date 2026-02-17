/**
 * Admin drill-down: Cohorts → Players. Lists cohort members with links to player and sessions.
 * Route: /admin/cohorts/:id/players.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCohortById, listCohortMembers, isDataError } from '@opp/data';
import type { CohortMemberWithPlayer } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

const tableStyle: React.CSSProperties = { borderCollapse: 'collapse', width: '100%', maxWidth: '40rem' };
const thTdStyle: React.CSSProperties = { border: '1px solid #ccc', padding: '0.5rem 0.75rem', textAlign: 'left' };
const linkStyle: React.CSSProperties = { minHeight: 'var(--tap-min, 44px)', display: 'inline-flex', alignItems: 'center' };

export function AdminCohortPlayersPage() {
  const { supabase } = useSupabase();
  const { id } = useParams<{ id: string }>();
  const [cohortName, setCohortName] = useState<string | null>(null);
  const [members, setMembers] = useState<CohortMemberWithPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    Promise.all([getCohortById(supabase, id), listCohortMembers(supabase, id)])
      .then(([cohortData, memberList]) => {
        if (cohortData) {
          setCohortName(cohortData.cohort.name);
          setMembers(memberList);
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Failed to load cohort players.');
      })
      .finally(() => setLoading(false));
  }, [supabase, id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSpinner message="Loading players…" />;
  if (notFound) return <p>Cohort not found.</p>;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  return (
    <div>
      <h1>Players: {cohortName ?? id}</h1>
      <p>
        <Link to="/admin/cohorts" style={linkStyle}>← Cohorts</Link>
        {' · '}
        <Link to={`/admin/cohorts/${id}`} style={linkStyle}>Edit cohort</Link>
        {' · '}
        <Link to={`/admin/cohorts/${id}/calendar`} style={linkStyle}>Calendar</Link>
        {' · '}
        <Link to={`/admin/cohorts/${id}/report`} style={linkStyle}>Report</Link>
      </p>
      <section style={{ marginTop: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Cohort members</h2>
        {members.length === 0 ? (
          <p>No members in this cohort.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thTdStyle}>Player</th>
                <th style={thTdStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td style={thTdStyle}>
                    <Link to={`/admin/players/${m.player_id}`} style={linkStyle}>
                      {m.display_name ?? m.player_id.slice(0, 8)}
                    </Link>
                  </td>
                  <td style={thTdStyle}>
                    <Link to={`/admin/players/${m.player_id}/sessions`} style={linkStyle}>Sessions</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
