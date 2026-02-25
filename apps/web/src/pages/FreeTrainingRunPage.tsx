/**
 * Free Training run start view. Route: /play/free-training/run/:runId (index).
 * Shows "Free Training — [Routine name]" and Start; on Start navigates to step. §8.
 */

import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSessionGameContext } from '../context/SessionGameContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { NavButton } from '../components/NavButton';

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
const sectionStyle: React.CSSProperties = { marginBottom: '1.5rem' };
const buttonTapStyle: React.CSSProperties = {
  minHeight: 'var(--tap-min, 44px)',
  minWidth: 'var(--tap-min, 44px)',
  padding: '0.5rem 0.75rem',
  cursor: 'pointer',
};

export function FreeTrainingRunPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const ctx = useSessionGameContext();
  const gameState = ctx?.gameState;

  useEffect(() => {
    if (!runId || !ctx) return;
    if (gameState?.phase === 'running') {
      navigate(`/play/free-training/run/${runId}/step`, { replace: true });
    } else if (gameState?.phase === 'ended') {
      navigate(`/play/free-training/run/${runId}/summary`, { replace: true });
    }
  }, [runId, ctx, gameState?.phase, navigate]);

  if (!ctx) {
    return (
      <div style={pageStyle}>
        <h1 style={titleStyle}>Free Training</h1>
        <LoadingSpinner message="Loading…" />
      </div>
    );
  }

  if (gameState?.phase === 'loading') {
    return (
      <div style={pageStyle}>
        <h1 style={titleStyle}>Free Training</h1>
        <LoadingSpinner message="Loading…" />
      </div>
    );
  }

  if (gameState?.phase === 'invalid') {
    return (
      <div style={pageStyle}>
        <h1 style={titleStyle}>Free Training</h1>
        <p role="alert" style={{ color: 'var(--color-error, #b91c1c)', marginBottom: '1rem' }}>
          {gameState.message}
        </p>
        <NavButton to="/play/free-training" variant="secondary">← Back to Free Training</NavButton>
      </div>
    );
  }

  if (gameState?.phase === 'ready') {
    const { sessionName, routinesWithSteps, startResume } = ctx;
    const handleStart = async () => {
      await startResume();
      if (runId) navigate(`/play/free-training/run/${runId}/step`);
    };
    return (
      <div style={pageStyle}>
        <h1 style={titleStyle}>{sessionName}</h1>
        <section style={sectionStyle}>
          <p style={{ color: 'var(--color-muted)', margin: '0 0 0.5rem 0' }}>
            {routinesWithSteps.length > 0
              ? routinesWithSteps.map((r) => r.routine.name).join(', ')
              : 'Routine'}
          </p>
          <button type="button" onClick={handleStart} style={buttonTapStyle} className="tap-target">
            Start
          </button>
        </section>
        <p>
          <Link to="/play/free-training" style={{ color: 'var(--color-link)' }}>← Back to Free Training</Link>
        </p>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Free Training</h1>
      <LoadingSpinner message="Loading…" />
    </div>
  );
}
