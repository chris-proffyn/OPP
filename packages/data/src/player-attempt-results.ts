/**
 * Player attempt results: per-attempt success/failure for checkout steps.
 * RLS: SELECT/INSERT/UPDATE own or admin; DELETE admin.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import type { CreatePlayerAttemptResultPayload, PlayerAttemptResult } from './types';

const TABLE = 'player_attempt_results';

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
  console.error('[@opp/data] Supabase error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

function toPlayerAttemptResult(row: Record<string, unknown>): PlayerAttemptResult {
  return {
    id: row.id as string,
    player_step_run_id: row.player_step_run_id as string,
    attempt_index: Number(row.attempt_index),
    is_success: Boolean(row.is_success),
    darts_used: Number(row.darts_used),
    completed_at: String(row.completed_at),
  };
}

/**
 * Insert a player attempt result (one row per attempt within a step run).
 */
export async function insertPlayerAttemptResult(
  client: SupabaseClient,
  payload: CreatePlayerAttemptResultPayload
): Promise<PlayerAttemptResult> {
  const row = {
    player_step_run_id: payload.player_step_run_id,
    attempt_index: payload.attempt_index,
    is_success: payload.is_success,
    darts_used: payload.darts_used,
    completed_at: payload.completed_at ?? new Date().toISOString(),
  };
  const { data, error } = await client.from(TABLE).insert(row).select().single();
  if (error) mapError(error);
  if (!data) throw new DataError('Failed to create player attempt result', 'NETWORK');
  return toPlayerAttemptResult(data as Record<string, unknown>);
}

/**
 * List attempt results for a step run, ordered by attempt_index.
 */
export async function listAttemptResultsForStepRun(
  client: SupabaseClient,
  playerStepRunId: string
): Promise<PlayerAttemptResult[]> {
  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('player_step_run_id', playerStepRunId)
    .order('attempt_index', { ascending: true });
  if (error) mapError(error);
  return ((data ?? []) as Record<string, unknown>[]).map(toPlayerAttemptResult);
}
