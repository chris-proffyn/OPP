/**
 * Shared game state for /play/session/:calendarId (session view + step view).
 * Per OPP_ROUTINE_PAGE_IMPLEMENTATION_CHECKLIST §8: single source of truth in layout/context.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  applyTrainingRatingProgression,
  checkoutRoutineScore,
  completeITAAndSetBR,
  completeSessionRun,
  createPlayerStepRun,
  createSessionRun,
  getCurrentCohortForPlayer,
  getExpectedCheckoutSuccesses,
  getExpectedHitsForSingleDartRoutine,
  getPlayerStepRunByTrainingRoutineStep,
  getRecommendedSegmentForRemaining,
  getAllSessionsForPlayer,
  getCalendarEntryById,
  getLevelRequirementByMinLevelAndRoutineType,
  getRoutineWithSteps,
  ROUTINE_TYPES,
  getSessionRunById,
  getSessionRunByPlayerAndCalendar,
  getSessionWithRoutines,
  insertDartScore,
  isDataError,
  listPlayerCalendar,
  listRoutineScoresForSessionRun,
  roundScore,
  sessionScore,
  stepScore,
  updatePlayerCalendarStatus,
  updatePlayerStepRun,
  upsertPlayerRoutineScore,
} from '@opp/data';
import type {
  CalendarEntryWithDetails,
  LevelRequirement,
  RoutineType,
} from '@opp/data';
import { useSupabase } from './SupabaseContext';
import { isDoubleOrBull, isHitForTarget, segmentToScore } from '../constants/segments';
import { hasCompletedITA, isITASession, PLAY_MUST_COMPLETE_ITA_MESSAGE } from '../utils/ita';
import {
  computeCheckoutBustReason,
  computeRemaining,
  getDartsPerStep,
  getLevelReqForStep,
  hasAnyCheckoutStep,
  levelToDecade,
  type RoutineWithSteps,
} from './sessionGameState';

export type { RoutineWithSteps } from './sessionGameState';
export {
  computeCheckoutBustReason,
  computeRemaining,
  getDartsPerStep,
  getLevelReqForStep,
  hasAnyCheckoutStep,
  levelToDecade,
} from './sessionGameState';

export type GameState =
  | { phase: 'loading' }
  | { phase: 'invalid'; message: string }
  | {
      phase: 'ready';
      /** Omitted for free-training runs. */
      calendarEntry?: CalendarEntryWithDetails;
      sessionName: string;
      routinesWithSteps: RoutineWithSteps[];
      levelReqsByType: Partial<Record<RoutineType, LevelRequirement>>;
      existingRun: { id: string; completed_at: string | null } | null;
    }
  | {
      phase: 'running';
      trainingId: string;
      /** Omitted for free-training runs. */
      calendarId?: string;
      calendarEntry?: CalendarEntryWithDetails;
      sessionName: string;
      routinesWithSteps: RoutineWithSteps[];
      levelReqsByType: Partial<Record<RoutineType, LevelRequirement>>;
      routineIndex: number;
      stepIndex: number;
      attemptIndex: number;
      visitSelections: string[];
      allRoundScores: number[];
      routineScores: number[];
      /** For non-checkout steps: number of 3-dart visits already persisted for current step. */
      completedVisitsInStep: number;
    }
  | {
      phase: 'ended';
      finalSessionScore: number;
      routineScores: number[];
      sessionName: string;
    };

export type SubmitVisitResult = {
  stepComplete: boolean;
  sessionComplete: boolean;
  nextAttemptIndex?: number;
};

export type SessionGameContextValue = {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  startResume: () => Promise<void>;
  addSegmentToVisit: (segment: string) => void;
  setVisitFromSegments: (segments: string[]) => void;
  clearVisit: () => void;
  undoLast: () => void;
  /** Returns outcome so step page can navigate (step complete, session complete, or next attempt). */
  submitVisit: () => Promise<SubmitVisitResult | undefined>;
  /** Persist current 3-dart visit (non-checkout only). Call when visitSelections has 3 darts. */
  submitCurrentVisit: () => Promise<SubmitVisitResult | undefined>;
  /** Back link (e.g. session view or Free Training list). */
  getBackHref: () => string;
  /** Summary page URL after session complete. */
  getSummaryUrl: () => string;
};

const SessionGameContext = createContext<SessionGameContextValue | null>(null);

function useSessionGameState(
  calendarId: string | undefined,
  runId: string | undefined
): SessionGameContextValue {
  const location = useLocation();
  const navigate = useNavigate();
  const { supabase, player, refetchPlayer } = useSupabase();
  const [gameState, setGameState] = useState<GameState>({ phase: 'loading' });
  const isFreeRun = Boolean(runId && !calendarId);

  useEffect(() => {
    if (!player) {
      setGameState((prev) => {
        if (prev.phase === 'running' || prev.phase === 'ended') return prev;
        return { phase: 'invalid', message: 'Missing player.' };
      });
      return;
    }
    if (isFreeRun) {
      if (!runId) return;
      setGameState((prev) => {
        if (prev.phase === 'loading') return prev;
        if (prev.phase === 'running' || prev.phase === 'ended') return prev;
        return { phase: 'loading' };
      });
      let cancelled = false;
      (async () => {
        try {
          const run = await getSessionRunById(supabase, runId);
          if (cancelled) return;
          if (
            !run ||
            run.player_id !== player.id ||
            run.run_type !== 'free' ||
            !run.routine_id
          ) {
            setGameState((prev) => {
              if (prev.phase === 'running' || prev.phase === 'ended') return prev;
              return { phase: 'invalid', message: 'Free training run not found or not yours.' };
            });
            return;
          }
          if (run.completed_at != null) {
            const routines = await listRoutineScoresForSessionRun(supabase, run.id);
            if (cancelled) return;
            const routineName = routines[0]?.routine_name ?? 'Routine';
            setGameState({
              phase: 'ended',
              finalSessionScore: run.session_score ?? 0,
              routineScores: routines.map((r) => r.routine_score),
              sessionName: `Free Training — ${routineName}`,
            });
            return;
          }
          const rws = await getRoutineWithSteps(supabase, run.routine_id);
          if (cancelled || !rws) {
            setGameState((prev) => {
              if (prev.phase === 'running' || prev.phase === 'ended') return prev;
              return { phase: 'invalid', message: 'Routine not found.' };
            });
            return;
          }
          const routinesWithSteps: RoutineWithSteps[] = [
            { routine: { id: rws.routine.id, name: rws.routine.name }, steps: rws.steps },
          ];
          const decade = levelToDecade(player.training_rating ?? player.baseline_rating ?? null);
          const [lrSS, lrSD, lrST, lrC] = await Promise.all(
            ROUTINE_TYPES.map((rt) =>
              getLevelRequirementByMinLevelAndRoutineType(supabase, decade, rt)
            )
          );
          if (cancelled) return;
          const levelReqsByType: Partial<Record<RoutineType, LevelRequirement>> = {};
          if (lrSS) levelReqsByType.SS = lrSS;
          if (lrSD) levelReqsByType.SD = lrSD;
          if (lrST) levelReqsByType.ST = lrST;
          if (lrC) levelReqsByType.C = lrC;
          setGameState((prev) => {
            if (prev.phase === 'running' || prev.phase === 'ended') return prev;
            return {
              phase: 'ready',
              sessionName: `Free Training — ${rws.routine.name}`,
              routinesWithSteps,
              levelReqsByType,
              existingRun: { id: run.id, completed_at: run.completed_at },
            };
          });
        } catch (e) {
          if (cancelled) return;
          setGameState((prev) => {
            if (prev.phase === 'running' || prev.phase === 'ended') return prev;
            return {
              phase: 'invalid',
              message: isDataError(e) ? (e as Error).message : 'Something went wrong.',
            };
          });
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    if (!calendarId) {
      setGameState((prev) => {
        if (prev.phase === 'running' || prev.phase === 'ended') return prev;
        return { phase: 'invalid', message: 'Missing session or player.' };
      });
      return;
    }
    setGameState((prev) => {
      if (prev.phase === 'loading') return prev;
      if (prev.phase === 'running' && prev.calendarId === calendarId) return prev;
      return { phase: 'loading' };
    });
    let cancelled = false;
    (async () => {
      try {
        const [sessions, calendarEntry] = await Promise.all([
          getAllSessionsForPlayer(supabase, player.id),
          getCalendarEntryById(supabase, calendarId),
        ]);
        if (cancelled) return;
        const avail = sessions.find((s) => s.calendar_id === calendarId);
        const canAccess = calendarEntry && (avail || player.role === 'admin');
        if (!canAccess) {
          setGameState((prev) => {
            if (prev.phase === 'running' || prev.phase === 'ended') return prev;
            return {
              phase: 'invalid',
              message: "Session not found or you don't have access to it.",
            };
          });
          return;
        }
        const sessionData = await getSessionWithRoutines(supabase, calendarEntry.session_id);
        if (cancelled || !sessionData) {
          setGameState((prev) => {
            if (prev.phase === 'running' || prev.phase === 'ended') return prev;
            return { phase: 'invalid', message: 'Session content not found.' };
          });
          return;
        }
        const sessionNameForRedirect = calendarEntry.session_name ?? sessionData.session.name;
        if (
          !hasCompletedITA(player) &&
          player.role !== 'admin' &&
          !isITASession(sessionNameForRedirect)
        ) {
          navigate('/play/ita', {
            state: { message: PLAY_MUST_COMPLETE_ITA_MESSAGE },
            replace: true,
          });
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
        const [lrSS, lrSD, lrST, lrC] = await Promise.all(
          ROUTINE_TYPES.map((rt) =>
            getLevelRequirementByMinLevelAndRoutineType(supabase, decade, rt)
          )
        );
        if (cancelled) return;
        const levelReqsByType: Partial<Record<RoutineType, LevelRequirement>> = {};
        if (lrSS) levelReqsByType.SS = lrSS;
        if (lrSD) levelReqsByType.SD = lrSD;
        if (lrST) levelReqsByType.ST = lrST;
        if (lrC) levelReqsByType.C = lrC;
        const runIdFromState = (location.state as { runId?: string } | null)?.runId;
        let existingRun: Awaited<ReturnType<typeof getSessionRunByPlayerAndCalendar>>;
        if (runIdFromState && typeof runIdFromState === 'string') {
          const runById = await getSessionRunById(supabase, runIdFromState);
          if (runById && runById.calendar_id === calendarId && runById.player_id === player.id) {
            existingRun = runById;
          } else {
            existingRun = await getSessionRunByPlayerAndCalendar(supabase, player.id, calendarId);
          }
        } else {
          existingRun = await getSessionRunByPlayerAndCalendar(supabase, player.id, calendarId);
        }
        if (cancelled) return;
        setGameState((prev) => {
          if (prev.phase === 'running' || prev.phase === 'ended') return prev;
          return {
            phase: 'ready',
            calendarEntry,
            sessionName: sessionNameForRedirect,
            routinesWithSteps,
            levelReqsByType,
            existingRun: existingRun
              ? { id: existingRun.id, completed_at: existingRun.completed_at }
              : null,
          };
        });
      } catch (e) {
        if (cancelled) return;
        setGameState((prev) => {
          if (prev.phase === 'running' || prev.phase === 'ended') return prev;
          return {
            phase: 'invalid',
            message: isDataError(e) ? (e as Error).message : 'Something went wrong.',
          };
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [calendarId, runId, isFreeRun, player, supabase, navigate, location.state]);

  const startResume = useCallback(async () => {
    if (gameState.phase !== 'ready' || !player) return;
    const { calendarEntry, sessionName, routinesWithSteps, levelReqsByType, existingRun } = gameState;
    const isFree = !calendarEntry;
    if (isFree && !existingRun) return;
    if (!isFree && !calendarId) return;
    const hasCheckout = hasAnyCheckoutStep(routinesWithSteps);
    try {
      let playerLevel: number | undefined;
      if (hasCheckout) {
        const cohort = await getCurrentCohortForPlayer(supabase, player.id);
        playerLevel = cohort?.level ?? player.training_rating ?? player.baseline_rating ?? 0;
      }
      const useExistingRun = existingRun && !existingRun.completed_at;
      const run = useExistingRun
        ? { id: existingRun.id }
        : await createSessionRun(supabase, player.id, calendarId!, {
            ...(hasCheckout && playerLevel !== undefined && { player_level_snapshot: playerLevel }),
          });
      if (hasCheckout && playerLevel !== undefined) {
        const lrC = levelReqsByType.C;
        const attemptCountForExpectation = lrC?.attempt_count ?? undefined;
        const allowedThrowsForExpectation =
          lrC?.allowed_throws_per_attempt ?? lrC?.darts_allowed ?? undefined;
        for (let rIdx = 0; rIdx < routinesWithSteps.length; rIdx++) {
          const rws = routinesWithSteps[rIdx];
          if (!rws) continue;
          for (const step of rws.steps) {
            if (step.routine_type !== 'C') continue;
            const targetInt = parseInt(step.target, 10);
            if (Number.isNaN(targetInt)) continue;
            const existing = await getPlayerStepRunByTrainingRoutineStep(
              supabase,
              run.id,
              rws.routine.id,
              step.step_no
            );
            if (existing) continue;
            const exp = await getExpectedCheckoutSuccesses(
              supabase,
              playerLevel,
              targetInt,
              allowedThrowsForExpectation,
              attemptCountForExpectation,
              { logToConsole: true }
            );
            if (!exp) continue;
            await createPlayerStepRun(supabase, {
              player_id: player.id,
              training_id: run.id,
              routine_id: rws.routine.id,
              routine_no: rIdx + 1,
              step_no: step.step_no,
              routine_step_id: step.id,
              checkout_target: targetInt,
              expected_successes: exp.expected_successes,
              expected_successes_int: exp.expected_successes_int,
            });
          }
        }
      }
      setGameState({
        phase: 'running',
        trainingId: run.id,
        ...(calendarId && { calendarId }),
        ...(calendarEntry && { calendarEntry }),
        sessionName,
        routinesWithSteps,
        levelReqsByType,
        routineIndex: 0,
        stepIndex: 0,
        attemptIndex: 1,
        visitSelections: [],
        allRoundScores: [],
        routineScores: [],
        completedVisitsInStep: 0,
      });
    } catch (e) {
      alert(isDataError(e) ? (e as Error).message : 'Failed to start session.');
    }
  }, [gameState, calendarId, player, supabase]);

  const addSegmentToVisit = useCallback(
    (segment: string) => {
      if (gameState.phase !== 'running') return;
      const routine = gameState.routinesWithSteps[gameState.routineIndex];
      const step = routine?.steps[gameState.stepIndex];
      const levelReqForStep = getLevelReqForStep(
        gameState.levelReqsByType,
        step?.routine_type ?? 'SS'
      );
      const N = getDartsPerStep(levelReqForStep, step?.routine_type ?? 'SS');
      const isCheckout = step?.routine_type === 'C';
      const maxInCurrentVisit = isCheckout ? N : Math.min(N, 3);
      if ((gameState.visitSelections ?? []).length >= maxInCurrentVisit) return;
      setGameState({
        ...gameState,
        visitSelections: [...(gameState.visitSelections ?? []), segment],
      });
    },
    [gameState]
  );

  const setVisitFromSegments = useCallback(
    (segments: string[]) => {
      if (gameState.phase !== 'running') return;
      setGameState({
        ...gameState,
        visitSelections: [...(gameState.visitSelections ?? []), ...segments],
      });
    },
    [gameState]
  );

  const clearVisit = useCallback(() => {
    if (gameState.phase !== 'running') return;
    setGameState({ ...gameState, visitSelections: [] });
  }, [gameState]);

  const undoLast = useCallback(() => {
    if (gameState.phase !== 'running' || (gameState.visitSelections ?? []).length === 0) return;
    setGameState({
      ...gameState,
      visitSelections: (gameState.visitSelections ?? []).slice(0, -1),
    });
  }, [gameState]);

  const submitVisit = useCallback(async (): Promise<SubmitVisitResult | undefined> => {
    if (gameState.phase !== 'running' || !player) return;
    const {
      routinesWithSteps,
      routineIndex,
      stepIndex,
      attemptIndex,
      visitSelections: vs,
      trainingId,
      levelReqsByType,
    } = gameState;
    const visitSelections = vs ?? [];
    const routine = routinesWithSteps?.[routineIndex];
    if (!routine) return;
    const step = routine.steps?.[stepIndex];
    if (!step) return;
    const levelReqForStep = getLevelReqForStep(levelReqsByType, step.routine_type);
    const N = getDartsPerStep(levelReqForStep, step.routine_type);
    const isCheckoutStep = step.routine_type === 'C';
    const targetInt = parseInt(step.target, 10);
    const checkoutCompletedEarly =
      isCheckoutStep &&
      !Number.isNaN(targetInt) &&
      visitSelections.length > 0 &&
      visitSelections.length < N &&
      computeRemaining(targetInt, visitSelections) === 0 &&
      computeCheckoutBustReason(targetInt, visitSelections) === null;
    if (visitSelections.length !== N && !checkoutCompletedEarly) return;
    const attemptCount = isCheckoutStep ? (levelReqForStep?.attempt_count ?? 3) : 1;
    const dartCount = visitSelections.length;
    try {
      if (isCheckoutStep) {
        let remaining = Number.isNaN(targetInt) ? 0 : targetInt;
        let checkoutDartIndex: number | null = null;
        for (let i = 0; i < dartCount; i++) {
          const actual = visitSelections[i] ?? 'M';
          const pts = segmentToScore(actual);
          remaining -= pts;
          if (remaining < 0) break;
          if (remaining === 1) break;
          if (remaining === 0) {
            if (isDoubleOrBull(actual)) checkoutDartIndex = i;
            break;
          }
        }
        for (let i = 0; i < dartCount; i++) {
          const actual = visitSelections[i] ?? 'M';
          const result = i === checkoutDartIndex ? 'H' : 'M';
          const remainingBeforeDart = computeRemaining(
            targetInt,
            visitSelections.slice(0, i)
          );
          const position = Math.min(i + 1, 3) as 1 | 2 | 3;
          const recommendedSegment = await getRecommendedSegmentForRemaining(
            supabase,
            remainingBeforeDart,
            position
          );
          const targetForDart = recommendedSegment ?? step.target;
          await insertDartScore(supabase, {
            player_id: player.id,
            training_id: trainingId,
            routine_id: routine.routine.id,
            routine_no: routineIndex + 1,
            step_no: step.step_no,
            dart_no: i + 1,
            attempt_index: attemptIndex,
            target: targetForDart,
            actual,
            result,
          });
        }
        const stepRun = await getPlayerStepRunByTrainingRoutineStep(
          supabase,
          trainingId,
          routine.routine.id,
          step.step_no
        );
        if (stepRun) {
          const thisAttemptSuccess = checkoutDartIndex !== null ? 1 : 0;
          const cumulativeActual = stepRun.actual_successes + thisAttemptSuccess;
          const sc = stepScore(stepRun.expected_successes_int, cumulativeActual);
          const isLastAttempt = attemptIndex >= attemptCount;
          await updatePlayerStepRun(supabase, stepRun.id, {
            actual_successes: cumulativeActual,
            step_score: sc,
            ...(isLastAttempt ? { completed_at: new Date().toISOString() } : {}),
          });
        }
        if (attemptIndex < attemptCount) {
          setGameState({
            ...gameState,
            attemptIndex: attemptIndex + 1,
            visitSelections: [],
          });
          return {
            stepComplete: false,
            sessionComplete: false,
            nextAttemptIndex: attemptIndex + 1,
          };
        }
      } else {
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
      }
    } catch (e) {
      alert(isDataError(e) ? (e as Error).message : 'Failed to save darts.');
      return;
    }
    const hits = visitSelections.filter((a) => isHitForTarget(a, step.target)).length;
    const isITASessionNow = isITASession(gameState.sessionName);
    let roundSc: number;
    if (isITASessionNow && !isCheckoutStep) {
      roundSc = (hits / N) * 100;
    } else {
      const playerLevel = player.training_rating ?? player.baseline_rating ?? 0;
      const expectedFromLevel = await getExpectedHitsForSingleDartRoutine(
        supabase,
        playerLevel,
        step.routine_type,
        N
      );
      const expectedHits = expectedFromLevel ?? levelReqForStep?.tgt_hits ?? Math.min(1, N);
      roundSc = roundScore(hits, expectedHits);
    }
    const allRoundScores = isCheckoutStep
      ? gameState.allRoundScores
      : [...gameState.allRoundScores, roundSc];
    let nextRoutineIndex = gameState.routineIndex;
    let nextStepIndex = stepIndex + 1;
    let routineScores = gameState.routineScores;
    if (nextStepIndex >= routine.steps.length) {
      const nonCCount = routine.steps.filter((s) => s.routine_type !== 'C').length;
      const startIdx = allRoundScores.length - nonCCount;
      const stepScores: number[] = [];
      let roundIdx = 0;
      for (const s of routine.steps) {
        if (s.routine_type === 'C') {
          const run = await getPlayerStepRunByTrainingRoutineStep(
            supabase,
            trainingId,
            routine.routine.id,
            s.step_no
          );
          stepScores.push(run?.step_score ?? 0);
        } else {
          stepScores.push(allRoundScores[startIdx + roundIdx] ?? 0);
          roundIdx += 1;
        }
      }
      const rScore = checkoutRoutineScore(stepScores);
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
        const finalSc = sessionScore(routineScores);
        try {
          await completeSessionRun(supabase, trainingId, finalSc);
          if (gameState.calendarId) {
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
        return { stepComplete: true, sessionComplete: true };
      }
    }
    setGameState({
      ...gameState,
      routineIndex: nextRoutineIndex,
      stepIndex: nextStepIndex,
      attemptIndex: 1,
      visitSelections: [],
      allRoundScores,
      routineScores,
      completedVisitsInStep: 0,
    });
    return { stepComplete: true, sessionComplete: false };
  }, [gameState, player, supabase, refetchPlayer]);

  const DARTS_PER_VISIT = 3;

  const submitCurrentVisit = useCallback(async (): Promise<SubmitVisitResult | undefined> => {
    if (gameState.phase !== 'running' || !player) return;
    const {
      routinesWithSteps,
      routineIndex,
      stepIndex,
      visitSelections: vs,
      trainingId,
      levelReqsByType,
      allRoundScores,
      routineScores,
    } = gameState;
    const completedVisitsInStep = gameState.completedVisitsInStep ?? 0;
    const visitSelections = vs ?? [];
    const routine = routinesWithSteps?.[routineIndex];
    if (!routine) return;
    const step = routine.steps?.[stepIndex];
    if (!step) return;
    if (step.routine_type === 'C') return;
    if (visitSelections.length !== DARTS_PER_VISIT) return;
    const N = getDartsPerStep(
      getLevelReqForStep(levelReqsByType, step.routine_type),
      step.routine_type
    );
    const totalVisitsInStep = Math.ceil(N / DARTS_PER_VISIT);
    const dartNoBase = completedVisitsInStep * DARTS_PER_VISIT;
    try {
      for (let i = 0; i < DARTS_PER_VISIT; i++) {
        const actual = visitSelections[i] ?? 'M';
        const result = isHitForTarget(actual, step.target) ? 'H' : 'M';
        await insertDartScore(supabase, {
          player_id: player.id,
          training_id: trainingId,
          routine_id: routine.routine.id,
          routine_no: routineIndex + 1,
          step_no: step.step_no,
          dart_no: dartNoBase + i + 1,
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
    const isITASessionNow = isITASession(gameState.sessionName);
    let roundSc: number;
    if (isITASessionNow) {
      roundSc = (hits / DARTS_PER_VISIT) * 100;
    } else {
      const playerLevel = player.training_rating ?? player.baseline_rating ?? 0;
      const levelReqForStep = getLevelReqForStep(levelReqsByType, step.routine_type);
      const expectedFromLevel = await getExpectedHitsForSingleDartRoutine(
        supabase,
        playerLevel,
        step.routine_type,
        DARTS_PER_VISIT
      );
      const expectedHits = expectedFromLevel ?? levelReqForStep?.tgt_hits ?? Math.min(1, DARTS_PER_VISIT);
      roundSc = roundScore(hits, expectedHits);
    }
    const newCompletedVisitsInStep = completedVisitsInStep + 1;
    const newAllRoundScores = [...allRoundScores, roundSc];
    const isLastVisitInStep = newCompletedVisitsInStep >= totalVisitsInStep;

    if (isLastVisitInStep) {
      const nextStepIndex = stepIndex + 1;
      let newRoutineScores = routineScores;
      if (nextStepIndex >= routine.steps.length) {
        const nonCCount = routine.steps.filter((s) => s.routine_type !== 'C').length;
        const startIdx = newAllRoundScores.length - nonCCount;
        const stepScores: number[] = [];
        let roundIdx = 0;
        for (const s of routine.steps) {
          if (s.routine_type === 'C') {
            const run = await getPlayerStepRunByTrainingRoutineStep(
              supabase,
              trainingId,
              routine.routine.id,
              s.step_no
            );
            stepScores.push(run?.step_score ?? 0);
          } else {
            stepScores.push(newAllRoundScores[startIdx + roundIdx] ?? 0);
            roundIdx += 1;
          }
        }
        const rScore = checkoutRoutineScore(stepScores);
        newRoutineScores = [...routineScores, rScore];
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
        const nextRoutineIndex = routineIndex + 1;
        if (nextRoutineIndex >= routinesWithSteps.length) {
          const finalSc = sessionScore(newRoutineScores);
          try {
            await completeSessionRun(supabase, trainingId, finalSc);
            if (gameState.calendarId) {
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
            }
            await refetchPlayer();
          } catch (e) {
            alert(isDataError(e) ? (e as Error).message : 'Failed to complete session.');
            return;
          }
          setGameState({
            phase: 'ended',
            finalSessionScore: finalSc,
            routineScores: newRoutineScores,
            sessionName: gameState.sessionName,
          });
          return { stepComplete: true, sessionComplete: true };
        }
        setGameState({
          ...gameState,
          routineIndex: nextRoutineIndex,
          stepIndex: 0,
          attemptIndex: 1,
          visitSelections: [],
          allRoundScores: newAllRoundScores,
          routineScores: newRoutineScores,
          completedVisitsInStep: 0,
        });
      } else {
        setGameState({
          ...gameState,
          stepIndex: nextStepIndex,
          attemptIndex: 1,
          visitSelections: [],
          allRoundScores: newAllRoundScores,
          completedVisitsInStep: 0,
        });
      }
      return { stepComplete: true, sessionComplete: false };
    }

    setGameState({
      ...gameState,
      visitSelections: [],
      allRoundScores: newAllRoundScores,
      completedVisitsInStep: newCompletedVisitsInStep,
    });
    return undefined;
  }, [gameState, player, supabase, refetchPlayer]);

  const getBackHref = useCallback(() => {
    if (runId) return '/play/free-training';
    return `/play/session/${calendarId ?? ''}`;
  }, [calendarId, runId]);

  const getSummaryUrl = useCallback(() => {
    if (runId) return `/play/free-training/run/${runId}/summary`;
    return `/play/session/${calendarId ?? ''}/summary`;
  }, [calendarId, runId]);

  return {
    gameState,
    setGameState,
    startResume,
    addSegmentToVisit,
    setVisitFromSegments,
    clearVisit,
    undoLast,
    submitVisit,
    submitCurrentVisit,
    getBackHref,
    getSummaryUrl,
  };
}

export function SessionGameProvider({ children }: { children: ReactNode }) {
  const { calendarId } = useParams<{ calendarId: string }>();
  const value = useSessionGameState(calendarId, undefined);
  return (
    <SessionGameContext.Provider value={value}>{children}</SessionGameContext.Provider>
  );
}

/** Provider for free-training run at /play/free-training/run/:runId. Same context shape as SessionGameProvider. */
export function FreeTrainingGameProvider({ children }: { children: ReactNode }) {
  const { runId } = useParams<{ runId: string }>();
  const value = useSessionGameState(undefined, runId);
  return (
    <SessionGameContext.Provider value={value}>{children}</SessionGameContext.Provider>
  );
}

export function useSessionGameContext(): SessionGameContextValue | null {
  return useContext(SessionGameContext);
}
