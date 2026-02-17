import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../context/SupabaseContext';
import { getThemePreference, setThemePreference } from '../utils/theme';
import type { ThemePreference } from '../utils/theme';

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

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System (follow device)' },
];

/** Profile view: read-only; player loaded via context (getCurrentPlayer in SupabaseContext). */
export function ProfilePage() {
  const { player } = useSupabase();
  const [themePref, setThemePref] = useState<ThemePreference>(() => getThemePreference());

  const onThemeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as ThemePreference;
    setThemePreference(v);
    setThemePref(v);
  }, []);

  useEffect(() => {
    const handler = () => setThemePref(getThemePreference());
    window.addEventListener('opp-theme-change', handler);
    return () => window.removeEventListener('opp-theme-change', handler);
  }, []);

  if (!player) return null;

  return (
    <>
      <h1>Profile</h1>
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Appearance</h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span>Theme</span>
          <select
            value={themePref}
            onChange={onThemeChange}
            style={{ padding: '0.35rem 0.5rem', fontSize: '1rem', minHeight: 'var(--tap-min, 44px)' }}
            aria-label="Theme preference"
          >
            {THEME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </section>
      <dl style={dlStyle}>
        <dt>Nickname</dt>
        <dd>{player.nickname}</dd>
        <dt>Full name</dt>
        <dd>{player.full_name ?? '—'}</dd>
        <dt>Email</dt>
        <dd>{player.email}</dd>
        <dt>Gender</dt>
        <dd>{player.gender ?? '—'}</dd>
        <dt>Age range</dt>
        <dd>{player.age_range ?? '—'}</dd>
        <dt>Date joined</dt>
        <dd>{formatDate(player.date_joined)}</dd>
        <dt>Tier</dt>
        <dd>{player.tier ?? 'free'}</dd>
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
