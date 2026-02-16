/**
 * Pure scoring functions for the Game Engine. Per OPP_TRAINING_RATING_ENGINE_SPEC_v2.md §6.
 * Round score (%) = (hits / targetHits) × 100; routine/session score = average of round scores.
 */

/**
 * Round score as a percentage. (Actual hits / Target hits) × 100. Scores may exceed 100.
 * If targetHits is 0, returns 0 to avoid division by zero.
 */
export function roundScore(hits: number, targetHits: number): number {
  if (targetHits <= 0) return 0;
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
