import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../context/SupabaseContext';
import { getAuthErrorMessage } from '../lib/authErrors';

export function ForgotPasswordPage() {
  const { supabase } = useSupabase();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const redirectTo = `${window.location.origin}/reset-password`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (err) {
        setError(getAuthErrorMessage(err));
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <main style={pageStyle}>
        <h1>Check your email</h1>
        <p>If an account exists for <strong>{email}</strong>, we sent a password reset link. Click the link in the email to set a new password.</p>
        <p><Link to="/sign-in">Back to sign in</Link></p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <h1>Forgot password</h1>
      <p>Enter your email and we’ll send you a link to reset your password.</p>
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
        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? 'Sending…' : 'Send reset link'}
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
