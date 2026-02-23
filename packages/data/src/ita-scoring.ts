/**
 * P5 ITA (Initial Training Assessment) scoring — pure functions.
 * Per OPP_TRAINING_RATING_ENGINE_SPEC_v2.md §4 and P5_TRAINING_RATING_DOMAIN.md §5.2.
 * No Supabase dependency. No expected level: ratings are computed from raw dart outcomes only,
 * for use at ITA completion when OPP assigns BR and initial TR.
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
  const a = DOUBLES_POINTS[i - 1];
  const b = DOUBLES_POINTS[i];
  if (a === undefined || b === undefined) return 0;
  const [d1, r1] = a;
  const [d2, r2] = b;
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

/** Weights for ITA score by type. Only types present in the session are included. */
const ITA_WEIGHTS: Record<'Singles' | 'Doubles' | 'Trebles' | 'Checkout', number> = {
  Singles: 3,
  Doubles: 2,
  Trebles: 2,
  Checkout: 1,
};

/**
 * ITA score = weighted average of ratings for types present. Weights: Singles 3, Doubles 2, Trebles 2, Checkout 1.
 * When typesPresent is given, only those types are included (no particular combination required).
 * When typesPresent is omitted, backward-compat: S+D+C, or S+D+T+C if treblesRating provided.
 * Rounded down to integer.
 */
export function computeITAScore(
  singlesRating: number,
  doublesRating: number,
  checkoutRating: number,
  treblesRating?: number,
  typesPresent?: ReadonlyArray<'Singles' | 'Doubles' | 'Trebles' | 'Checkout'>
): number {
  const present: ReadonlyArray<'Singles' | 'Doubles' | 'Trebles' | 'Checkout'> =
    typesPresent && typesPresent.length > 0
      ? typesPresent
      : (treblesRating !== undefined && treblesRating !== null
          ? (['Singles', 'Doubles', 'Checkout', 'Trebles'] as const)
          : (['Singles', 'Doubles', 'Checkout'] as const)) as ReadonlyArray<
          'Singles' | 'Doubles' | 'Trebles' | 'Checkout'
        >;
  let sum = 0;
  let weightSum = 0;
  for (const t of present) {
    const w = ITA_WEIGHTS[t];
    weightSum += w;
    if (t === 'Singles') sum += w * singlesRating;
    else if (t === 'Doubles') sum += w * doublesRating;
    else if (t === 'Trebles') sum += w * (treblesRating ?? 0);
    else sum += w * checkoutRating;
  }
  if (weightSum === 0) return 0;
  return Math.floor(sum / weightSum);
}
