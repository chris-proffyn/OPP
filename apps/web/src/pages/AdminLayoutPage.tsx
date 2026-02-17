/**
 * Admin layout: sidebar with Dashboard, Players; content area for child routes.
 * Only rendered when AdminGuard passes (player.role === 'admin').
 */

import { Link, Outlet } from 'react-router-dom';
import { useSupabase } from '../context/SupabaseContext';

const layoutStyle: React.CSSProperties = {
  fontFamily: 'system-ui',
  minHeight: '100vh',
  display: 'flex',
};
const sidebarStyle: React.CSSProperties = {
  width: '12rem',
  padding: '1rem',
  borderRight: '1px solid #ccc',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
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
        <strong>Admin</strong>
        <Link to="/admin">Dashboard</Link>
        <Link to="/admin/players">Players</Link>
        <Link to="/admin/schedules">Schedules</Link>
        <Link to="/admin/cohorts">Cohorts</Link>
        <Link to="/admin/sessions">Sessions</Link>
        <Link to="/admin/routines">Routines</Link>
        <Link to="/admin/level-requirements">Level requirements</Link>
        <Link to="/admin/competitions">Competitions</Link>
        <span style={{ marginTop: 'auto', paddingTop: '1rem' }}>
          <Link to="/home">App</Link>
        </span>
        <button type="button" onClick={() => void signOut()}>
          Sign out
        </button>
      </aside>
      <main style={contentStyle}>
        <Outlet />
      </main>
    </div>
  );
}
