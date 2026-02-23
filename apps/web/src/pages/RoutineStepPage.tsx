/**
 * Routine-step screen: step-focused UI (routine name, instructions, target, visit breakdown, score input).
 * Route: /play/session/:calendarId/step. Per OPP_ROUTINE_PAGE_IMPLEMENTATION_CHECKLIST §2, §4–§8.
 * State from SessionGameContext (§8); submit/revert use context actions.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { listDartScoresForStep } from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import {
  computeCheckoutBustReason,
  computeRemaining,
  getDartsPerStep,
  getLevelReqForStep,
  useSessionGameContext,
} from '../context/SessionGameContext';
import { SegmentGrid } from '../components/SegmentGrid';
import { segmentCodeToSpoken } from '../constants/segments';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { parseVisitFromTranscript } from '../utils/voiceToSegment';

/** Still used for Link state when navigating from session (optional; step page prefers context). */
export type RoutineStepState = {
  routineName?: string;
  stepTarget?: string;
  routineType?: string;
  dartsPerStep?: number;
  visitSelections?: string[];
  completedVisits?: string[][];
  trainingId?: string;
  routineId?: string;
  routineNo?: number;
  stepNo?: number;
  attemptIndex?: number;
  attemptCount?: number;
};

const DARTS_PER_VISIT = 3;

const compactHeaderStyle: React.CSSProperties = {
  marginBottom: '0.75rem',
  padding: '0.5rem 0',
  borderBottom: '1px solid var(--color-border, #e5e7eb)',
  display: 'grid',
  gridTemplateColumns: 'auto 1fr auto',
  alignItems: 'center',
  gap: '1rem',
};
const headerColStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  minWidth: 0,
};
const headerColCenterStyle: React.CSSProperties = {
  ...headerColStyle,
  alignItems: 'center',
  justifyContent: 'center',
};
const headerColRightStyle: React.CSSProperties = {
  ...headerColStyle,
  alignItems: 'flex-end',
};
const routineNameStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: '1.35rem',
  margin: 0,
};
const dartsAllowedStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--muted, #6b7280)',
  marginTop: '0.25rem',
  fontWeight: 400,
};
const detailBlockStyle: React.CSSProperties = {
  marginBottom: '1rem',
  fontSize: '0.9rem',
};
const targetBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.4rem 0.75rem',
  minWidth: '10rem',
  fontSize: '1.25rem',
  fontWeight: 600,
  backgroundColor: 'var(--color-target-bg, #e0f2fe)',
  color: 'var(--color-target-text, #0369a1)',
  borderRadius: 4,
};
const visitGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  gap: '0.25rem 0.75rem',
  alignItems: 'baseline',
  marginTop: '0.25rem',
};
const buttonTapStyle: React.CSSProperties = {
  minHeight: 'var(--tap-min, 44px)',
  minWidth: 'var(--tap-min, 44px)',
  padding: '0.5rem 0.75rem',
  cursor: 'pointer',
};

export function RoutineStepPage() {
  const { calendarId } = useParams<{ calendarId: string }>();
  const navigate = useNavigate();
  const ctx = useSessionGameContext();
  const voice = useVoiceRecognition();
  const { supabase, player } = useSupabase();
  const defaultScoreInputMode = (player?.score_input_mode ?? 'manual') as 'voice' | 'manual';
  const [inputMode, setInputMode] = useState<'voice' | 'manual'>(() => defaultScoreInputMode);
  const [completedVisits, setCompletedVisits] = useState<string[][]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const gameState = ctx?.gameState;
  const phase = gameState?.phase;
  const routinesWithSteps = phase === 'running' && gameState ? gameState.routinesWithSteps : [];
  const routineIndex = phase === 'running' && gameState ? gameState.routineIndex : 0;
  const stepIndex = phase === 'running' && gameState ? gameState.stepIndex : 0;
  const levelReqsByType = phase === 'running' && gameState ? gameState.levelReqsByType : {};
  const trainingId = phase === 'running' && gameState ? gameState.trainingId : undefined;
  const visitSelections = phase === 'running' && gameState ? gameState.visitSelections : [];
  const routine = routinesWithSteps?.[routineIndex];
  const step = routine?.steps?.[stepIndex];
  const levelReqForStep = step ? getLevelReqForStep(levelReqsByType, step.routine_type) : null;
  const dartsPerStep = step ? getDartsPerStep(levelReqForStep, step.routine_type) : 3;
  const routineId = routine?.routine.id;
  const routineNo = routine ? routineIndex + 1 : 0;
  const stepNo = step?.step_no ?? 0;
  const stepTarget = step?.target ?? '';
  const vs = visitSelections ?? [];
  const routineType = step?.routine_type ?? 'SS';
  const isCheckout = routineType === 'C';

  const refetchCompletedVisits = useCallback(() => {
    if (!supabase || !trainingId || !routineId) return;
    listDartScoresForStep(supabase, trainingId, routineId, routineNo, stepNo).then((rows) => {
      const visits: string[][] = [];
      for (let i = 0; i < rows.length; i += DARTS_PER_VISIT) {
        visits.push(rows.slice(i, i + DARTS_PER_VISIT).map((d) => d.actual));
      }
      setCompletedVisits(visits);
    });
  }, [supabase, trainingId, routineId, routineNo, stepNo]);

  // Clear and refetch completed visits when step identity changes so we never show previous step's data
  useEffect(() => {
    if (!supabase || !trainingId || !routineId) return;
    setCompletedVisits([]);
    let cancelled = false;
    listDartScoresForStep(supabase, trainingId, routineId, routineNo, stepNo).then((rows) => {
      if (cancelled) return;
      const visits: string[][] = [];
      for (let i = 0; i < rows.length; i += DARTS_PER_VISIT) {
        visits.push(rows.slice(i, i + DARTS_PER_VISIT).map((d) => d.actual));
      }
      setCompletedVisits(visits);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, trainingId, routineId, routineNo, stepNo]);

  useEffect(() => {
    if (!ctx || voice.status !== 'result' || !voice.lastTranscript) return;
    const segments = parseVisitFromTranscript(
      voice.lastTranscript,
      stepTarget,
      DARTS_PER_VISIT
    );
    if (segments && segments.length > 0) {
      const run = async () => {
        if (vs.length === DARTS_PER_VISIT && !isCheckout && dartsPerStep > DARTS_PER_VISIT) {
          await ctx.submitCurrentVisit();
          refetchCompletedVisits();
        }
        ctx.setVisitFromSegments(segments);
      };
      void run();
    }
    voice.consumeResult();
  }, [ctx, voice.status, voice.lastTranscript, stepTarget, voice.consumeResult, vs.length, isCheckout, dartsPerStep, refetchCompletedVisits]);

  // §9: Invalid or missing context — redirect to session view so PlaySessionPage shows the error
  useEffect(() => {
    if (phase === 'invalid' && calendarId) {
      navigate(`/play/session/${calendarId}`, { replace: true });
    }
  }, [phase, calendarId, navigate]);

  const routineName = routine?.routine.name ?? 'Routine step';
  const totalVisits = Math.ceil(dartsPerStep / DARTS_PER_VISIT);
  const currentVisitIndex = completedVisits.length;
  const targetInt = parseInt(stepTarget, 10);
  const checkoutEarly =
    isCheckout &&
    !Number.isNaN(targetInt) &&
    vs.length > 0 &&
    vs.length < dartsPerStep &&
    computeRemaining(targetInt, vs) === 0 &&
    computeCheckoutBustReason(targetInt, vs) === null;
  const visitComplete = isCheckout
    ? (vs.length === dartsPerStep || checkoutEarly)
    : vs.length === DARTS_PER_VISIT;

  const handleAddSegment = useCallback(
    async (segment: string) => {
      if (!ctx || vs.length >= dartsPerStep) return;
      if (!isCheckout && vs.length === DARTS_PER_VISIT && dartsPerStep > DARTS_PER_VISIT) {
        await ctx.submitCurrentVisit();
        refetchCompletedVisits();
        ctx.addSegmentToVisit(segment);
      } else {
        ctx.addSegmentToVisit(segment);
      }
    },
    [vs.length, dartsPerStep, isCheckout, ctx, refetchCompletedVisits]
  );

  const handleClearVisit = useCallback(() => {
    ctx?.clearVisit();
  }, [ctx]);

  const handleUndoLast = useCallback(() => {
    if (!ctx || vs.length === 0) return;
    ctx.undoLast();
  }, [vs.length, ctx]);

  const handleSubmitVisit = useCallback(async () => {
    if (!visitComplete || !ctx) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = isCheckout
        ? await ctx.submitVisit()
        : await ctx.submitCurrentVisit();
      refetchCompletedVisits();
      if (result?.sessionComplete) {
        navigate(`/play/session/${calendarId}`, { state: { returnFromStepComplete: true } });
      } else if (result?.nextAttemptIndex != null) {
        navigate(`/play/session/${calendarId}/step`, { replace: true });
      }
      // When stepComplete && !sessionComplete we stay on this page; context already advanced to next step
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save visit.');
    } finally {
      setSubmitting(false);
    }
  }, [visitComplete, isCheckout, ctx, calendarId, navigate, refetchCompletedVisits]);

  if (!ctx || phase !== 'running') {
    return (
      <p>
        <Link to={calendarId ? `/play/session/${calendarId}` : '/play'}>← Back to session</Link>
        {phase === 'loading' && ' (loading…)'}
      </p>
    );
  }
  if (!routine || !step) {
    return (
      <p>
        <Link to={`/play/session/${calendarId}`}>← Back to session</Link>
      </p>
    );
  }
  if (!calendarId) {
    return (
      <p>
        <Link to="/play">← Back to Play</Link>
      </p>
    );
  }

  return (
    <>
      <header style={compactHeaderStyle} aria-label="Step context">
        <div style={headerColStyle}>
          <Link
            to={calendarId ? `/play/session/${calendarId}` : '/play'}
            style={{ ...buttonTapStyle, color: 'var(--color-text)', textDecoration: 'none' }}
            className="tap-target"
            aria-label="Back to session"
          >
            ← Back
          </Link>
        </div>
        <div style={headerColCenterStyle}>
          <p style={routineNameStyle}>{routineName}</p>
          <span style={dartsAllowedStyle}>Darts allowed: {dartsPerStep}</span>
        </div>
        <div style={headerColRightStyle}>
          {voice.isSupported && (
            <button
              type="button"
              style={buttonTapStyle}
              onClick={() => {
                const targetSpoken = stepTarget ? segmentCodeToSpoken(stepTarget) : 'this step';
                const prompt = `Target is ${targetSpoken}. Please tell me your visit scores.`;
                if (typeof window !== 'undefined' && window.speechSynthesis && prompt) {
                  const utterance = new window.SpeechSynthesisUtterance(prompt);
                  utterance.lang = 'en-GB';
                  utterance.onend = () => voice.startListening();
                  utterance.onerror = () => voice.startListening();
                  window.speechSynthesis.speak(utterance);
                } else {
                  voice.startListening();
                }
              }}
              disabled={voice.status === 'listening' || vs.length >= dartsPerStep || submitting}
              aria-label="Start (announce target and begin voice input)"
            >
              Start
            </button>
          )}
        </div>
      </header>

      <section style={detailBlockStyle} aria-label="Step detail">
        <p style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={targetBadgeStyle}>{stepTarget ? segmentCodeToSpoken(stepTarget) : '—'}</span>
          {voice.isSupported && (
            <>
              <button
                type="button"
                style={buttonTapStyle}
                onClick={() => {
                  if (inputMode === 'voice' && voice.status === 'listening') {
                    voice.stopListening();
                  }
                  setInputMode((m) => (m === 'voice' ? 'manual' : 'voice'));
                }}
                disabled={vs.length >= dartsPerStep || submitting}
                aria-label={inputMode === 'voice' ? 'Switch to manual input' : 'Switch to voice input'}
              >
                {inputMode === 'voice' ? 'Voice' : 'Manual'}
              </button>
              {inputMode === 'voice' && voice.status === 'listening' && (
                <span role="status" aria-live="polite" style={{ fontSize: '0.9rem', color: 'var(--muted, #6b7280)' }}>
                  Listening…
                </span>
              )}
            </>
          )}
        </p>

        <div style={visitGridStyle} role="list" aria-label="Visit scores">
          {Array.from({ length: totalVisits }, (_, i) => {
            const visitNo = i + 1;
            const isCurrent = i === currentVisitIndex;
            const segments: string[] = isCurrent
              ? vs
              : (completedVisits[i] ?? []);
            const label = `Visit ${visitNo}`;
            const display =
              segments.length > 0
                ? segments.map((s) => s || '—').join(', ')
                : Array.from({ length: DARTS_PER_VISIT }, () => '—').join(', ');
            return (
              <span key={i} role="listitem" style={{ gridColumn: '1 / -1' }}>
                <span style={{ marginRight: '0.5rem' }}>{label}:</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{display}</span>
              </span>
            );
          })}
        </div>

      </section>

      <section
        style={{
          marginTop: '1.25rem',
          flex: 1,
          minHeight: 0,
        }}
        aria-label="Score input"
      >
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '0.75rem',
            flexWrap: 'wrap',
            minHeight: 'var(--tap-min, 44px)',
          }}
          aria-label="Score maintenance"
        >
          {vs.length > 0 && (
            <button type="button" onClick={handleClearVisit} style={buttonTapStyle}>
              Clear visit
            </button>
          )}
          {vs.length > 0 && (
            <button type="button" onClick={handleUndoLast} style={buttonTapStyle}>
              Undo last
            </button>
          )}
          {visitComplete && (
            <button
              type="button"
              onClick={handleSubmitVisit}
              disabled={submitting}
              style={buttonTapStyle}
            >
              {submitting ? 'Saving…' : 'Submit visit'}
            </button>
          )}
        </div>
        <SegmentGrid
          onSelect={handleAddSegment}
          selectedForVisit={vs}
          maxDarts={dartsPerStep}
          disabled={submitting}
        />
        {submitError && (
          <p role="alert" style={{ marginTop: '0.5rem', color: 'var(--color-error, #b91c1c)', fontSize: '0.9rem' }}>
            {submitError}
          </p>
        )}
      </section>
    </>
  );
}
