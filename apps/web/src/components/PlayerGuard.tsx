/**
 * Use inside AuthGuard. Redirects to /onboarding if the current user has no player row.
 * Use for /home, /profile, /admin/* (so admin area also requires a player).
 */

import { Navigate } from 'react-router-dom';
import { useSupabase } from '../context/SupabaseContext';

export function PlayerGuard({ children }: { children: React.ReactNode }) {
  const { player, playerLoading } = useSupabase();

  if (playerLoading) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
        Loading…
      </div>
    );
  }

  if (!player) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
