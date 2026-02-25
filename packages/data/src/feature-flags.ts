/**
 * App feature flags. Stored in public.feature_flags (key, value).
 * Read by app; only admins may update via admin UI.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export const FEATURE_FLAG_VOICE_ENABLED = 'voice_enabled';

export async function getFeatureFlag(
  client: SupabaseClient,
  key: string
): Promise<boolean> {
  const { data, error } = await client
    .from('feature_flags')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw error;
  return data?.value === true;
}

export async function setFeatureFlag(
  client: SupabaseClient,
  key: string,
  value: boolean
): Promise<void> {
  const { error } = await client
    .from('feature_flags')
    .upsert({ key, value }, { onConflict: 'key' });
  if (error) throw error;
}
