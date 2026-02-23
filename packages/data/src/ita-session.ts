/**
 * P5 ITA session: evaluate player performance from session run and set BR/initial TR.
 * Per P5_TRAINING_RATING_DOMAIN.md §5.2–5.3, OPP_ITA_DOMAIN.md.
 *
 * **ITA as initial assessment:** There is no expected level of performance. The player follows the session
 * plan (routines and steps); at completion, OPP evaluates performance from **raw dart data only** (no level
 * requirements or expected hits). Ratings and ITA score are derived purely from dart_scores; then BR and
 * initial TR are set.
 *
 * **Routine identification:** ITA routine type is determined only by the step routine_type field (SS/SD/ST/C).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import { getCalendarEntryById, getGlobalITACalendarId } from './calendar';
import { listDartScoresByTrainingId } from './dart-scores';
import { getAllSessionsForPlayer } from './player-calendar';
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
import type { RoutineType, SessionWithStatus } from './types';

export type ITARoutineType = 'Singles' | 'Doubles' | 'Trebles' | 'Checkout';

export interface ITARatings {
  singlesRating: number;
  doublesRating: number;
  checkoutRating: number;
  /** Present when session includes a Trebles (ST) routine. */
  treblesRating?: number;
  itaScore: number;
}

/**
 * Player-like object with optional ITA fields. Used by hasCompletedITA.
 */
export interface PlayerITAStatus {
  ita_completed_at?: string | null;
  baseline_rating?: number | null;
}

/**
 * Returns true if the player has completed the Initial Training Assessment.
 * Single source of truth for UI and routing (OPP_ITA_IMPLEMENTATION_CHECKLIST §1).
 * Uses Option A: ita_completed_at != null (set by setPlayerITACompleted after ITA session).
 */
export function hasCompletedITA(player: PlayerITAStatus | null | undefined): boolean {
  if (!player) return false;
  return player.ita_completed_at != null;
}

/**
 * Returns true if the session is an ITA session (name-based). Per P5_TRAINING_RATING_DOMAIN.md §9.1 Option A.
 * Session name must equal "ITA" or "Initial Training Assessment" (case-insensitive).
 * Used for routing and resolving the ITA calendar entry (OPP_ITA_IMPLEMENTATION_CHECKLIST §4).
 */
export function isITASession(sessionName: string): boolean {
  const n = sessionName.trim().toLowerCase();
  return n === 'ita' || n === 'initial training assessment';
}

/**
 * Resolves the ITA calendar entry for the player (Option A: cohort/schedule includes ITA).
 * Returns the first calendar entry whose session name is ITA, or null if none.
 * Use for "Complete ITA" and "direct to ITA" flows; if null, show "Contact your coach to assign the ITA session".
 */
export async function getITACalendarEntryForPlayer(
  client: SupabaseClient,
  playerId: string
): Promise<SessionWithStatus | null> {
  const sessions = await getAllSessionsForPlayer(client, playerId);
  return sessions.find((s) => isITASession(s.session_name ?? '')) ?? null;
}

const PLAYER_CALENDAR_TABLE = 'player_calendar';

/**
 * Get or create the ITA calendar entry for the player (ITA outside cohort/schedule, OPP_ITA_UPDATE).
 * 1) If the player already has an ITA entry (from cohort calendar or previous get-or-create), return it.
 * 2) Otherwise, ensure the global ITA calendar exists and assign it to the player (insert player_calendar), then return it.
 * Throws DataError if the global ITA calendar does not exist (migrations not run or ITA session missing).
 */
export async function getOrCreateITACalendarEntryForPlayer(
  client: SupabaseClient,
  playerId: string
): Promise<SessionWithStatus> {
  const existing = await getITACalendarEntryForPlayer(client, playerId);
  if (existing) return existing;

  const calendarId = await getGlobalITACalendarId(client);
  if (!calendarId) {
    throw new DataError(
      'ITA is not set up yet. If you are the administrator, run the database migrations (see docs). Otherwise contact support.',
      'NOT_FOUND'
    );
  }

  await client
    .from(PLAYER_CALENDAR_TABLE)
    .upsert(
      { player_id: playerId, calendar_id: calendarId, status: 'planned' },
      { onConflict: 'player_id,calendar_id', ignoreDuplicates: true }
    );

  const entry = await getCalendarEntryById(client, calendarId);
  if (!entry) {
    throw new DataError(
      'ITA calendar could not be loaded after assigning. Try again or contact support.',
      'NETWORK'
    );
  }

  const now = new Date().toISOString();
  const status: SessionWithStatus['status'] = entry.scheduled_at <= now ? 'Due' : 'Future';
  return {
    calendar_id: entry.id,
    session_id: entry.session_id,
    session_name: entry.session_name ?? '',
    scheduled_at: entry.scheduled_at,
    day_no: entry.day_no,
    session_no: entry.session_no,
    cohort_id: entry.cohort_id,
    schedule_id: entry.schedule_id,
    status,
  };
}

/**
 * Map step routine_type (SS/SD/ST/C) to ITA routine type. Used for validation only; name is not used.
 * Returns null if stepRoutineType is not a valid ITA type (SS→Singles, SD→Doubles, ST→Trebles, C→Checkout).
 */
export function getRoutineITAType(stepRoutineType: RoutineType): ITARoutineType | null {
  switch (stepRoutineType) {
    case 'SS':
      return 'Singles';
    case 'SD':
      return 'Doubles';
    case 'ST':
      return 'Trebles';
    case 'C':
      return 'Checkout';
    default:
      return null;
  }
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
 * Pure: compute ITA ratings from raw dart data only (no expected level or target hits).
 * Used at ITA completion to evaluate performance and derive ITA score for BR/initial TR.
 * Singles/Trebles: 9 darts per step, segment score = (hits/9)×100, rating = average of segment scores.
 * Doubles: per step, darts to first H (or 6 if none); rating = computeDoublesRating(avg).
 * Checkout: steps 1..5 = checkouts 56,39,29,23,15 with min darts [2,1,1,1,1]; aboveMin = darts in step − min; rating = computeCheckoutRating(avg).
 */
export function computeITARatingsFromDartScores(
  routines: ITARoutineInfo[],
  darts: DartRow[]
): ITARatings {
  const singlesRoutine = routines.find((r) => r.type === 'Singles');
  const doublesRoutine = routines.find((r) => r.type === 'Doubles');
  const treblesRoutine = routines.find((r) => r.type === 'Trebles');
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

  let treblesRating: number | undefined;
  if (treblesRoutine) {
    const byStep = new Map<number, DartRow[]>();
    for (const d of darts) {
      if (d.routine_no !== treblesRoutine.routine_no) continue;
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
    treblesRating = segmentScores.length > 0 ? computeSinglesRating(segmentScores) : 0;
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

  const typesPresent = [...new Set(routines.map((r) => r.type))];
  const itaScore = computeITAScore(
    singlesRating,
    doublesRating,
    checkoutRating,
    treblesRating,
    typesPresent
  );
  const result: ITARatings = { singlesRating, doublesRating, checkoutRating, itaScore };
  if (treblesRating !== undefined) result.treblesRating = treblesRating;
  return result;
}

/**
 * Load session run, calendar, session+routines, darts; classify each routine by step routine_type (SS/SD/ST/C).
 * No particular combination of routine types is required; ITA score is computed from whatever types are present.
 * Returns ITARatings or null if not an ITA session or data missing.
 * @internal Used by completeITAAndSetBR; throws DataError with specific reason when validation fails (for debugging).
 */
export async function deriveITARatingsFromSessionRun(
  client: SupabaseClient,
  sessionRunId: string
): Promise<ITARatings | null> {
  const run = await getSessionRunById(client, sessionRunId);
  if (!run) return null;

  const calendarEntry = await getCalendarEntryById(client, run.calendar_id);
  if (!calendarEntry) {
    throw new DataError(
      'ITA completion failed: no calendar entry for this session run',
      'VALIDATION'
    );
  }

  const sessionData = await getSessionWithRoutines(client, calendarEntry.session_id);
  if (!sessionData) {
    throw new DataError(
      'ITA completion failed: session not found',
      'VALIDATION'
    );
  }
  if (sessionData.routines.length < 1) {
    throw new DataError(
      `ITA completion failed: session has no routines`,
      'VALIDATION'
    );
  }

  const routines: ITARoutineInfo[] = [];
  for (const sr of sessionData.routines) {
    const rws = await getRoutineWithSteps(client, sr.routine_id);
    if (!rws) {
      throw new DataError(
        `ITA completion failed: routine not found for routine_no ${sr.routine_no}`,
        'VALIDATION'
      );
    }
    const stepType = rws.steps[0]?.routine_type;
    if (!stepType) {
      throw new DataError(
        `ITA completion failed: routine "${rws.routine.name}" has no steps or routine_type not set (must be SS, SD, ST, or C)`,
        'VALIDATION'
      );
    }
    const t = getRoutineITAType(stepType);
    if (!t) {
      throw new DataError(
        `ITA completion failed: routine "${rws.routine.name}" has routine_type "${stepType}" which is not valid for ITA (must be SS, SD, ST, or C)`,
        'VALIDATION'
      );
    }
    routines.push({ routine_no: sr.routine_no, type: t, stepCount: rws.steps.length });
  }

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
 * Complete ITA flow: evaluate performance from raw dart data, compute ITA score, set BR and initial TR.
 * No expected level is used; evaluation is purely from recorded darts. Call after session end for ITA
 * sessions. Do not call applyTrainingRatingProgression for ITA.
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
