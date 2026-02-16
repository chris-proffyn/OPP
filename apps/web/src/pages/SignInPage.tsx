import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSupabase } from '../context/SupabaseContext';
import { getAuthErrorMessage } from '../lib/authErrors';

export function SignInPage() {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/home';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) {
        setError(getAuthErrorMessage(err));
        return;
      }
      navigate(from, { replace: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={pageStyle}>
      <h1>Sign in</h1>
      <form onSubmit={handleSubmit} style={formStyle}>
        {error && (
          <p role="alert" style={{ color: '#c00', marginBottom: '1rem' }}>
            {error}
          </p>
        )}
        <label style={labelStyle}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            style={inputStyle}
          />
        </label>
        <p style={{ fontSize: '0.9rem' }}>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p style={{ marginTop: '1.5rem' }}>
        Don’t have an account? <Link to="/sign-up">Sign up</Link>
      </p>
    </main>
  );
}

const pageStyle: React.CSSProperties = { padding: '2rem', fontFamily: 'system-ui', maxWidth: '24rem' };
const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '1rem' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.25rem' };
const inputStyle: React.CSSProperties = { padding: '0.5rem', fontSize: '1rem' };
const buttonStyle: React.CSSProperties = { padding: '0.6rem 1rem', marginTop: '0.5rem', cursor: 'pointer' };
