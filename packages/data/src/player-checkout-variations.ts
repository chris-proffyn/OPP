/**
 * Player checkout variations: CRUD for the current player's own rows only.
 * RLS enforces ownership; we set player_id from current user on create.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import { getCurrentPlayer } from './players';
import type {
  CreatePlayerCheckoutVariationPayload,
  PlayerCheckoutVariation,
  UpdatePlayerCheckoutVariationPayload,
} from './types';

const TABLE = 'player_checkout_variations';

const PGRST_NO_ROWS = 'PGRST116';
const PG_UNIQUE_VIOLATION = '23505';

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
      throw new DataError('Checkout variation not found', 'NOT_FOUND');
    }
    if (code === PG_UNIQUE_VIOLATION) {
      throw new DataError('You already have a variation for this total', 'CONFLICT');
    }
  }
  console.error('[@opp/data] Supabase error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

/**
 * List the current player's checkout variations, ordered by total descending.
 */
export async function listPlayerCheckoutVariations(
  client: SupabaseClient
): Promise<PlayerCheckoutVariation[]> {
  const player = await getCurrentPlayer(client);
  if (!player) throw new DataError('You must be signed in', 'FORBIDDEN');
  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('player_id', player.id)
    .order('total', { ascending: false });
  if (error) mapError(error);
  return (data ?? []) as PlayerCheckoutVariation[];
}

/**
 * Get the current player's checkout variation for a given total (2–170). Returns null if none.
 * Used by GE to display "Your route" for current remaining.
 */
export async function getPlayerCheckoutVariationByTotal(
  client: SupabaseClient,
  total: number
): Promise<PlayerCheckoutVariation | null> {
  const player = await getCurrentPlayer(client);
  if (!player) throw new DataError('You must be signed in', 'FORBIDDEN');
  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('player_id', player.id)
    .eq('total', total)
    .maybeSingle();
  if (error) mapError(error);
  return (data ?? null) as PlayerCheckoutVariation | null;
}

/**
 * Create a checkout variation for the current player. Total must be 2–170; one variation per total per player.
 */
export async function createPlayerCheckoutVariation(
  client: SupabaseClient,
  payload: CreatePlayerCheckoutVariationPayload
): Promise<PlayerCheckoutVariation> {
  const player = await getCurrentPlayer(client);
  if (!player) throw new DataError('You must be signed in', 'FORBIDDEN');
  const total = Number(payload.total);
  if (total < 2 || total > 170 || !Number.isInteger(total)) {
    throw new DataError('Total must be an integer between 2 and 170', 'VALIDATION');
  }
  const { data, error } = await client
    .from(TABLE)
    .insert({
      player_id: player.id,
      total,
      dart1: payload.dart1 ?? null,
      dart2: payload.dart2 ?? null,
      dart3: payload.dart3 ?? null,
    })
    .select()
    .single();
  if (error) mapError(error);
  return data as PlayerCheckoutVariation;
}

/**
 * Update a checkout variation by id. Caller must own the row (RLS enforces).
 */
export async function updatePlayerCheckoutVariation(
  client: SupabaseClient,
  id: string,
  payload: UpdatePlayerCheckoutVariationPayload
): Promise<PlayerCheckoutVariation> {
  const player = await getCurrentPlayer(client);
  if (!player) throw new DataError('You must be signed in', 'FORBIDDEN');
  const updates: Record<string, unknown> = {};
  if (payload.dart1 !== undefined) updates.dart1 = payload.dart1;
  if (payload.dart2 !== undefined) updates.dart2 = payload.dart2;
  if (payload.dart3 !== undefined) updates.dart3 = payload.dart3;
  if (Object.keys(updates).length === 0) {
    const { data: row, error: fetchError } = await client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .eq('player_id', player.id)
      .maybeSingle();
    if (fetchError) mapError(fetchError);
    if (!row) throw new DataError('Checkout variation not found', 'NOT_FOUND');
    return row as PlayerCheckoutVariation;
  }
  const { data, error } = await client
    .from(TABLE)
    .update(updates)
    .eq('id', id)
    .eq('player_id', player.id)
    .select()
    .single();
  if (error) mapError(error);
  if (!data) throw new DataError('Checkout variation not found', 'NOT_FOUND');
  return data as PlayerCheckoutVariation;
}

/**
 * Delete a checkout variation by id. Caller must own the row (RLS enforces).
 */
export async function deletePlayerCheckoutVariation(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const player = await getCurrentPlayer(client);
  if (!player) throw new DataError('You must be signed in', 'FORBIDDEN');
  const { data, error } = await client
    .from(TABLE)
    .delete()
    .eq('id', id)
    .eq('player_id', player.id)
    .select('id');
  if (error) mapError(error);
  if (!data || data.length === 0) {
    throw new DataError('Checkout variation not found', 'NOT_FOUND');
  }
}
