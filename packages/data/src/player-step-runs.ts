/**
 * Player step runs: per-step outcomes for checkout routines. One row per (training_id, routine_id, step_no).
 * RLS: SELECT/INSERT/UPDATE own or admin; DELETE admin.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import type {
  CreatePlayerStepRunPayload,
  PlayerStepRun,
  UpdatePlayerStepRunPayload,
} from './types';

const TABLE = 'player_step_runs';
const PGRST_NO_ROWS = 'PGRST116';

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
  if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === PGRST_NO_ROWS) {
    throw new DataError('Player step run not found', 'NOT_FOUND');
  }
  console.error('[@opp/data] Supabase error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

function toPlayerStepRun(row: Record<string, unknown>): PlayerStepRun {
  return {
    id: row.id as string,
    player_id: row.player_id as string,
    training_id: row.training_id as string,
    routine_id: row.routine_id as string,
    routine_no: Number(row.routine_no),
    step_no: Number(row.step_no),
    routine_step_id: (row.routine_step_id as string) ?? null,
    checkout_target: Number(row.checkout_target),
    expected_successes: Number(row.expected_successes),
    expected_successes_int: Number(row.expected_successes_int),
    actual_successes: Number(row.actual_successes ?? 0),
    step_score: row.step_score != null ? Number(row.step_score) : null,
    completed_at: (row.completed_at as string) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

/**
 * Create a player step run (e.g. when starting a checkout step). Caller sets expected_successes from getExpectedCheckoutSuccesses.
 */
export async function createPlayerStepRun(
  client: SupabaseClient,
  payload: CreatePlayerStepRunPayload
): Promise<PlayerStepRun> {
  const row = {
    player_id: payload.player_id,
    training_id: payload.training_id,
    routine_id: payload.routine_id,
    routine_no: payload.routine_no,
    step_no: payload.step_no,
    routine_step_id: payload.routine_step_id ?? null,
    checkout_target: payload.checkout_target,
    expected_successes: payload.expected_successes,
    expected_successes_int: payload.expected_successes_int,
    actual_successes: payload.actual_successes ?? 0,
    step_score: payload.step_score ?? null,
    completed_at: payload.completed_at ?? null,
  };
  const { data, error } = await client.from(TABLE).insert(row).select().single();
  if (error) mapError(error);
  if (!data) throw new DataError('Failed to create player step run', 'NETWORK');
  return toPlayerStepRun(data as Record<string, unknown>);
}

/**
 * Update a player step run (e.g. when step is completed: set actual_successes, step_score, completed_at).
 */
export async function updatePlayerStepRun(
  client: SupabaseClient,
  id: string,
  payload: UpdatePlayerStepRunPayload
): Promise<PlayerStepRun> {
  const updates: Record<string, unknown> = {};
  if (payload.actual_successes !== undefined) updates.actual_successes = payload.actual_successes;
  if (payload.step_score !== undefined) updates.step_score = payload.step_score;
  if (payload.completed_at !== undefined) updates.completed_at = payload.completed_at;
  if (Object.keys(updates).length === 0) {
    const { data } = await client.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (!data) throw new DataError('Player step run not found', 'NOT_FOUND');
    return toPlayerStepRun(data as Record<string, unknown>);
  }
  const { data, error } = await client
    .from(TABLE)
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) mapError(error);
  if (!data) throw new DataError('Player step run not found', 'NOT_FOUND');
  return toPlayerStepRun(data as Record<string, unknown>);
}

/**
 * List player step runs for a session run (training_id), ordered by routine_no, step_no.
 * Used to compute routine_score from step scores when all steps of a checkout routine are completed.
 */
export async function listPlayerStepRunsByTrainingId(
  client: SupabaseClient,
  trainingId: string
): Promise<PlayerStepRun[]> {
  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('training_id', trainingId)
    .order('routine_no', { ascending: true })
    .order('step_no', { ascending: true });
  if (error) mapError(error);
  return ((data ?? []) as Record<string, unknown>[]).map(toPlayerStepRun);
}

/**
 * Get one player step run by (training_id, routine_id, step_no). Returns null if not found.
 */
export async function getPlayerStepRunByTrainingRoutineStep(
  client: SupabaseClient,
  trainingId: string,
  routineId: string,
  stepNo: number
): Promise<PlayerStepRun | null> {
  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('training_id', trainingId)
    .eq('routine_id', routineId)
    .eq('step_no', stepNo)
    .maybeSingle();
  if (error) mapError(error);
  return data ? toPlayerStepRun(data as Record<string, unknown>) : null;
}

/** Alias for listPlayerStepRunsByTrainingId (step runs for a session run). */
export const getPlayerStepRunsForSessionRun = listPlayerStepRunsByTrainingId;
