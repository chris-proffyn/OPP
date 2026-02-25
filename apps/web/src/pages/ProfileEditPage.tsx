import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isDataError, updatePlayer } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';

const AGE_RANGES = ['0-19', '20-29', '30-39', '40-49', '50-59', '60+'] as const;
const GENDER_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'm', label: 'Male' },
  { value: 'f', label: 'Female' },
  { value: 'd', label: 'Diverse' },
] as const;

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

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

/** Profile edit: same fields as onboarding; uses updatePlayer from @opp/data only. */
export function ProfileEditPage() {
  const { supabase, player, refetchPlayer } = useSupabase();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(player?.nickname ?? '');
  const [fullName, setFullName] = useState(player?.full_name ?? '');
  const [email, setEmail] = useState(player?.email ?? '');
  const [gender, setGender] = useState<string>(player?.gender ?? '');
  const [ageRange, setAgeRange] = useState<string>(player?.age_range ?? '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const valid =
    nickname.trim().length > 0 &&
    email.trim().length > 0 &&
    isValidEmail(email);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!valid || !player) return;
    setLoading(true);
    try {
      await updatePlayer(supabase, {
        nickname: nickname.trim(),
        email: email.trim(),
        full_name: fullName.trim() || null,
        gender: gender || null,
        age_range: ageRange || null,
      });
      await refetchPlayer();
      setSuccess(true);
      setTimeout(() => navigate('/profile', { replace: true }), 1200);
    } catch (err) {
      setError(
        isDataError(err)
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (!player) return null;

  return (
    <>
      <h1>Edit profile</h1>
      {success && (
        <p role="status" style={{ color: '#0a0', marginBottom: '1rem' }}>
          Profile saved. Redirecting…
        </p>
      )}
      <form onSubmit={handleSubmit} style={formStyle}>
        {error && (
          <p role="alert" style={{ color: '#c00', marginBottom: '1rem' }}>
            {error}
          </p>
        )}
        <label style={labelStyle}>
          Nickname <span style={{ color: '#666' }}>(required)</span>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            autoComplete="nickname"
            required
            placeholder="e.g. Barry26"
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Full name <span style={{ color: '#666' }}>(optional)</span>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            placeholder="e.g. Barry Smith"
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
          <p style={{ color: '#c00', fontSize: '0.9rem' }}>
            Please enter a valid email address.
          </p>
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
          {loading ? 'Saving…' : 'Save'}
        </button>
      </form>
    </>
  );
}
