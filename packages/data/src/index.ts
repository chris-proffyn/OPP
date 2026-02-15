/**
 * @opp/data — data-access layer. All Supabase access goes through here.
 * UI must not call Supabase directly.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

/**
 * Create a Supabase client. Call with env from the app (e.g. VITE_* in web).
 * Never use service_role in client code.
 */
export function createSupabaseClient(env: SupabaseEnv): SupabaseClient {
  return createClient(env.url, env.anonKey);
}
