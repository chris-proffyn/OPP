import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPlayer, isDataError } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

const AGE_RANGES = ['20-29', '30-39', '40-49', '50-59', '60+'] as const;
const GENDER_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'm', label: 'Male' },
  { value: 'f', label: 'Female' },
  { value: 'd', label: 'Diverse' },
] as const;

/** Basic email format: has @ and a dot in the domain part */
function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export function OnboardingPage() {
  const { supabase, refetchPlayer } = useSupabase();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<string>('');
  const [ageRange, setAgeRange] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const valid =
    displayName.trim().length > 0 &&
    email.trim().length > 0 &&
    isValidEmail(email);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!valid) return;
    setLoading(true);
    try {
      await createPlayer(supabase, {
        display_name: displayName.trim(),
        email: email.trim(),
        gender: gender || null,
        age_range: ageRange || null,
      });
      await refetchPlayer();
      navigate('/home', { replace: true });
    } catch (err) {
      if (isDataError(err) && err.code === 'CONFLICT') {
        setError('You already have a profile.');
        setLoading(false);
        await refetchPlayer();
        setTimeout(() => navigate('/home', { replace: true }), 1500);
        return;
      }
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={pageStyle}>
      <h1>Complete your profile</h1>
      <p>Tell us a bit about yourself to get started.</p>
      <form onSubmit={handleSubmit} style={formStyle}>
        {error && (
          <p role="alert" style={{ color: '#c00', marginBottom: '1rem' }}>
            {error}
          </p>
        )}
        <label style={labelStyle}>
          Display name <span style={{ color: '#666' }}>(required)</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="nickname"
            required
            placeholder="e.g. Barry26"
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Email <span style={{ color: '#666' }}>(required)</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            style={inputStyle}
          />
        </label>
        {email.trim() && !isValidEmail(email) && (
          <p style={{ color: '#c00', fontSize: '0.9rem' }}>Please enter a valid email address.</p>
        )}
        <label style={labelStyle}>
          Gender <span style={{ color: '#666' }}>(optional)</span>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            style={inputStyle}
          >
            {GENDER_OPTIONS.map(({ value, label }) => (
              <option key={value || 'none'} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Age range <span style={{ color: '#666' }}>(optional)</span>
          <select
            value={ageRange}
            onChange={(e) => setAgeRange(e.target.value)}
            style={inputStyle}
          >
            <option value="">Select…</option>
            {AGE_RANGES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={!valid || loading} style={buttonStyle}>
          {loading ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  padding: '2rem',
  fontFamily: 'system-ui',
  maxWidth: '24rem',
};
const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};
const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
};
const inputStyle: React.CSSProperties = {
  padding: '0.5rem',
  fontSize: '1rem',
};
const buttonStyle: React.CSSProperties = {
  padding: '0.6rem 1rem',
  marginTop: '0.5rem',
  cursor: 'pointer',
};
