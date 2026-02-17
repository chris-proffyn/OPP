/**
 * P5 ITA session: derive Singles/Doubles/Checkout ratings from session run data; optional BR set.
 * Per P5_TRAINING_RATING_DOMAIN.md §5.3, §9.1–9.2.
 *
 * **Routine identification (Option A, name-based):** Singles/Doubles/Checkout are identified by
 * routine name containing (case-insensitive) "Singles", "Doubles", or "Checkout". The session
 * must have exactly three routines and exactly one of each type. Position (1/2/3) is not used.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import { getCalendarEntryById } from './calendar';
import { listDartScoresByTrainingId } from './dart-scores';
import { getRoutineWithSteps } from './routines';
import { getSessionRunById } from './session-runs';
import { getSessionWithRoutines } from './sessions';
import {
  computeCheckoutRating,
  computeDoublesRating,
  computeITAScore,
  computeSinglesRating,
} from './ita-scoring';
import { setBaselineAndTrainingRating, setPlayerITACompleted } from './players';
import { updatePlayerPR } from './pr';

export type ITARoutineType = 'Singles' | 'Doubles' | 'Checkout';

export interface ITARatings {
  singlesRating: number;
  doublesRating: number;
  checkoutRating: number;
  itaScore: number;
}

/**
 * Identify ITA routine type from routine name (Option A: name-based). Case-insensitive.
 * Returns null if name does not match Singles, Doubles, or Checkout.
 */
export function getRoutineITAType(name: string): ITARoutineType | null {
  const n = name.trim().toLowerCase();
  if (n.includes('singles')) return 'Singles';
  if (n.includes('doubles')) return 'Doubles';
  if (n.includes('checkout')) return 'Checkout';
  return null;
}

/** Minimal dart row for pure computation */
export interface DartRow {
  routine_no: number;
  step_no: number;
  dart_no: number;
  result: 'H' | 'M';
}

/** Routine info for pure computation */
export interface ITARoutineInfo {
  routine_no: number;
  type: ITARoutineType;
  stepCount: number;
}

/**
 * Pure: compute Singles, Doubles, Checkout ratings from dart data and routine types.
 * Singles: 9 darts per step, segment score = (hits/9)×100, rating = average of segment scores.
 * Doubles: per step, darts to first H (or 6 if none); rating = computeDoublesRating(avg).
 * Checkout: steps 1..5 = checkouts 56,39,29,23,15 with min darts [2,1,1,1,1]; aboveMin = darts in step − min; rating = computeCheckoutRating(avg).
 */
export function computeITARatingsFromDartScores(
  routines: ITARoutineInfo[],
  darts: DartRow[]
): ITARatings {
  const singlesRoutine = routines.find((r) => r.type === 'Singles');
  const doublesRoutine = routines.find((r) => r.type === 'Doubles');
  const checkoutRoutine = routines.find((r) => r.type === 'Checkout');

  let singlesRating = 0;
  if (singlesRoutine) {
    const byStep = new Map<number, DartRow[]>();
    for (const d of darts) {
      if (d.routine_no !== singlesRoutine.routine_no) continue;
      const list = byStep.get(d.step_no) ?? [];
      list.push(d);
      byStep.set(d.step_no, list);
    }
    const segmentScores: number[] = [];
    byStep.forEach((rows) => {
      if (rows.length >= 9) {
        const hits = rows.filter((r) => r.result === 'H').length;
        segmentScores.push((hits / 9) * 100);
      }
    });
    singlesRating = computeSinglesRating(segmentScores);
  }

  let doublesRating = 0;
  if (doublesRoutine) {
    const byStep = new Map<number, DartRow[]>();
    for (const d of darts) {
      if (d.routine_no !== doublesRoutine.routine_no) continue;
      const list = byStep.get(d.step_no) ?? [];
      list.push(d);
      byStep.set(d.step_no, list);
    }
    const dartsToHit: number[] = [];
    byStep.forEach((rows) => {
      const sorted = [...rows].sort((a, b) => a.dart_no - b.dart_no);
      const firstH = sorted.find((r) => r.result === 'H');
      dartsToHit.push(firstH ? firstH.dart_no : 6);
    });
    const avg = dartsToHit.length > 0 ? dartsToHit.reduce((a, b) => a + b, 0) / dartsToHit.length : 6;
    doublesRating = computeDoublesRating(avg);
  }

  const CHECKOUT_MIN_DARTS = [2, 1, 1, 1, 1];
  let checkoutRating = 0;
  if (checkoutRoutine) {
    const byStep = new Map<number, DartRow[]>();
    for (const d of darts) {
      if (d.routine_no !== checkoutRoutine.routine_no) continue;
      const list = byStep.get(d.step_no) ?? [];
      list.push(d);
      byStep.set(d.step_no, list);
    }
    const aboveMins: number[] = [];
    byStep.forEach((rows, step_no) => {
      const minDarts = CHECKOUT_MIN_DARTS[step_no - 1] ?? 1;
      aboveMins.push(Math.max(0, rows.length - minDarts));
    });
    const avg = aboveMins.length > 0 ? aboveMins.reduce((a, b) => a + b, 0) / aboveMins.length : 0;
    checkoutRating = computeCheckoutRating(avg);
  }

  const itaScore = computeITAScore(singlesRating, doublesRating, checkoutRating);
  return { singlesRating, doublesRating, checkoutRating, itaScore };
}

/**
 * Load session run, calendar, session+routines, darts; identify ITA by name (exactly 3 routines: Singles, Doubles, Checkout).
 * Returns ITARatings or null if not an ITA session or data missing.
 */
export async function deriveITARatingsFromSessionRun(
  client: SupabaseClient,
  sessionRunId: string
): Promise<ITARatings | null> {
  const run = await getSessionRunById(client, sessionRunId);
  if (!run) return null;

  const calendarEntry = await getCalendarEntryById(client, run.calendar_id);
  if (!calendarEntry) return null;

  const sessionData = await getSessionWithRoutines(client, calendarEntry.session_id);
  if (!sessionData || sessionData.routines.length !== 3) return null;

  const routines: ITARoutineInfo[] = [];
  for (const sr of sessionData.routines) {
    const rws = await getRoutineWithSteps(client, sr.routine_id);
    if (!rws) return null;
    const t = getRoutineITAType(rws.routine.name);
    if (!t) return null;
    routines.push({ routine_no: sr.routine_no, type: t, stepCount: rws.steps.length });
  }

  const hasSingles = routines.some((r) => r.type === 'Singles');
  const hasDoubles = routines.some((r) => r.type === 'Doubles');
  const hasCheckout = routines.some((r) => r.type === 'Checkout');
  if (!hasSingles || !hasDoubles || !hasCheckout) return null;

  const dartRows = await listDartScoresByTrainingId(client, sessionRunId);
  const darts: DartRow[] = dartRows.map((d) => ({
    routine_no: d.routine_no,
    step_no: d.step_no,
    dart_no: d.dart_no,
    result: d.result,
  }));

  return computeITARatingsFromDartScores(routines, darts);
}

/**
 * Complete ITA flow: derive ratings, compute ITA score, set BR and TR, set ita_score and ita_completed_at.
 * Call after session end for ITA sessions. Do not call applyTrainingRatingProgression for ITA.
 */
export async function completeITAAndSetBR(
  client: SupabaseClient,
  sessionRunId: string,
  playerId: string
): Promise<ITARatings> {
  const ratings = await deriveITARatingsFromSessionRun(client, sessionRunId);
  if (!ratings) {
    throw new DataError('Session is not a valid ITA or data missing', 'VALIDATION');
  }
  await setBaselineAndTrainingRating(client, playerId, ratings.itaScore);
  await updatePlayerPR(client, playerId);
  await setPlayerITACompleted(client, playerId, ratings.itaScore);
  return ratings;
}
