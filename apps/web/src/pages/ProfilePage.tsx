import { Link } from 'react-router-dom';
import { useSupabase } from '../context/SupabaseContext';

/** Format ISO date for display */
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

/** Profile view: read-only; player loaded via context (getCurrentPlayer in SupabaseContext). */
export function ProfilePage() {
  const { player } = useSupabase();

  if (!player) return null;

  return (
    <>
      <h1>Profile</h1>
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
      </dl>
      <p>
        <Link to="/profile/edit" style={linkStyle}>
          Edit profile
        </Link>
      </p>
    </>
  );
}

const dlStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  gap: '0.25rem 1.5rem',
  margin: '1rem 0',
  maxWidth: '28rem',
};
const linkStyle: React.CSSProperties = {
  color: 'inherit',
  fontWeight: 500,
};
