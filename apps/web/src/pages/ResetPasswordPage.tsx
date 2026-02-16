import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSupabase } from '../context/SupabaseContext';
import { getAuthErrorMessage } from '../lib/authErrors';

const MIN_PASSWORD_LENGTH = 6;

/**
 * User lands here after clicking the reset link in email. Supabase puts tokens in the URL hash
 * and the client recovers the session. We then let them set a new password via updateUser.
 */
export function ResetPasswordPage() {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const valid =
    password.length >= MIN_PASSWORD_LENGTH &&
    password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!valid) return;
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(getAuthErrorMessage(err));
        return;
      }
      navigate('/sign-in', { replace: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={pageStyle}>
      <h1>Set new password</h1>
      <p>Enter your new password below.</p>
      <form onSubmit={handleSubmit} style={formStyle}>
        {error && (
          <p role="alert" style={{ color: '#c00', marginBottom: '1rem' }}>
            {error}
          </p>
        )}
        <label style={labelStyle}>
          New password (min {MIN_PASSWORD_LENGTH} characters)
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Confirm new password
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            style={inputStyle}
          />
        </label>
        {password && confirmPassword && password !== confirmPassword && (
          <p style={{ color: '#c00', fontSize: '0.9rem' }}>Passwords do not match.</p>
        )}
        <button type="submit" disabled={!valid || loading} style={buttonStyle}>
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
      <p style={{ marginTop: '1.5rem' }}>
        <Link to="/sign-in">Back to sign in</Link>
      </p>
    </main>
  );
}

const pageStyle: React.CSSProperties = { padding: '2rem', fontFamily: 'system-ui', maxWidth: '24rem' };
const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '1rem' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.25rem' };
const inputStyle: React.CSSProperties = { padding: '0.5rem', fontSize: '1rem' };
const buttonStyle: React.CSSProperties = { padding: '0.6rem 1rem', marginTop: '0.5rem', cursor: 'pointer' };
