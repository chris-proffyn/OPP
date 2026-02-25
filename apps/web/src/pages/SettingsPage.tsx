/**
 * Settings page. App preferences (e.g. Appearance / theme).
 */

import { useCallback, useEffect, useState } from 'react';
import { getThemePreference, setThemePreference } from '../utils/theme';
import type { ThemePreference } from '../utils/theme';
import { NavButton } from '../components/NavButton';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System (follow device)' },
];

export function SettingsPage() {
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

  return (
    <>
      <h1>Settings</h1>
      <section style={{ marginBottom: '1.5rem' }} aria-label="Appearance">
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
      <p>
        <NavButton to="/home" variant="secondary">← Back to Dashboard</NavButton>
      </p>
    </>
  );
}
