import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PasswordInput } from '../components/PasswordInput';
import { useSupabase } from '../context/SupabaseContext';
import { getAuthErrorMessage } from '../lib/authErrors';

const MIN_PASSWORD_LENGTH = 6;

export function SignUpPage() {
  const { supabase } = useSupabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const valid =
    email.trim().length > 0 &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!valid) return;
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (err) {
        setError(getAuthErrorMessage(err));
        return;
      }
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main style={pageStyle}>
        <h1>Check your email</h1>
        <p>We sent a confirmation link to <strong>{email}</strong>. Click the link to verify your account, then sign in.</p>
        <p><Link to="/sign-in">Go to sign in</Link></p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <h1>Sign up</h1>
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
          Password (min {MIN_PASSWORD_LENGTH} characters)
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
            style={inputStyle}
            aria-label="Password"
          />
        </label>
        <label style={labelStyle}>
          Confirm password
          <PasswordInput
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            style={inputStyle}
            aria-label="Confirm password"
          />
        </label>
        {password && confirmPassword && password !== confirmPassword && (
          <p style={{ color: '#c00', fontSize: '0.9rem' }}>Passwords do not match.</p>
        )}
        <button type="submit" disabled={!valid || loading} style={buttonStyle}>
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p style={{ marginTop: '1.5rem' }}>
        Already have an account? <Link to="/sign-in">Sign in</Link>
      </p>
    </main>
  );
}

const pageStyle: React.CSSProperties = { padding: '2rem', fontFamily: 'system-ui', maxWidth: '24rem' };
const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '1rem' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.25rem' };
const inputStyle: React.CSSProperties = {
  padding: '0.5rem',
  fontSize: '1rem',
  color: 'var(--color-text)',
  backgroundColor: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
};
const buttonStyle: React.CSSProperties = { padding: '0.6rem 1rem', marginTop: '0.5rem', cursor: 'pointer' };
