/**
 * Shell for authenticated + player routes. Logo links to home; nav has Play, Stats (icons), Admin if admin, and avatar (initials + level) on the right. Avatar opens account menu (Profile, Settings, Sign out).
 * Use with AuthGuard and PlayerGuard so only reachable when authenticated and player exists.
 */

import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useSupabase } from '../context/SupabaseContext';
import { NavIcon } from './NavIcon';
import { OppLogo } from './OppLogo';
import OppPlayIcon from '../assets/opp-play.svg?react';
import OppStatsIcon from '../assets/opp-stats.svg?react';

const layoutStyle: React.CSSProperties = {
  fontFamily: 'system-ui',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
};
const navStyle: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  borderBottom: '1px solid var(--color-border)',
  display: 'flex',
  alignItems: 'center',
  gap: '1.25rem',
  flexWrap: 'wrap',
  backgroundColor: 'var(--color-bg)',
  position: 'relative',
};
const linkStyle: React.CSSProperties = {
  color: 'var(--color-text)',
  textDecoration: 'none',
  fontWeight: 500,
  minHeight: 'var(--tap-min, 44px)',
  minWidth: 'var(--tap-min, 44px)',
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.5rem 0',
};
const mainStyle: React.CSSProperties = {
  flex: 1,
  padding: '1.5rem',
};

/** Two letters from nickname (or "?"), uppercased. */
function getInitials(nickname: string | null | undefined): string {
  const s = (nickname ?? '').trim();
  if (s.length >= 2) return s.slice(0, 2).toUpperCase();
  if (s.length === 1) return (s + s).toUpperCase();
  return '?';
}

/** Display level from training_rating or baseline_rating. */
function getDisplayLevel(
  trainingRating: number | null | undefined,
  baselineRating: number | null | undefined
): string {
  const n = trainingRating ?? baselineRating ?? 0;
  return String(Math.round(n));
}

/** Avatar: main circle with initials + overlapping badge with level. */
function PlayerAvatar({
  initials,
  level,
  size = 40,
}: {
  initials: string;
  level: string;
  size?: number;
}) {
  const badgeSize = Math.round(size * 0.5);
  const badgeOffset = Math.round(size * -0.15);
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexShrink: 0,
        width: size,
        height: size,
      }}
      aria-hidden
    >
      <span
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: 'var(--color-avatar-bg, #166534)',
          color: 'var(--color-avatar-fg, #facc15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: Math.round(size * 0.4),
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {initials}
      </span>
      <span
        style={{
          position: 'absolute',
          top: badgeOffset,
          right: badgeOffset,
          width: badgeSize,
          height: badgeSize,
          borderRadius: '50%',
          backgroundColor: 'var(--color-avatar-badge-bg, #facc15)',
          color: 'var(--color-avatar-badge-fg, #166534)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: Math.round(badgeSize * 0.55),
          fontWeight: 700,
          lineHeight: 1,
          border: '2px solid var(--color-bg, #fff)',
          boxSizing: 'border-box',
        }}
      >
        {level}
      </span>
    </span>
  );
}

export function AuthenticatedLayout() {
  const { player, signOut } = useSupabase();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div style={layoutStyle}>
      <nav style={{ ...navStyle, ...(menuOpen ? { zIndex: 100 } : {}) }} aria-label="Main">
        <Link to="/home" style={{ ...linkStyle, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }} aria-label="Home">
          <OppLogo size={64} />
        </Link>
        <Link to="/play" style={linkStyle} aria-label="Play">
          <NavIcon size={24}>
            <OppPlayIcon width={24} height={24} style={{ display: 'block', width: 24, height: 24 }} />
          </NavIcon>
        </Link>
        <Link to="/analyzer" style={linkStyle} aria-label="Stats">
          <NavIcon size={24}>
            <OppStatsIcon width={24} height={24} style={{ display: 'block', width: 24, height: 24 }} />
          </NavIcon>
        </Link>
        {player?.role === 'admin' && (
          <Link to="/admin" style={linkStyle}>Admin</Link>
        )}
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', position: 'relative' }}>
          {player && (
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-label="Account menu"
              title={`${player.nickname ?? 'Player'}, level ${getDisplayLevel(player.training_rating, player.baseline_rating)}`}
              style={{
                minHeight: 'var(--tap-min, 44px)',
                minWidth: 'var(--tap-min, 44px)',
                padding: 0,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                borderRadius: '50%',
              }}
            >
              <PlayerAvatar
                initials={getInitials(player.nickname)}
                level={getDisplayLevel(player.training_rating, player.baseline_rating)}
                size={40}
              />
            </button>
          )}
          {menuOpen && (
            <div
              role="menu"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 2,
                minWidth: 160,
                padding: '0.5rem 0',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 100,
              }}
            >
              <Link to="/profile" style={{ ...linkStyle, display: 'block', padding: '0.6rem 1rem' }} role="menuitem" onClick={closeMenu}>
                Profile
              </Link>
              <Link to="/settings" style={{ ...linkStyle, display: 'block', padding: '0.6rem 1rem' }} role="menuitem" onClick={closeMenu}>
                Settings
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  void signOut();
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.6rem 1rem',
                  textAlign: 'left',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  font: 'inherit',
                  color: 'var(--color-text)',
                  fontWeight: 500,
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </span>
      </nav>
      {menuOpen && (
        <div
          role="presentation"
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          onClick={closeMenu}
          onKeyDown={(e) => e.key === 'Escape' && closeMenu()}
        />
      )}
      <main style={mainStyle}>
        <Outlet />
      </main>
    </div>
  );
}
