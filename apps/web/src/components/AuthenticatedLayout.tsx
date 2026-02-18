/**
 * Shell for authenticated + player routes. Shows nav (Home, Profile, Admin if admin, Sign out) and outlet.
 * Use with AuthGuard and PlayerGuard so only reachable when authenticated and player exists.
 */

import { Link, Outlet } from 'react-router-dom';
import { useSupabase } from '../context/SupabaseContext';
import { OppLogo } from './OppLogo';

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

export function AuthenticatedLayout() {
  const { player, signOut } = useSupabase();

  return (
    <div style={layoutStyle}>
      <nav style={navStyle} aria-label="Main">
        <Link to="/home" style={{ ...linkStyle, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }} aria-label="OPP Home">
          <OppLogo size={44} />
        </Link>
        <Link to="/home" style={linkStyle}>Home</Link>
        <Link to="/profile" style={linkStyle}>Profile</Link>
        <Link to="/play" style={linkStyle}>Play</Link>
        <Link to="/analyzer" style={linkStyle}>Performance</Link>
        {player?.role === 'admin' && (
          <Link to="/admin" style={linkStyle}>Admin</Link>
        )}
        <span style={{ marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={() => void signOut()}
            style={{
              minHeight: 'var(--tap-min, 44px)',
              minWidth: 'var(--tap-min, 44px)',
              padding: '0.5rem 0.75rem',
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </span>
      </nav>
      <main style={mainStyle}>
        <Outlet />
      </main>
    </div>
  );
}
