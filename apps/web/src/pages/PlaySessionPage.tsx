/**
 * Game screen for one calendar session. P4 §10: load context, start/resume, routine loop, session end.
 * Validates calendarId; all data and mutations via @opp/data.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  applyTrainingRatingProgression,
  completeITAAndSetBR,
  completeSessionRun,
  createSessionRun,
  getAllSessionsForPlayer,
  getCalendarEntryById,
  getLevelRequirementByMinLevel,
  getRoutineWithSteps,
  getSessionRunByPlayerAndCalendar,
  getSessionWithRoutines,
  insertDartScore,
  isDataError,
  listPlayerCalendar,
  roundScore,
  routineScore,
  sessionScore,
  updatePlayerCalendarStatus,
  upsertPlayerRoutineScore,
} from '@opp/data';
import type {
  CalendarEntryWithDetails,
  LevelRequirement,
  RoutineStep,
} from '@opp/data';
import { useSupabase } from '../context/SupabaseContext';
import { isHitForTarget, SEGMENT_MISS } from '../constants/segments';
import { SegmentGrid } from '../components/SegmentGrid';
import { isITASession } from '../utils/ita';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { voiceTextToSegment } from '../utils/voiceToSegment';
import { LoadingSpinner } from '../components/LoadingSpinner';

type RoutineWithSteps = { routine: { id: string; name: string }; steps: RoutineStep[] };

type GameState =
  | { phase: 'loading' }
  | { phase: 'invalid'; message: string }
  | {
      phase: 'ready';
      calendarEntry: CalendarEntryWithDetails;
      sessionName: string;
      routinesWithSteps: RoutineWithSteps[];
      levelReq: LevelRequirement | null;
      existingRun: { id: string; completed_at: string | null } | null;
    }
  | {
      phase: 'running';
      trainingId: string;
      calendarId: string;
      calendarEntry: CalendarEntryWithDetails;
      sessionName: string;
      routinesWithSteps: RoutineWithSteps[];
      levelReq: LevelRequirement | null;
      routineIndex: number;
      stepIndex: number;
      visitSelections: string[];
      allRoundScores: number[];
      routineScores: number[];
    }
  | {
      phase: 'ended';
      finalSessionScore: number;
      routineScores: number[];
      sessionName: string;
    };

const sectionStyle: React.CSSProperties = { marginBottom: '1.5rem' };
const labelStyle: React.CSSProperties = { fontWeight: 600, marginRight: '0.5rem' };
/** P8 §10.1 — tap targets ≥ 44px */
const buttonTapStyle: React.CSSProperties = {
  minHeight: 'var(--tap-min, 44px)',
  minWidth: 'var(--tap-min, 44px)',
  padding: '0.5rem 0.75rem',
  cursor: 'pointer',
};

function levelToDecade(level: number | null): number {
  if (level == null || Number.isNaN(level)) return 0;
  return Math.floor(Number(level) / 10) * 10;
}

export function PlaySessionPage() {
  const { calendarId } = useParams<{ calendarId: string }>();
  const navigate = useNavigate();
  const { supabase, player, refetchPlayer } = useSupabase();
  const [gameState, setGameState] = useState<GameState>({ phase: 'loading' });
  const voice = useVoiceRecognition();
  const [voiceFeedback, setVoiceFeedback] = useState<'hit' | 'miss' | 'segment' | 'no-match' | null>(null);

  // Load: validate calendar, load calendar entry, session+routines, each routine+steps, level req, existing run
  useEffect(() => {
    if (!calendarId || !player) {
      setGameState({ phase: 'invalid', message: 'Missing session or player.' });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [sessions, calendarEntry] = await Promise.all([
          getAllSessionsForPlayer(supabase, player.id),
          getCalendarEntryById(supabase, calendarId),
        ]);
        if (cancelled) return;
        const avail = sessions.find((s) => s.calendar_id === calendarId);
        const canAccess =
          calendarEntry && (avail || player.role === 'admin');
        if (!canAccess) {
          setGameState({
            phase: 'invalid',
            message: 'Session not found or you don’t have access to it.',
          });
          return;
        }
        const sessionData = await getSessionWithRoutines(supabase, calendarEntry.session_id);
        if (cancelled || !sessionData) {
          setGameState({ phase: 'invalid', message: 'Session content not found.' });
          return;
        }
        const routinesWithSteps: RoutineWithSteps[] = [];
        for (const sr of sessionData.routines) {
          const rws = await getRoutineWithSteps(supabase, sr.routine_id);
          if (cancelled) return;
          if (!rws) continue;
          routinesWithSteps.push({
            routine: { id: rws.routine.id, name: rws.routine.name },
            steps: rws.steps,
          });
        }
        const decade = levelToDecade(player.training_rating ?? player.baseline_rating ?? null);
        const levelReq = await getLevelRequirementByMinLevel(supabase, decade);
        if (cancelled) return;
        const existingRun = await getSessionRunByPlayerAndCalendar(supabase, player.id, calendarId);
        if (cancelled) return;
        setGameState({
          phase: 'ready',
          calendarEntry,
          sessionName: calendarEntry.session_name ?? sessionData.session.name,
          routinesWithSteps,
          levelReq,
          existingRun: existingRun
            ? { id: existingRun.id, completed_at: existingRun.completed_at }
            : null,
        });
      } catch (e) {
        if (cancelled) return;
        setGameState({
          phase: 'invalid',
          message: isDataError(e) ? (e as Error).message : 'Something went wrong.',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [calendarId, player, supabase]);

  const handleStartOrResume = useCallback(async () => {
    if (gameState.phase !== 'ready' || !player || !calendarId) return;
    try {
      const run = await createSessionRun(supabase, player.id, calendarId);
      const { calendarEntry, sessionName, routinesWithSteps, levelReq } = gameState;
      setGameState({
        phase: 'running',
        trainingId: run.id,
        calendarId,
        calendarEntry,
        sessionName,
        routinesWithSteps,
        levelReq,
        routineIndex: 0,
        stepIndex: 0,
        visitSelections: [],
        allRoundScores: [],
        routineScores: [],
      });
    } catch (e) {
      alert(isDataError(e) ? (e as Error).message : 'Failed to start session.');
    }
  }, [gameState, calendarId, player, supabase]);

  const addSegmentToVisit = useCallback(
    (segment: string) => {
      if (gameState.phase !== 'running') return;
      const N = gameState.levelReq?.darts_allowed ?? 3;
      if (gameState.visitSelections.length >= N) return;
      setGameState({
        ...gameState,
        visitSelections: [...gameState.visitSelections, segment],
      });
    },
    [gameState]
  );

  const clearVisit = useCallback(() => {
    if (gameState.phase !== 'running') return;
    setVoiceFeedback(null);
    setGameState({ ...gameState, visitSelections: [] });
  }, [gameState]);

  // P8: Apply voice result to current visit (one segment per recognition)
  useEffect(() => {
    if (voice.status !== 'result' || gameState.phase !== 'running') return;
    const transcript = voice.consumeResult();
    if (!transcript) return;
    const routine = gameState.routinesWithSteps[gameState.routineIndex];
    const step = routine?.steps[gameState.stepIndex];
    if (!step) return;
    const N = gameState.levelReq?.darts_allowed ?? 3;
    if (gameState.visitSelections.length >= N) return;
    const segment = voiceTextToSegment(transcript, step.target);
    if (segment === step.target) {
      setVoiceFeedback('hit');
      addSegmentToVisit(segment);
    } else if (segment === SEGMENT_MISS) {
      setVoiceFeedback('miss');
      addSegmentToVisit(segment);
    } else if (segment) {
      setVoiceFeedback('segment');
      addSegmentToVisit(segment);
    } else {
      setVoiceFeedback('no-match');
    }
    voice.clearFeedback();
  }, [voice.status, gameState.phase, gameState.routineIndex, gameState.stepIndex, gameState.visitSelections?.length, gameState.levelReq?.darts_allowed, gameState.routinesWithSteps, voice.consumeResult, voice.clearFeedback, addSegmentToVisit]);

  // P8: Show no-match when recognition fires no match
  useEffect(() => {
    if (voice.status === 'no-match') {
      setVoiceFeedback('no-match');
      voice.clearFeedback();
    }
  }, [voice.status, voice.clearFeedback]);

  // P8: Clear brief "recorded" feedback after 2s
  useEffect(() => {
    if (voiceFeedback !== 'hit' && voiceFeedback !== 'miss' && voiceFeedback !== 'segment') return;
    const t = setTimeout(() => setVoiceFeedback(null), 2000);
    return () => clearTimeout(t);
  }, [voiceFeedback]);

  const submitVisit = useCallback(async () => {
    if (gameState.phase !== 'running' || !player) return;
    const { routinesWithSteps, routineIndex, stepIndex, visitSelections, trainingId, levelReq } =
      gameState;
    const routine = routinesWithSteps[routineIndex];
    if (!routine) return;
    const step = routine.steps[stepIndex];
    if (!step) return;
    const N = levelReq?.darts_allowed ?? 3;
    if (visitSelections.length !== N) return;
    try {
      for (let i = 0; i < N; i++) {
        const actual = visitSelections[i] ?? 'M';
        const result = isHitForTarget(actual, step.target) ? 'H' : 'M';
        await insertDartScore(supabase, {
          player_id: player.id,
          training_id: trainingId,
          routine_id: routine.routine.id,
          routine_no: routineIndex + 1,
          step_no: step.step_no,
          dart_no: i + 1,
          target: step.target,
          actual,
          result,
        });
      }
    } catch (e) {
      alert(isDataError(e) ? (e as Error).message : 'Failed to save darts.');
      return;
    }
    const hits = visitSelections.filter((a) => isHitForTarget(a, step.target)).length;
    const targetHits = levelReq?.tgt_hits ?? Math.min(1, N);
    const roundSc = roundScore(hits, targetHits);
    const allRoundScores = [...gameState.allRoundScores, roundSc];
    let nextRoutineIndex = gameState.routineIndex;
    let nextStepIndex = stepIndex + 1;
    let routineScores = gameState.routineScores;
    if (nextStepIndex >= routine.steps.length) {
      const thisRoutineRounds = allRoundScores.slice(-routine.steps.length);
      const rScore = routineScore(thisRoutineRounds);
      routineScores = [...gameState.routineScores, rScore];
      try {
        await upsertPlayerRoutineScore(supabase, {
          player_id: player.id,
          training_id: trainingId,
          routine_id: routine.routine.id,
          routine_score: rScore,
        });
      } catch (e) {
        alert(isDataError(e) ? (e as Error).message : 'Failed to save routine score.');
      }
      nextRoutineIndex = gameState.routineIndex + 1;
      nextStepIndex = 0;
      if (nextRoutineIndex >= routinesWithSteps.length) {
        const finalSc = sessionScore(allRoundScores);
        try {
          await completeSessionRun(supabase, trainingId, finalSc);
          const pcList = await listPlayerCalendar(supabase, player.id);
          const pcRow = pcList.find((r) => r.calendar_id === gameState.calendarId);
          if (pcRow) {
            await updatePlayerCalendarStatus(supabase, pcRow.id, 'completed');
          }
          if (isITASession(gameState.sessionName)) {
            await completeITAAndSetBR(supabase, trainingId, player.id);
          } else {
            await applyTrainingRatingProgression(supabase, player.id, finalSc);
          }
          await refetchPlayer();
        } catch (e) {
          alert(isDataError(e) ? (e as Error).message : 'Failed to complete session.');
          return;
        }
        setGameState({
          phase: 'ended',
          finalSessionScore: finalSc,
          routineScores,
          sessionName: gameState.sessionName,
        });
        return;
      }
    }
    setGameState({
      ...gameState,
      routineIndex: nextRoutineIndex,
      stepIndex: nextStepIndex,
      visitSelections: [],
      allRoundScores,
      routineScores,
    });
  }, [gameState, player, supabase, refetchPlayer]);

  if (gameState.phase === 'loading') return <LoadingSpinner message="Loading session…" />;
  if (gameState.phase === 'invalid') {
    return (
      <>
        <div role="alert" style={{ padding: '1rem', backgroundColor: 'var(--color-error-bg, #fef2f2)', color: 'var(--color-error, #b91c1c)', borderRadius: 4, marginBottom: '1rem' }}>
          <p style={{ margin: 0 }}>{gameState.message}</p>
        </div>
        <p>
          <Link to="/play" className="tap-target" style={{ display: 'inline-flex' }}>← Back to Play</Link>
        </p>
      </>
    );
  }

  if (gameState.phase === 'ready') {
    const { calendarEntry, sessionName, levelReq, existingRun } = gameState;
    const canResume = existingRun && !existingRun.completed_at;
    const decade = levelToDecade(
      player?.training_rating ?? player?.baseline_rating ?? null
    );
    return (
      <>
        <h1>Session: {sessionName}</h1>
        <section style={sectionStyle} aria-label="Context">
          <p>
            <span style={labelStyle}>Player:</span>
            {player?.nickname ?? '—'}
          </p>
          <p>
            <span style={labelStyle}>PR:</span>
            {player?.player_rating ?? '—'}
            <span style={labelStyle}>TR:</span>
            {player?.training_rating ?? '—'}
            <span style={labelStyle}>MR:</span>
            {player?.match_rating ?? '—'}
          </p>
          <p>
            <span style={labelStyle}>Cohort:</span>
            {calendarEntry.cohort_name ?? '—'}
            <span style={labelStyle}>Schedule:</span>
            {calendarEntry.schedule_name ?? '—'}
          </p>
          <p>
            Day {calendarEntry.day_no}, Session {calendarEntry.session_no} — {sessionName}
          </p>
        </section>
        {levelReq && (
          <section style={sectionStyle} aria-label="Level check">
            <p>
              <span style={labelStyle}>Your level:</span>
              {decade}
              {player?.training_rating != null && ` (${player.training_rating})`}
            </p>
            <p>
              <span style={labelStyle}>Expected:</span>
              {levelReq.tgt_hits}/{levelReq.darts_allowed}
            </p>
          </section>
        )}
        <section style={sectionStyle}>
          {canResume ? (
            <button type="button" onClick={handleStartOrResume} style={buttonTapStyle}>
              Resume
            </button>
          ) : (
            <button type="button" onClick={handleStartOrResume} style={buttonTapStyle}>
              Start
            </button>
          )}
        </section>
        <p>
          <Link to="/play" className="tap-target" style={{ display: 'inline-flex' }}>← Back to Play</Link>
        </p>
      </>
    );
  }

  if (gameState.phase === 'running') {
    const {
      routinesWithSteps,
      routineIndex,
      stepIndex,
      visitSelections,
      sessionName,
      calendarEntry,
      levelReq,
      allRoundScores,
      routineScores,
    } = gameState;
    const routine = routinesWithSteps[routineIndex];
    if (!routine) return null;
    const step = routine.steps[stepIndex];
    if (!step) return null;
    const N = levelReq?.darts_allowed ?? 3;
    const runningSessionSc =
      allRoundScores.length > 0 ? sessionScore(allRoundScores) : 0;
    const visitComplete = visitSelections.length === N;

    return (
      <>
        <h1>{sessionName}</h1>
        <section style={sectionStyle} aria-label="Context">
          <p>
            {player?.nickname} — {calendarEntry.cohort_name ?? '—'} — Day {calendarEntry.day_no}
            , Session {calendarEntry.session_no}
          </p>
          <p>
            Routine {routineIndex + 1} of {routinesWithSteps.length} — Step {step.step_no} — Visit:{' '}
            {visitSelections.length} of {N} darts
          </p>
          {routineScores.length > 0 && (
            <p>
              <span style={labelStyle}>Routine complete:</span>
              {(routineScores[routineScores.length - 1] ?? 0).toFixed(0)}%
            </p>
          )}
          <p>
            <span style={labelStyle}>Session score (so far):</span>
            {runningSessionSc.toFixed(1)}%
          </p>
        </section>
        {levelReq && (
          <p>
            Expected: {levelReq.tgt_hits}/{levelReq.darts_allowed} — Your level: {levelToDecade(player?.training_rating ?? player?.baseline_rating ?? null)}
          </p>
        )}
        <section style={sectionStyle}>
          <h2>{routine.routine.name}</h2>
          <p>
            Aim at <strong>{step.target}</strong>. Say &lsquo;hit&rsquo; or &lsquo;miss&rsquo;, or tap below:
          </p>
          {voice.isSupported && (
            <p style={{ marginBottom: '0.5rem' }}>
              <button
                type="button"
                style={buttonTapStyle}
                onClick={voice.status === 'listening' ? voice.stopListening : voice.startListening}
                disabled={visitSelections.length >= N}
                aria-label={voice.status === 'listening' ? 'Stop voice input' : 'Start voice input'}
              >
                {voice.status === 'listening' ? 'Stop voice' : 'Use voice'}
              </button>
              {voice.status === 'listening' && <span style={{ marginLeft: '0.5rem' }}>Listening…</span>}
            </p>
          )}
          {!voice.isSupported && (
            <p style={{ fontSize: '0.9rem', color: 'var(--muted, #666)' }}>
              Voice not supported in this browser; use manual input below.
            </p>
          )}
          {voiceFeedback === 'hit' && <p role="status" aria-live="polite">Hit recorded.</p>}
          {voiceFeedback === 'miss' && <p role="status" aria-live="polite">Miss recorded.</p>}
          {voiceFeedback === 'segment' && <p role="status" aria-live="polite">Segment recorded.</p>}
          {voiceFeedback === 'no-match' && (
            <p role="alert">
              I didn&rsquo;t catch that.{' '}
              <button type="button" style={buttonTapStyle} onClick={() => { voice.startListening(); setVoiceFeedback(null); }}>Retry</button>
              {' '}
              <button type="button" style={buttonTapStyle} onClick={() => { setVoiceFeedback(null); }}>Use manual</button>
            </p>
          )}
          {voice.status === 'error' && voice.errorMessage && (
            <p role="alert">
              {voice.errorMessage}{' '}
              <button type="button" style={buttonTapStyle} onClick={() => { voice.clearFeedback(); setVoiceFeedback(null); }}>OK</button>
            </p>
          )}
          <p style={{ marginBottom: '0.5rem' }}>
            {Array.from({ length: N }, (_, i) => (
              <span key={i} style={{ marginRight: '0.75rem' }}>
                Dart {i + 1}: {visitSelections[i] ?? '—'}
              </span>
            ))}
          </p>
          <SegmentGrid
            onSelect={addSegmentToVisit}
            selectedForVisit={visitSelections}
            maxDarts={N}
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            {visitSelections.length > 0 && (
              <button type="button" onClick={clearVisit} style={buttonTapStyle}>
                Clear visit
              </button>
            )}
            {visitComplete && (
              <button type="button" onClick={submitVisit} style={buttonTapStyle}>
                Submit visit
              </button>
            )}
          </div>
        </section>
        <p>
          <Link to="/play" className="tap-target" style={{ display: 'inline-flex' }}>← Back to Play</Link>
        </p>
      </>
    );
  }

  if (gameState.phase === 'ended') {
    const { finalSessionScore, routineScores, sessionName } = gameState;
    const newTR = player?.training_rating;
    const newTRDisplay = newTR != null ? String(newTR) : '—';
    return (
      <>
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
      </>
    );
  }

  return null;
}
