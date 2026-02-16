/**
 * Shell for authenticated + player routes. Shows nav (Home, Profile, Admin if admin, Sign out) and outlet.
 * Use with AuthGuard and PlayerGuard so only reachable when authenticated and player exists.
 */

import { Link, Outlet } from 'react-router-dom';
import { useSupabase } from '../context/SupabaseContext';

const layoutStyle: React.CSSProperties = {
  fontFamily: 'system-ui',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
};
const navStyle: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  borderBottom: '1px solid #ccc',
  display: 'flex',
  alignItems: 'center',
  gap: '1.25rem',
  flexWrap: 'wrap',
  backgroundColor: '#f0f0f0',
};
const linkStyle: React.CSSProperties = {
  color: '#1a1a1a',
  textDecoration: 'none',
  fontWeight: 500,
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
        <Link to="/home" style={linkStyle}>Home</Link>
        <Link to="/profile" style={linkStyle}>Profile</Link>
        <Link to="/play" style={linkStyle}>Play</Link>
        <Link to="/analyzer" style={linkStyle}>Performance</Link>
        {player?.role === 'admin' && (
          <Link to="/admin" style={linkStyle}>Admin</Link>
        )}
        <span style={{ marginLeft: 'auto' }}>
          <button type="button" onClick={() => void signOut()}>
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
