/**
 * P7 — Match Rating and Competition: rating parameters and constants.
 * Per P7_MATCH_RATING_COMPETITION_DOMAIN.md §9.2 and OPP_MATCH_RATING_ENGINE_SPEC.
 *
 * These values are defined in code for P7. They can later be moved to
 * system_settings, rating_config, or similar DB-backed config for tuning
 * without code changes.
 */

/** Max number of eligible matches included in the OMR rolling window. */
export const OMR_WINDOW_SIZE = 10;

/** When eligible match count >= this, trim highest and lowest MR before weighted mean. */
export const OMR_TRIM_THRESHOLD = 6;

/**
 * Format weight by best-of-N legs. Used for match weight in OMR.
 * Best-of-5 = 1.0, 7 = 1.1, 9 = 1.2, 11 = 1.3; others default to 1.0.
 */
export const FORMAT_WEIGHTS: Record<number, number> = {
  5: 1.0,
  7: 1.1,
  9: 1.2,
  11: 1.3,
};

/** Weight multiplier when opponent is outside ±1 PR decade of player. */
export const OUT_OF_BAND_WEIGHT = 0.8;

/** Weight for TR in PR formula: PR = (TR × PR_TR_WEIGHT + OMR × PR_OMR_WEIGHT) / (PR_TR_WEIGHT + PR_OMR_WEIGHT). */
export const PR_TR_WEIGHT = 1;

/** Weight for OMR in PR formula. */
export const PR_OMR_WEIGHT = 1;

/**
 * Returns the decade (band start) for a rating: 0–9 → 0, 10–19 → 10, …, 90–99 → 90.
 * Used for eligibility "±1 PR decade" and out-of-band weight.
 *
 * @param rating - PR or TR value (typically 0–99), or null
 * @returns Decade start (0, 10, 20, …, 90) or null if rating is null
 */
export function getDecade(rating: number | null): number | null {
  if (rating == null || Number.isNaN(rating)) return null;
  const decade = Math.floor(rating / 10) * 10;
  return Math.min(90, Math.max(0, decade));
}
