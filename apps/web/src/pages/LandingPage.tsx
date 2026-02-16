import { Link, Navigate } from 'react-router-dom';
import { useSupabase } from '../context/SupabaseContext';

export function LandingPage() {
  const { user, authLoading, player, playerLoading } = useSupabase();

  if (authLoading || (user && playerLoading)) {
    return <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>Loading…</div>;
  }
  if (user && !player) return <Navigate to="/onboarding" replace />;
  if (user && player) return <Navigate to="/home" replace />;

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Welcome</h1>
      <p>Community-led training. Structured improvement. Earned progress.</p>
      <p>
        <Link to="/sign-in">Sign in</Link> · <Link to="/sign-up">Sign up</Link>
      </p>
    </main>
  );
}
