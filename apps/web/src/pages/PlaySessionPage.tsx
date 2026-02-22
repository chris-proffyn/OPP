/**
 * Game screen for one calendar session. Session-level view only; step-level UI is on RoutineStepPage.
 * State lives in SessionGameContext (§8). P4 §10: start/resume, routine loop, session end.
 */

import { Link, useNavigate } from 'react-router-dom';
import { ROUTINE_TYPES, sessionScore } from '@opp/data';
import {
  getDartsPerStep,
  getLevelReqForStep,
  levelToDecade,
  useSessionGameContext,
} from '../context/SessionGameContext';
import { useSupabase } from '../context/SupabaseContext';
import { isITASession } from '../utils/ita';
import { LoadingSpinner } from '../components/LoadingSpinner';

const sectionStyle: React.CSSProperties = { marginBottom: '1.5rem' };
const labelStyle: React.CSSProperties = { fontWeight: 600, marginRight: '0.5rem' };
const buttonTapStyle: React.CSSProperties = {
  minHeight: 'var(--tap-min, 44px)',
  minWidth: 'var(--tap-min, 44px)',
  padding: '0.5rem 0.75rem',
  cursor: 'pointer',
};

export function PlaySessionPage() {
  const navigate = useNavigate();
  const { player } = useSupabase();
  const ctx = useSessionGameContext();
  if (!ctx) return <LoadingSpinner message="Loading session…" />;
  const { gameState, startResume } = ctx;

  if (gameState.phase === 'loading') return <LoadingSpinner message="Loading session…" />;
  if (gameState.phase === 'invalid') {
    return (
      <div>
        <div role="alert" style={{ padding: '1rem', backgroundColor: 'var(--color-error-bg, #fef2f2)', color: 'var(--color-error, #b91c1c)', borderRadius: 4, marginBottom: '1rem' }}>
          <p style={{ margin: 0 }}>{gameState.message}</p>
        </div>
        <p>
          <Link to="/play" className="tap-target" style={{ display: 'inline-flex' }}>← Back to Play</Link>
        </p>
      </div>
    );
  }

  if (gameState.phase === 'ready') {
    const { calendarEntry, sessionName, levelReqsByType, existingRun } = gameState;
    const canResume = existingRun && !existingRun.completed_at;
    const decade = levelToDecade(
      player?.training_rating ?? player?.baseline_rating ?? null
    );
    const hasAnyLevelReq = ROUTINE_TYPES.some((rt) => levelReqsByType[rt]);
    return (
      <div>
        <h1>{sessionName}</h1>
        <section style={sectionStyle} aria-label="Context">
          <p>
            {player?.nickname ?? '—'} — TR {player?.training_rating ?? '—'}
          </p>
          <p>
            {isITASession(sessionName)
              ? sessionName
              : `${calendarEntry.cohort_name ?? '—'} — Day ${calendarEntry.day_no} — Session ${calendarEntry.session_no}`}
          </p>
        </section>
        {hasAnyLevelReq && (
          <section style={sectionStyle} aria-label="Level check">
            <p>
              <span style={labelStyle}>Your level:</span>
              {decade}
              {player?.training_rating != null && ` (${player.training_rating})`}
            </p>
            <p>
              <span style={labelStyle}>Darts per step (by routine type):</span>
              {ROUTINE_TYPES.filter((rt) => levelReqsByType[rt]).map((rt) => {
                const lr = levelReqsByType[rt]!;
                const darts = rt === 'C' ? (lr.allowed_throws_per_attempt ?? lr.darts_allowed) : lr.darts_allowed;
                const attempts = rt === 'C' && lr.attempt_count != null ? `, ${lr.attempt_count} attempts` : '';
                return `${rt} ${darts} darts${attempts}`;
              }).join(' · ')}
            </p>
          </section>
        )}
        <section style={sectionStyle}>
          {canResume ? (
            <button type="button" onClick={startResume} style={buttonTapStyle}>
              Resume
            </button>
          ) : (
            <button type="button" onClick={startResume} style={buttonTapStyle}>
              Start
            </button>
          )}
        </section>
        <p>
          <Link to="/play" className="tap-target" style={{ display: 'inline-flex' }}>← Back to Play</Link>
        </p>
      </div>
    );
  }

  if (gameState.phase === 'running') {
    const {
      routinesWithSteps,
      routineIndex,
      sessionName,
      calendarEntry,
      routineScores,
      levelReqsByType,
      stepIndex,
    } = gameState;
    const routine = routinesWithSteps?.[routineIndex];
    if (!routine) return null;
    const step = routine.steps?.[stepIndex];
    const levelReqForStep = step ? getLevelReqForStep(levelReqsByType, step.routine_type) : null;
    const dartsPerStep = step ? getDartsPerStep(levelReqForStep, step.routine_type) : 3;
    const runningSessionSc =
      routineScores.length > 0 ? sessionScore(routineScores) : 0;
    const attemptCount =
      step?.routine_type === 'C' ? (levelReqForStep?.attempt_count ?? 3) : 1;
    const stepState = step
      ? {
          routineName: routine.routine.name,
          stepTarget: step.target,
          routineType: step.routine_type ?? 'SS',
          dartsPerStep,
          visitSelections: (gameState.visitSelections ?? []) as string[],
          completedVisits: [] as string[][],
          trainingId: gameState.trainingId,
          routineId: routine.routine.id,
          routineNo: routineIndex + 1,
          stepNo: step.step_no,
          attemptIndex: step.routine_type === 'C' ? gameState.attemptIndex : 1,
          attemptCount,
        }
      : undefined;

    return (
      <div>
        <h1>{sessionName}</h1>
        <section style={sectionStyle} aria-label="Session context">
          <p>
            <span style={labelStyle}>Player:</span> {player?.nickname ?? '—'}
          </p>
          <p>
            <span style={labelStyle}>Training rating:</span> {player?.training_rating ?? '—'}
          </p>
          <p>
            <span style={labelStyle}>Current session score:</span> {runningSessionSc.toFixed(1)}%
          </p>
          <p>
            <span style={labelStyle}>Current routine:</span> {routineIndex + 1} of {routinesWithSteps.length} — {routine.routine.name}
          </p>
          {!isITASession(gameState.sessionName) && (
            <p style={{ fontSize: '0.9rem', color: 'var(--muted, #666)' }}>
              {calendarEntry.cohort_name ?? '—'} · Day {calendarEntry.day_no} · Session {calendarEntry.session_no}
            </p>
          )}
        </section>
        <section style={sectionStyle}>
          <Link
            to={`/play/session/${gameState.calendarId}/step`}
            state={stepState}
            className="tap-target"
            style={{
              display: 'inline-flex',
              ...buttonTapStyle,
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Continue to step →
          </Link>
        </section>
        <p>
          <Link to="/play" className="tap-target" style={{ display: 'inline-flex' }}>← Back to Play</Link>
        </p>
      </div>
    );
  }

  if (gameState.phase === 'ended') {
    const { finalSessionScore, routineScores, sessionName } = gameState;
    const newTR = player?.training_rating;
    const newTRDisplay = newTR != null ? String(newTR) : '—';
    return (
      <div>
        <h1>Session complete: {sessionName}</h1>
        <section style={sectionStyle}>
          <p>
            <strong>Session score: {finalSessionScore.toFixed(1)}%</strong>
          </p>
          <p>
            <strong>New TR:</strong> {newTRDisplay}
          </p>
          {routineScores.length > 0 && (
            <p>
              Routine scores: {routineScores.map((s) => `${s.toFixed(0)}%`).join(', ')}
            </p>
          )}
        </section>
        <p>
          <button type="button" onClick={() => navigate('/play')} style={buttonTapStyle}>
            Back to Play
          </button>{' '}
          <button type="button" onClick={() => navigate('/home')} style={buttonTapStyle}>
            Return to dashboard
          </button>
        </p>
      </div>
    );
  }

  return null;
}
