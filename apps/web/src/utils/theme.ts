/**
 * P8 §14 — Dark mode. Preference: light | dark | system. Stored in localStorage; applied to document.
 */

const STORAGE_KEY = 'opp-theme';
export type ThemePreference = 'light' | 'dark' | 'system';

function getStored(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  return 'system';
}

export function getThemePreference(): ThemePreference {
  return getStored();
}

export function getEffectiveTheme(): 'light' | 'dark' {
  const pref = getStored();
  if (pref === 'light') return 'light';
  if (pref === 'dark') return 'dark';
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function applyToDocument() {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = getEffectiveTheme();
}

export function setThemePreference(pref: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* ignore */
  }
  applyToDocument();
  window.dispatchEvent(new CustomEvent('opp-theme-change', { detail: pref }));
}

/** Call once on app load to apply stored preference and listen for system changes. */
export function initTheme(): void {
  applyToDocument();
  if (typeof window === 'undefined') return;
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStored() === 'system') applyToDocument();
  });
}
