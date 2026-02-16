import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPlayerById, isDataError } from '@opp/data';
import type { Player } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatRating(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return String(value);
}

const dlStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  gap: '0.25rem 1.5rem',
  margin: '1rem 0',
  maxWidth: '28rem',
};

/** Admin view one player: uses getPlayerById from @opp/data; read-only, same fields as profile view. */
export function AdminPlayerDetailPage() {
  const { supabase } = useSupabase();
  const { id } = useParams<{ id: string }>();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPlayerById(supabase, id)
      .then((data) => {
        if (!cancelled) setPlayer(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(isDataError(err) ? err.message : 'Failed to load player.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, id]);

  if (loading) return <p>Loading…</p>;
  if (error) return <p role="alert" style={{ color: '#c00' }}>{error}</p>;
  if (!player) return <p>Player not found.</p>;

  return (
    <div>
      <p>
        <Link to="/admin/players">← Back to players</Link>
      </p>
      <h1>Player: {player.display_name}</h1>
      <dl style={dlStyle}>
        <dt>Display name</dt>
        <dd>{player.display_name}</dd>
        <dt>Email</dt>
        <dd>{player.email}</dd>
        <dt>Gender</dt>
        <dd>{player.gender ?? '—'}</dd>
        <dt>Age range</dt>
        <dd>{player.age_range ?? '—'}</dd>
        <dt>Date joined</dt>
        <dd>{formatDate(player.date_joined)}</dd>
        <dt>Baseline rating</dt>
        <dd>{formatRating(player.baseline_rating)}</dd>
        <dt>Training rating</dt>
        <dd>{formatRating(player.training_rating)}</dd>
        <dt>Match rating</dt>
        <dd>{formatRating(player.match_rating)}</dd>
        <dt>Player rating</dt>
        <dd>{formatRating(player.player_rating)}</dd>
        <dt>Role</dt>
        <dd>{player.role}</dd>
      </dl>
    </div>
  );
}
