/**
 * Player routine scores: one row per (training_id, routine_id). RLS: players insert/update own; admin full.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import type { PlayerRoutineScore, PlayerRoutineScorePayload } from './types';

const PLAYER_ROUTINE_SCORES_TABLE = 'player_routine_scores';

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

/**
 * Insert or update player_routine_scores for (training_id, routine_id). Unique on (training_id, routine_id).
 * Returns the row after upsert.
 */
export async function upsertPlayerRoutineScore(
  client: SupabaseClient,
  payload: PlayerRoutineScorePayload
): Promise<PlayerRoutineScore> {
  const { data, error } = await client
    .from(PLAYER_ROUTINE_SCORES_TABLE)
    .upsert(
      {
        player_id: payload.player_id,
        training_id: payload.training_id,
        routine_id: payload.routine_id,
        routine_score: payload.routine_score,
      },
      { onConflict: 'training_id,routine_id' }
    )
    .select()
    .single();
  if (error) mapError(error);
  if (!data) throw new DataError('Failed to save routine score', 'NETWORK');
  return data as PlayerRoutineScore;
}
