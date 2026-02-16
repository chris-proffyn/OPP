/**
 * Renders children only when authenticated. Otherwise redirects to /sign-in.
 * Use for routes that require login: /onboarding, /home, /profile, /admin/*
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useSupabase } from '../context/SupabaseContext';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useSupabase();
  const location = useLocation();

  if (authLoading) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
