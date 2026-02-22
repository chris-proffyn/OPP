import { updatePlayer } from '@opp/data';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../context/SupabaseContext';
import { hasCompletedITA } from '../utils/ita';
import { getThemePreference, setThemePreference } from '../utils/theme';
import type { ThemePreference } from '../utils/theme';

export type ScoreInputMode = 'voice' | 'manual';

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
  const { player, supabase, refetchPlayer } = useSupabase();
  const [themePref, setThemePref] = useState<ThemePreference>(() => getThemePreference());
  const [scoreInputMode, setScoreInputMode] = useState<ScoreInputMode>(() => (player?.score_input_mode ?? 'manual') as ScoreInputMode);
  const [scoreModeSaving, setScoreModeSaving] = useState(false);
  const [scoreModeError, setScoreModeError] = useState<string | null>(null);

  // Sync from player when it loads or changes (e.g. after refetch)
  useEffect(() => {
    const mode = (player?.score_input_mode ?? 'manual') as ScoreInputMode;
    setScoreInputMode(mode);
  }, [player?.score_input_mode]);

  const onThemeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as ThemePreference;
    setThemePreference(v);
    setThemePref(v);
  }, []);

  const onScoreInputModeChange = useCallback(
    async (mode: ScoreInputMode) => {
      if (!supabase || mode === scoreInputMode || scoreModeSaving) return;
      setScoreModeError(null);
      setScoreModeSaving(true);
      try {
        await updatePlayer(supabase, { score_input_mode: mode });
        setScoreInputMode(mode);
        await refetchPlayer();
      } catch (e) {
        setScoreModeError(e instanceof Error ? e.message : 'Failed to save');
      } finally {
        setScoreModeSaving(false);
      }
    },
    [supabase, scoreInputMode, scoreModeSaving, refetchPlayer]
  );

  useEffect(() => {
    const handler = () => setThemePref(getThemePreference());
    window.addEventListener('opp-theme-change', handler);
    return () => window.removeEventListener('opp-theme-change', handler);
  }, []);

  if (!player) return null;

  const showCompleteITA = !hasCompletedITA(player);

  return (
    <>
      <h1>Profile</h1>
      {showCompleteITA && (
        <section style={{ marginBottom: '1.5rem' }}>
          <p style={{ marginBottom: '0.5rem' }}>
            <Link to="/play/ita" style={{ ...linkStyle, display: 'inline-flex', alignItems: 'center', minHeight: 'var(--tap-min, 44px)' }}>
              Complete ITA
            </Link>
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-muted, #525252)', margin: 0 }}>
            Required before other sessions
          </p>
        </section>
      )}
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
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Score Input Mode</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-muted, #525252)', margin: '0 0 0.5rem 0' }}>
          Default way to enter scores during practice (you can still switch during a step).
        </p>
        <div
          role="group"
          aria-label="Score input mode"
          style={{ display: 'flex', gap: 0, flexWrap: 'wrap', maxWidth: '20rem' }}
        >
          <button
            type="button"
            onClick={() => onScoreInputModeChange('voice')}
            disabled={scoreModeSaving}
            style={{
              ...toggleButtonStyle,
              ...(scoreInputMode === 'voice' ? toggleButtonActiveStyle : {}),
            }}
            aria-pressed={scoreInputMode === 'voice'}
            aria-label="Voice"
          >
            Voice
          </button>
          <button
            type="button"
            onClick={() => onScoreInputModeChange('manual')}
            disabled={scoreModeSaving}
            style={{
              ...toggleButtonStyle,
              ...(scoreInputMode === 'manual' ? toggleButtonActiveStyle : {}),
            }}
            aria-pressed={scoreInputMode === 'manual'}
            aria-label="Manual"
          >
            Manual
          </button>
        </div>
        {scoreModeError && (
          <p role="alert" style={{ marginTop: '0.5rem', color: 'var(--color-error, #b91c1c)', fontSize: '0.9rem' }}>
            {scoreModeError}
          </p>
        )}
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
        {player.ita_score != null && (
          <>
            <dt>ITA score</dt>
            <dd>{formatRating(player.ita_score)}</dd>
          </>
        )}
        {player.ita_completed_at != null && (
          <>
            <dt>ITA completed</dt>
            <dd>{formatDate(player.ita_completed_at)}</dd>
          </>
        )}
        <dt>Match rating</dt>
        <dd>{formatRating(player.match_rating)}</dd>
        <dt>Player rating</dt>
        <dd>{formatRating(player.player_rating)}</dd>
      </dl>
      <p>
        <Link to="/profile/edit" style={linkStyle}>
          Edit profile
        </Link>
        {' · '}
        <Link to="/profile/checkout-variations" style={linkStyle}>
          Checkout preferences
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
const toggleButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  fontSize: '1rem',
  minHeight: 'var(--tap-min, 44px)',
  border: '1px solid var(--color-border, #e5e7eb)',
  backgroundColor: 'var(--color-bg, #fff)',
  cursor: 'pointer',
};
const toggleButtonActiveStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-primary-bg, #0ea5e9)',
  color: 'var(--color-primary-text, #fff)',
  borderColor: 'var(--color-primary-bg, #0ea5e9)',
};
