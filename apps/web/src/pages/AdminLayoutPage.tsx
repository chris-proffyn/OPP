/**
 * Admin layout: sidebar with Dashboard, Players; content area for child routes.
 * Only rendered when AdminGuard passes (player.role === 'admin').
 */

import { Link, Outlet } from 'react-router-dom';
import { useSupabase } from '../context/SupabaseContext';
import { OppLogo } from '../components/OppLogo';

const layoutStyle: React.CSSProperties = {
  fontFamily: 'system-ui',
  minHeight: '100vh',
  display: 'flex',
};
const sidebarStyle: React.CSSProperties = {
  width: '12rem',
  padding: '1rem',
  borderRight: '1px solid var(--color-border)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  backgroundColor: 'var(--color-bg)',
};
const navLinkStyle: React.CSSProperties = {
  color: 'var(--color-text)',
  textDecoration: 'none',
  minHeight: 'var(--tap-min, 44px)',
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.5rem 0',
};
const contentStyle: React.CSSProperties = {
  flex: 1,
  padding: '1.5rem',
};

export function AdminLayoutPage() {
  const { signOut } = useSupabase();

  return (
    <div style={layoutStyle}>
      <aside style={sidebarStyle} aria-label="Admin navigation">
        <Link
          to="/home"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '1rem',
            color: 'var(--color-text)',
            textDecoration: 'none',
          }}
          aria-label="OPP Home"
        >
          <OppLogo size={80} />
        </Link>
        <strong>Admin</strong>
        <Link to="/admin" style={navLinkStyle}>Dashboard</Link>
        <Link to="/admin/players" style={navLinkStyle}>Players</Link>
        <Link to="/admin/schedules" style={navLinkStyle}>Schedules</Link>
        <Link to="/admin/cohorts" style={navLinkStyle}>Cohorts</Link>
        <Link to="/admin/sessions" style={navLinkStyle}>Sessions</Link>
        <Link to="/admin/routines" style={navLinkStyle}>Routines</Link>
        <Link to="/admin/level-requirements" style={navLinkStyle}>Level requirements</Link>
        <Link to="/admin/level-averages" style={navLinkStyle}>Level averages</Link>
        <Link to="/admin/competitions" style={navLinkStyle}>Competitions</Link>
        <Link to="/admin/checkout-combinations" style={navLinkStyle}>Checkout combinations</Link>
        <Link to="/admin/test-users" style={navLinkStyle}>Test users</Link>
        <span style={{ marginTop: 'auto', paddingTop: '1rem' }}>
          <Link to="/home" style={navLinkStyle}>App</Link>
        </span>
        <button
          type="button"
          onClick={() => void signOut()}
          style={{
            minHeight: 'var(--tap-min, 44px)',
            minWidth: 'var(--tap-min, 44px)',
            padding: '0.5rem 0.75rem',
            cursor: 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          Sign out
        </button>
      </aside>
      <main style={contentStyle}>
        <Outlet />
      </main>
    </div>
  );
}
