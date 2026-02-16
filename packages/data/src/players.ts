/**
 * Player data access. All reads/writes go through Supabase client; RLS enforces auth.
 * Caller must pass an authenticated client (from app).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import type { CreatePlayerPayload, Player, UpdatePlayerPayload } from './types';

const PLAYERS_TABLE = 'players';
const PGRST_NO_ROWS = 'PGRST116';

/** Postgres error code for unique violation */
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

function mapSupabaseError(err: unknown): never {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: string }).code;
    if (code === PG_UNIQUE_VIOLATION) {
      throw new DataError('Profile already exists', 'CONFLICT');
    }
    if (code === PGRST_NO_ROWS) {
      throw new DataError('Player not found', 'NOT_FOUND');
    }
  }
  if (err instanceof DataError) throw err;
  console.error('[@opp/data] Supabase error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

/**
 * Get the current user's player row, or null if none (e.g. before onboarding).
 * RLS restricts to own row. Select * includes P6 tier and avatar_url; app should treat missing tier as 'free'.
 */
export async function getCurrentPlayer(client: SupabaseClient): Promise<Player | null> {
  const { data, error } = await client
    .from(PLAYERS_TABLE)
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) mapSupabaseError(error);
  return data as Player | null;
}

/**
 * Create a player row for the current auth user (onboarding).
 * Throws DataError with code CONFLICT if a row for this user already exists.
 */
export async function createPlayer(
  client: SupabaseClient,
  payload: CreatePlayerPayload
): Promise<Player> {
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user) {
    throw new DataError('Not authenticated', 'FORBIDDEN');
  }

  const { data, error } = await client
    .from(PLAYERS_TABLE)
    .insert({
      user_id: user.id,
      display_name: payload.display_name,
      email: payload.email,
      gender: payload.gender ?? null,
      age_range: payload.age_range ?? null,
      baseline_rating: 0,
      training_rating: 0,
    })
    .select()
    .single();

  if (error) mapSupabaseError(error);
  return data as Player;
}

/**
 * Update the current user's player row (profile edit). Only allowed fields are updated.
 * Does not touch baseline_rating or training_rating — those are set only by setBaselineAndTrainingRating (ITA)
 * and applyTrainingRatingProgression (after each training session). P5.
 * Throws if not found or error.
 */
export async function updatePlayer(
  client: SupabaseClient,
  payload: UpdatePlayerPayload
): Promise<Player> {
  const updates: Record<string, unknown> = {};
  if (payload.display_name !== undefined) updates.display_name = payload.display_name;
  if (payload.email !== undefined) updates.email = payload.email;
  if (payload.gender !== undefined) updates.gender = payload.gender;
  if (payload.age_range !== undefined) updates.age_range = payload.age_range;

  if (Object.keys(updates).length === 0) {
    const current = await getCurrentPlayer(client);
    if (!current) throw new DataError('Player not found', 'NOT_FOUND');
    return current;
  }

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user) throw new DataError('Not authenticated', 'FORBIDDEN');

  const { data, error } = await client
    .from(PLAYERS_TABLE)
    .update(updates)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) mapSupabaseError(error);
  if (!data) throw new DataError('Player not found', 'NOT_FOUND');
  return data as Player;
}

/**
 * List all players. Allowed only for admin (current user's player.role === 'admin').
 * Throws DataError FORBIDDEN if not admin.
 */
export async function listPlayers(client: SupabaseClient): Promise<Player[]> {
  const current = await getCurrentPlayer(client);
  if (!current || current.role !== 'admin') {
    throw new DataError('Admin access required', 'FORBIDDEN');
  }

  const { data, error } = await client
    .from(PLAYERS_TABLE)
    .select('id, user_id, display_name, email, gender, age_range, baseline_rating, training_rating, match_rating, player_rating, ita_score, ita_completed_at, tier, avatar_url, date_joined, role, created_at, updated_at');

  if (error) mapSupabaseError(error);
  return (data ?? []) as Player[];
}

/**
 * Get a player by id. RLS allows only own row or admin.
 * Returns null if no row (e.g. wrong id or not allowed). Select * includes P6 tier and avatar_url.
 */
export async function getPlayerById(
  client: SupabaseClient,
  playerId: string
): Promise<Player | null> {
  const { data, error } = await client
    .from(PLAYERS_TABLE)
    .select('*')
    .eq('id', playerId)
    .maybeSingle();

  if (error) mapSupabaseError(error);
  return data as Player | null;
}

/**
 * P5: Set baseline_rating and training_rating (e.g. after ITA). RLS: only that player or admin.
 * Guard: BR is set only once — if baseline_rating is already non-null, throws VALIDATION.
 * Use for ITA completion; re-assessment would require a separate admin path or allowOverwrite option.
 * @returns Updated player. Throws NOT_FOUND if player missing, VALIDATION if BR already set.
 */
export async function setBaselineAndTrainingRating(
  client: SupabaseClient,
  playerId: string,
  baselineRating: number
): Promise<Player> {
  const player = await getPlayerById(client, playerId);
  if (!player) {
    throw new DataError('Player not found', 'NOT_FOUND');
  }
  const currentBr = player.baseline_rating != null ? Number(player.baseline_rating) : null;
  if (currentBr != null && currentBr !== 0) {
    throw new DataError('Baseline rating already set', 'VALIDATION');
  }

  const { data, error } = await client
    .from(PLAYERS_TABLE)
    .update({
      baseline_rating: baselineRating,
      training_rating: baselineRating,
    })
    .eq('id', playerId)
    .select()
    .single();

  if (error) mapSupabaseError(error);
  if (!data) throw new DataError('Player not found', 'NOT_FOUND');
  return data as Player;
}

/**
 * P5: Set ita_score and ita_completed_at for audit (e.g. after ITA completion).
 * RLS: only that player or admin. Call after setBaselineAndTrainingRating in ITA flow.
 * Requires migration that added players.ita_score and players.ita_completed_at.
 */
export async function setPlayerITACompleted(
  client: SupabaseClient,
  playerId: string,
  itaScore: number
): Promise<void> {
  const { error } = await client
    .from(PLAYERS_TABLE)
    .update({
      ita_score: itaScore,
      ita_completed_at: new Date().toISOString(),
    })
    .eq('id', playerId);
  if (error) mapSupabaseError(error);
}
