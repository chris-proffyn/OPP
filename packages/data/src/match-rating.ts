/**
 * P7 — Match Rating (MR) calculation. Per P7_MATCH_RATING_COMPETITION_DOMAIN.md §6 and OPP_MATCH_RATING_ENGINE_SPEC.
 * Pure functions for MR, format weight, and opponent band (eligibility/weight).
 */

import { FORMAT_WEIGHTS, getDecade } from './rating-params';

/** Inputs for computing MR. Leg share = legs_won / total_legs. */
export interface ComputeMatchRatingInputs {
  /** Opponent PR or OMR at time of match (0–100 scale). */
  opponentStrength: number;
  /** Leg share in [0, 1]. */
  legShare: number;
  /** Match 3DA (optional; used when formula supports it). */
  threeDartAvg?: number | null;
  /** Player 3DA baseline (optional). */
  player3DABaseline?: number | null;
  /** Doubles % in [0, 1] (optional). */
  doublesPct?: number | null;
}

const MR_MIN = 0;
const MR_MAX = 100;

/**
 * Compute per-match rating (MR) on a 0–100 scale.
 *
 * P7 PLACEHOLDER: Exact formula is not final in OPP_MATCH_RATING_ENGINE_SPEC. This implements
 * MR = base 50 + (legShare - 0.5)*scale + winBonus + opponentAdjustment, clamped 0–100.
 * To be replaced when MR formula is finalised (see P7_MATCH_RATING_COMPETITION_IMPLEMENTATION_TASKS.md §5.1).
 *
 * @param inputs - opponentStrength, legShare, and optional 3DA/baseline/doublesPct
 * @returns MR in [0, 100]
 */
export function computeMatchRating(inputs: ComputeMatchRatingInputs): number {
  const { opponentStrength, legShare } = inputs;
  const legShareScale = 40;
  const winBonus = legShare > 0.5 ? 5 : 0;
  const opponentScale = 0.15;
  const opponentAdjustment = (opponentStrength - 50) * opponentScale;
  let mr = 50 + (legShare - 0.5) * legShareScale + winBonus + opponentAdjustment;
  if (inputs.threeDartAvg != null && inputs.player3DABaseline != null && inputs.player3DABaseline > 0) {
    const ratio = inputs.threeDartAvg / inputs.player3DABaseline;
    mr += (ratio - 1) * 5;
  }
  if (inputs.doublesPct != null && inputs.doublesPct >= 0 && inputs.doublesPct <= 1) {
    mr += (inputs.doublesPct - 0.5) * 4;
  }
  return Math.round(Math.max(MR_MIN, Math.min(MR_MAX, mr)) * 10) / 10;
}

/**
 * Return format weight for best-of-N: 1.0 (5), 1.1 (7), 1.2 (9), 1.3 (11). Unknown format returns 1.0.
 */
export function getFormatWeight(formatBestOf: number): number {
  const w = FORMAT_WEIGHTS[formatBestOf];
  return w ?? 1.0;
}

/**
 * True if opponent is within ±1 PR decade of player (used for eligibility and weight; out-of-band → weight × 0.8).
 * If either rating is null, returns false (conservative: treat as out of band).
 */
export function isOpponentInBand(playerPR: number | null, opponentPR: number | null): boolean {
  const pd = getDecade(playerPR);
  const od = getDecade(opponentPR);
  if (pd == null || od == null) return false;
  return Math.abs(pd - od) <= 10;
}
