/**
 * P7 — Admin competition detail: competition info + matches (listMatchesForCompetition). Player/opponent names via listPlayers.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getCompetitionById,
  listMatchesForCompetition,
  listPlayers,
  isDataError,
} from '@opp/data';
import type { Competition, Match } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

const tableStyle: React.CSSProperties = {
  borderCollapse: 'collapse',
  width: '100%',
  maxWidth: '56rem',
};
const thTdStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '0.5rem 0.75rem',
  textAlign: 'left',
};

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function AdminCompetitionDetailPage() {
  const { supabase } = useSupabase();
  const { id } = useParams<{ id: string }>();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [playerMap, setPlayerMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    Promise.all([
      getCompetitionById(supabase, id),
      listMatchesForCompetition(supabase, id),
      listPlayers(supabase),
    ])
      .then(([comp, matchList, players]) => {
        const map: Record<string, string> = {};
        players.forEach((p) => { map[p.id] = p.display_name ?? p.id.slice(0, 8); });
        setPlayerMap(map);
        if (comp) {
          setCompetition(comp);
          setMatches(matchList);
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Failed to load competition.');
      })
      .finally(() => setLoading(false));
  }, [supabase, id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p>Loading…</p>;
  if (notFound || !competition) return <p>Competition not found.</p>;
  if (error) return <p role="alert" style={{ color: '#c00' }}>{error}</p>;

  return (
    <div>
      <h1>{competition.name}</h1>
      <p>
        <Link to="/admin/competitions">← Competitions</Link>
        {' · '}
        <Link to={`/admin/competitions/${id}/edit`}>Edit</Link>
      </p>
      <section style={{ marginBottom: '1.5rem' }}>
        <p><strong>Type:</strong> {competition.competition_type}</p>
        <p><strong>Scheduled:</strong> {competition.scheduled_at ? formatDateTime(competition.scheduled_at) : '—'}</p>
        <p><strong>Format:</strong> {competition.format_legs != null ? `Best of ${competition.format_legs}` : '—'}
          {competition.format_target != null ? ` · ${competition.format_target}` : ''}
        </p>
      </section>
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
                <td style={thTdStyle}>{playerMap[m.player_id] ?? m.player_id}</td>
                <td style={thTdStyle}>{playerMap[m.opponent_id] ?? m.opponent_id}</td>
                <td style={thTdStyle}>{formatDateTime(m.played_at)}</td>
                <td style={thTdStyle}>{m.legs_won}–{m.legs_lost}</td>
                <td style={thTdStyle}>{Number(m.match_rating).toFixed(1)}</td>
                <td style={thTdStyle}>{m.eligible ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
