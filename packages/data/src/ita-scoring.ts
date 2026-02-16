/**
 * P5 ITA (Initial Training Assessment) scoring — pure functions.
 * Per OPP_TRAINING_RATING_ENGINE_SPEC_v2.md §4 and P5_TRAINING_RATING_DOMAIN.md §5.2.
 * No Supabase dependency.
 */

/**
 * Singles rating = average of segment scores (each segment score = (hits/9)×100 already).
 * Returns 0 for empty array.
 */
export function computeSinglesRating(segmentScores: number[]): number {
  if (segmentScores.length === 0) return 0;
  const sum = segmentScores.reduce((a, b) => a + b, 0);
  return sum / segmentScores.length;
}

/** Doubles scale: 1→100, 2→90, 3→70, 4→50, 5→30, >5→0. Linear interpolation between integers. */
const DOUBLES_POINTS: [number, number][] = [
  [1, 100],
  [2, 90],
  [3, 70],
  [4, 50],
  [5, 30],
  [6, 0],
];

/**
 * Doubles rating from average darts to hit the double. Sliding scale with linear interpolation.
 * Example: 5.7 darts → ~9 (spec §4.3).
 */
export function computeDoublesRating(avgDartsToHit: number): number {
  if (avgDartsToHit <= 1) return 100;
  if (avgDartsToHit >= 6) return 0;
  const i = Math.floor(avgDartsToHit);
  const frac = avgDartsToHit - i;
  const [d1, r1] = DOUBLES_POINTS[i - 1];
  const [d2, r2] = DOUBLES_POINTS[i];
  return r1 + (frac * (r2 - r1)) / (d2 - d1);
}

/** Checkout scale: 0→100, 1→80, 2→60, 3→40, 4→20; linear from 4 to 10→0; ≥10→0. */
function checkoutRatingAt(aboveMin: number): number {
  if (aboveMin <= 0) return 100;
  if (aboveMin === 1) return 80;
  if (aboveMin === 2) return 60;
  if (aboveMin === 3) return 40;
  if (aboveMin === 4) return 20;
  if (aboveMin >= 10) return 0;
  return 20 + ((aboveMin - 4) * (0 - 20)) / (10 - 4);
}

/**
 * Checkout rating from average darts above minimum. Scale: min→100, min+1→80, min+2→60, min+3→40, min+4→20, min+10+→0 (linear between 4 and 10).
 * @param avgDartsAboveMin - average darts above minimum checkout (can be fractional).
 */
export function computeCheckoutRating(avgDartsAboveMin: number): number {
  if (avgDartsAboveMin <= 0) return 100;
  if (avgDartsAboveMin >= 10) return 0;
  const lo = Math.floor(avgDartsAboveMin);
  const hi = lo + 1;
  const rLo = checkoutRatingAt(lo);
  const rHi = hi >= 10 ? 0 : checkoutRatingAt(hi);
  const frac = avgDartsAboveMin - lo;
  return rLo + frac * (rHi - rLo);
}

/**
 * ITA score = (3×Singles + 2×Doubles + 1×Checkout) / 6. Rounded down to integer (e.g. L29).
 * Example: 26.4, 9, 80 → 29.53 → 29 (spec §4.5).
 */
export function computeITAScore(
  singlesRating: number,
  doublesRating: number,
  checkoutRating: number
): number {
  const raw = (3 * singlesRating + 2 * doublesRating + 1 * checkoutRating) / 6;
  return Math.floor(raw);
}
