/**
 * Free Training list. Route: /play/free-training.
 * Platinum only (gate on Play landing). Lists routines with View steps and Play.
 * Per OPP_EXTRA_TRAINING_IMPLEMENTATION_CHECKLIST §7.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createFreeTrainingRun, listRoutinesForPlayer, isDataError } from '@opp/data';
import type { Routine } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

const pageStyle: React.CSSProperties = {
  padding: '0 0.5rem 2rem',
  maxWidth: '36rem',
  margin: '0 auto',
};
const titleStyle: React.CSSProperties = {
  margin: '0 0 0.5rem 0',
  fontSize: '1.5rem',
  fontWeight: 700,
  color: 'var(--color-text)',
};
const introStyle: React.CSSProperties = {
  margin: '0 0 1rem 0',
  fontSize: '0.9rem',
  color: 'var(--color-muted)',
  lineHeight: 1.4,
};
const listStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
};
const cardStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  boxSizing: 'border-box',
};
const cardNameStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: '1rem',
  margin: '0 0 0.25rem 0',
  color: 'var(--color-text)',
};
const cardDescStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: 'var(--color-muted)',
  margin: '0 0 0.5rem 0',
  lineHeight: 1.35,
};
const actionsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  alignItems: 'center',
};
const linkStyle: React.CSSProperties = {
  color: 'var(--color-link)',
  fontSize: '0.9rem',
  textDecoration: 'underline',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
};

function descriptionSnippet(desc: string | null): string {
  if (!desc) return '';
  return desc.length > 80 ? `${desc.slice(0, 80)}…` : desc;
}

export function FreeTrainingPage() {
  const { supabase, player } = useSupabase();
  const navigate = useNavigate();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingRunId, setStartingRunId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    listRoutinesForPlayer(supabase)
      .then(setRoutines)
      .catch((err) => {
        setError(isDataError(err) ? err.message : 'Could not load routines. Try again.');
      })
      .finally(() => setLoading(false));
  }, [supabase]);

  const handlePlay = async (routineId: string) => {
    if (!player?.id || !supabase) return;
    setError(null);
    setStartingRunId(routineId);
    try {
      const run = await createFreeTrainingRun(supabase, player.id, routineId);
      navigate(`/play/free-training/run/${run.id}`);
    } catch (err) {
      setError(isDataError(err) ? err.message : 'Could not start routine. Try again.');
    } finally {
      setStartingRunId(null);
    }
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <h1 style={titleStyle}>Free Training</h1>
        <LoadingSpinner message="Loading routines…" />
      </div>
    );
  }

  if (error && routines.length === 0) {
    return (
      <div style={pageStyle}>
        <h1 style={titleStyle}>Free Training</h1>
        <ErrorMessage message={error} onRetry={() => window.location.reload()} />
        <p style={{ marginTop: '0.5rem' }}>
          <Link to="/play" style={{ color: 'var(--color-link)' }}>← Back to Play</Link>
        </p>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Free Training</h1>
      <p style={introStyle}>
        Platinum only. Play any routine; scores are saved but don't count toward your schedule.
      </p>
      <p style={{ marginBottom: '1rem' }}>
        <Link to="/play" style={{ color: 'var(--color-link)', fontSize: '0.9rem' }}>← Back to Play</Link>
      </p>

      {error && (
        <p role="alert" style={{ color: 'var(--color-error, #b91c1c)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
          {error}
        </p>
      )}

      {routines.length === 0 ? (
        <p style={{ color: 'var(--color-muted)' }}>No routines available.</p>
      ) : (
        <ul style={listStyle} role="list">
          {routines.map((r) => (
            <li key={r.id} style={cardStyle}>
              <div style={cardNameStyle}>{r.name}</div>
              {r.description && (
                <p style={cardDescStyle}>{descriptionSnippet(r.description)}</p>
              )}
              <div style={actionsStyle}>
                <Link to={`/play/free-training/routine/${r.id}`} style={linkStyle}>
                  View steps
                </Link>
                <span style={{ color: 'var(--color-muted)' }}>·</span>
                <button
                  type="button"
                  onClick={() => handlePlay(r.id)}
                  disabled={startingRunId !== null}
                  className="tap-target"
                  style={{
                    padding: '0.35rem 0.6rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'var(--color-primary-contrast)',
                    backgroundColor: 'var(--color-primary)',
                    border: 'none',
                    borderRadius: 6,
                    cursor: startingRunId !== null ? 'wait' : 'pointer',
                  }}
                >
                  {startingRunId === r.id ? 'Starting…' : 'Play'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
