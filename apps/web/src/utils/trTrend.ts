/**
 * P6: TR trend from recent session scores. Compare last 2 vs previous 2 averages.
 * Per P6_DASHBOARD_ANALYZER_DOMAIN.md §7.
 */

export type TRTrend = 'up' | 'down' | 'stable' | null;

/**
 * Returns trend from last 4 scores (most recent first): compare avg(first 2) vs avg(next 2).
 * If fewer than 4 scores, returns null (or caller can show stable).
 */
export function computeTRTrend(scores: { session_score: number }[]): TRTrend {
  if (scores.length < 4) return null;
  const s0 = scores[0]; const s1 = scores[1]; const s2 = scores[2]; const s3 = scores[3];
  if (s0 == null || s1 == null || s2 == null || s3 == null) return null;
  const recent = (s0.session_score + s1.session_score) / 2;
  const previous = (s2.session_score + s3.session_score) / 2;
  if (recent > previous) return 'up';
  if (recent < previous) return 'down';
  return 'stable';
}
