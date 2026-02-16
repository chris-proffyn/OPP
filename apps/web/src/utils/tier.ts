/**
 * P6: Tier for feature gating. Default 'free' when missing (e.g. before migration or null).
 * Per P6_DASHBOARD_ANALYZER_DOMAIN.md §8.
 */

export type EffectiveTier = 'free' | 'gold' | 'platinum';

/**
 * Returns the player's tier for UI gating. Defaults to 'free' when tier is missing or invalid.
 */
export function getEffectiveTier(player: { tier?: string | null } | null): EffectiveTier {
  const t = player?.tier;
  if (t === 'gold' || t === 'platinum') return t;
  return 'free';
}

export function isPremiumTier(player: { tier?: string | null } | null): boolean {
  return getEffectiveTier(player) !== 'free';
}
