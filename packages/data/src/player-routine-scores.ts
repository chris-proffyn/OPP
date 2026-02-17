/**
 * Player routine scores: one row per (training_id, routine_id). RLS: players insert/update own; admin full.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import type { PlayerRoutineScore, PlayerRoutineScorePayload } from './types';

const PLAYER_ROUTINE_SCORES_TABLE = 'player_routine_scores';
const ROUTINES_TABLE = 'routines';

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

/** Result shape for admin drill-down: routine scores for one session run. */
export interface RoutineScoreForRun {
  routine_id: string;
  routine_name: string;
  routine_score: number;
}

/**
 * List routine scores for a session run (training_id). For admin drill-down: sessions → routines → scores.
 * RLS: admin can read any; player can read own.
 */
export async function listRoutineScoresForSessionRun(
  client: SupabaseClient,
  trainingId: string
): Promise<RoutineScoreForRun[]> {
  const { data: prsRows, error: prsError } = await client
    .from(PLAYER_ROUTINE_SCORES_TABLE)
    .select('routine_id, routine_score')
    .eq('training_id', trainingId);
  if (prsError) mapError(prsError);
  const prs = (prsRows ?? []) as { routine_id: string; routine_score: number }[];
  if (prs.length === 0) return [];
  const routineIds = [...new Set(prs.map((p) => p.routine_id))];
  const { data: routineRows, error: routineError } = await client
    .from(ROUTINES_TABLE)
    .select('id, name')
    .in('id', routineIds);
  if (routineError) mapError(routineError);
  const nameById = new Map<string, string>();
  for (const r of (routineRows ?? []) as { id: string; name: string }[]) {
    nameById.set(r.id, r.name);
  }
  return prs.map((p) => ({
    routine_id: p.routine_id,
    routine_name: nameById.get(p.routine_id) ?? '',
    routine_score: p.routine_score,
  }));
}
