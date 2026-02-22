/**
 * Checkout combinations data access. List: any authenticated user (reference lookup).
 * Update: admin only; RLS enforces.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import { getCurrentPlayer } from './players';
import type { CheckoutCombination, UpdateCheckoutCombinationPayload } from './types';

const CHECKOUT_COMBINATIONS_TABLE = 'checkout_combinations';

const PGRST_NO_ROWS = 'PGRST116';

function requireAdmin(client: SupabaseClient): Promise<void> {
  return getCurrentPlayer(client).then((current) => {
    if (!current || current.role !== 'admin') {
      throw new DataError('Admin access required', 'FORBIDDEN');
    }
  });
}

function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  if (err && typeof err === 'object' && 'details' in err && typeof (err as { details: unknown }).details === 'string') {
    return (err as { details: string }).details;
  }
  return 'A network or server error occurred';
}

function mapError(err: unknown): never {
  if (err instanceof DataError) throw err;
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: string }).code;
    if (code === PGRST_NO_ROWS) {
      throw new DataError('Checkout combination not found', 'NOT_FOUND');
    }
  }
  console.error('[@opp/data] Supabase error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

/**
 * List all checkout_combinations ordered by total descending (170 down to 2). Any authenticated user.
 */
export async function listCheckoutCombinations(
  client: SupabaseClient
): Promise<CheckoutCombination[]> {
  const { data, error } = await client
    .from(CHECKOUT_COMBINATIONS_TABLE)
    .select('*')
    .order('total', { ascending: false });
  if (error) mapError(error);
  return (data ?? []) as CheckoutCombination[];
}

/**
 * Get the recommended checkout combination for a given total (2–170). Returns null if none found.
 * Used by GE to display route for current remaining. Any authenticated user.
 */
export async function getCheckoutCombinationByTotal(
  client: SupabaseClient,
  total: number
): Promise<CheckoutCombination | null> {
  const { data, error } = await client
    .from(CHECKOUT_COMBINATIONS_TABLE)
    .select('*')
    .eq('total', total)
    .maybeSingle();
  if (error) mapError(error);
  return (data ?? null) as CheckoutCombination | null;
}

/**
 * Update a checkout combination by id (dart1, dart2, dart3). Admin only.
 */
export async function updateCheckoutCombination(
  client: SupabaseClient,
  id: string,
  payload: UpdateCheckoutCombinationPayload
): Promise<CheckoutCombination> {
  await requireAdmin(client);
  const updates: Record<string, unknown> = {};
  if (payload.dart1 !== undefined) updates.dart1 = payload.dart1;
  if (payload.dart2 !== undefined) updates.dart2 = payload.dart2;
  if (payload.dart3 !== undefined) updates.dart3 = payload.dart3;
  if (Object.keys(updates).length === 0) {
    const { data: row, error: fetchError } = await client
      .from(CHECKOUT_COMBINATIONS_TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchError) mapError(fetchError);
    if (!row) throw new DataError('Checkout combination not found', 'NOT_FOUND');
    return row as CheckoutCombination;
  }
  const { data, error } = await client
    .from(CHECKOUT_COMBINATIONS_TABLE)
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) mapError(error);
  if (!data) throw new DataError('Checkout combination not found', 'NOT_FOUND');
  return data as CheckoutCombination;
}
