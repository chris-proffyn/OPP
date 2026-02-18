/**
 * Pure scoring functions for the Game Engine. Per OPP_TRAINING_RATING_ENGINE_SPEC_v2.md §6.
 * Round score (%) = (hits / expectedHits) × 100; routine/session score = average of round scores.
 * Per OPP_SCORING_UPDATE: for single-dart routines (SS, SD, ST), callers should pass
 * expected hits from getExpectedHitsForSingleDartRoutine (level_averages + routine_type);
 * for checkout (C) or fallback, use level_requirements.tgt_hits.
 */

/**
 * Round score as a percentage. (Actual hits / Expected hits) × 100. Scores may exceed 100%.
 * The second parameter is "expected hits" for this round (from level_averages + routine_type for SS/SD/ST, or tgt_hits for C).
 * If expectedHits is 0 (e.g. level 0), treat as "any hit = 100%": hits > 0 → 100, else 0.
 * If expectedHits is negative, returns 0 (invalid).
 */
export function roundScore(hits: number, targetHits: number): number {
  if (targetHits < 0) return 0;
  if (targetHits === 0) return hits > 0 ? 100 : 0;
  return (hits / targetHits) * 100;
}

/**
 * Routine score (%) = average of round scores for that routine. Empty array → 0.
 */
export function routineScore(roundScores: number[]): number {
  if (roundScores.length === 0) return 0;
  const sum = roundScores.reduce((a, b) => a + b, 0);
  return sum / roundScores.length;
}

/**
 * Session score (%) = average of all round scores for the session (per TR spec §6).
 * Same formula as routineScore but over the full session. Empty array → 0.
 */
export function sessionScore(roundScores: number[]): number {
  if (roundScores.length === 0) return 0;
  const sum = roundScores.reduce((a, b) => a + b, 0);
  return sum / roundScores.length;
}

/**
 * Checkout step score (%). Per OPP_CHECKOUT_TRAINING_DOMAIN.md.
 * step_score = (actual_successes / expected_successes_int) * 100, capped at 200.
 * If expected_successes_int === 0: actual_successes === 0 → 100, else → 200.
 */
export function stepScore(expected_successes_int: number, actual_successes: number): number {
  if (expected_successes_int === 0) {
    return actual_successes === 0 ? 100 : 200;
  }
  const raw = (actual_successes / expected_successes_int) * 100;
  return Math.min(raw, 200);
}

/**
 * Checkout routine score = average of step scores, optionally capped at 200.
 * Same as routineScore(stepScores) with cap; use when aggregating checkout step scores.
 */
export function checkoutRoutineScore(stepScores: number[]): number {
  if (stepScores.length === 0) return 0;
  const avg = routineScore(stepScores);
  return Math.min(avg, 200);
}

/**
 * Level change from session score % (per P5 TR spec §8 / OPP_TRAINING_RATING_ENGINE_SPEC §8).
 * Pure function. Used to update CR (training_rating) after each training session.
 * Boundaries: <50% → −1; 50–99% → 0; 100–199% → +1; 200–299% → +2; ≥300% → +3.
 */
export function levelChangeFromSessionScore(sessionScorePercent: number): number {
  if (sessionScorePercent < 50) return -1;
  if (sessionScorePercent < 100) return 0;
  if (sessionScorePercent < 200) return 1;
  if (sessionScorePercent < 300) return 2;
  return 3;
}
