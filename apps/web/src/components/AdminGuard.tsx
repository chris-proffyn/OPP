/**
 * Use inside AuthGuard + PlayerGuard. Redirects to /home if the current player is not admin.
 * Use for /admin and all /admin/* routes.
 */

import { Navigate } from 'react-router-dom';
import { useSupabase } from '../context/SupabaseContext';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { player } = useSupabase();

  if (player && player.role !== 'admin') {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
