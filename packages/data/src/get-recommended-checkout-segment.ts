/**
 * Recommended segment for a given remaining total and dart position (1–3).
 * Used when recording checkout darts so dart_scores.target stores the recommended aim (e.g. T17), not the step total (121).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getCheckoutCombinationByTotal } from './checkout-combinations';
import { getPlayerCheckoutVariationByTotal } from './player-checkout-variations';

/**
 * Get the recommended segment for dart at position (1, 2, or 3) given remaining total.
 * Prefers player variation, then checkout combination. Returns null if total out of range (2–170),
 * no combination/variation, or position > 3.
 */
export async function getRecommendedSegmentForRemaining(
  client: SupabaseClient,
  remaining: number,
  position: 1 | 2 | 3
): Promise<string | null> {
  if (remaining < 2 || remaining > 170) return null;
  const [combination, variation] = await Promise.all([
    getCheckoutCombinationByTotal(client, remaining),
    getPlayerCheckoutVariationByTotal(client, remaining).catch(() => null),
  ]);
  const segment =
    (position === 1 && (variation?.dart1 ?? combination?.dart1)) ||
    (position === 2 && (variation?.dart2 ?? combination?.dart2)) ||
    (position === 3 && (variation?.dart3 ?? combination?.dart3)) ||
    null;
  return typeof segment === 'string' && segment.length > 0 ? segment : null;
}
