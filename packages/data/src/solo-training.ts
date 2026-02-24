/**
 * Solo training: create a cohort for a single player and generate calendar.
 * Per OPP_SINGLE_PLAYER_TRAINING_DOMAIN.md and OPP_SINGLE_PLAYER_TRAINING_IMPLEMENTATION_CHECKLIST §3.
 * Uses RPC create_solo_training_cohort (SECURITY DEFINER) so creation is not blocked by RLS.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';

const RPC_NAME = 'create_solo_training_cohort';

function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return 'A network or server error occurred';
}

function mapRpcError(err: unknown): never {
  if (err instanceof DataError) throw err;
  const msg = getErrorMessage(err);
  if (msg.includes('Player not found') || msg.includes('not authenticated')) {
    throw new DataError('Player not found or not authenticated', 'NOT_FOUND');
  }
  if (msg.includes('Schedule not found') || msg.includes('no entries')) {
    throw new DataError('Schedule not found or has no entries', 'VALIDATION');
  }
  if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
    throw new DataError('You may already have a solo cohort.', 'CONFLICT');
  }
  console.error('[@opp/data] solo-training RPC error:', err);
  throw new DataError(msg, 'NETWORK');
}

export interface CreateSoloTrainingCohortPayload {
  scheduleId: string;
  /** ISO date string (YYYY-MM-DD). */
  startDate: string;
}

/**
 * Create a solo cohort for the current player via RPC. The server creates the cohort (name from player nickname + " solo cohort"),
 * adds the player as member, and generates calendar + player_calendar from the schedule. RLS does not apply to the RPC (SECURITY DEFINER).
 */
export async function createSoloTrainingCohort(
  client: SupabaseClient,
  _playerId: string,
  payload: CreateSoloTrainingCohortPayload
): Promise<{ cohortId: string }> {
  const startDate = payload.startDate.slice(0, 10);

  const { data, error } = await client.rpc(RPC_NAME, {
    p_schedule_id: payload.scheduleId,
    p_start_date: startDate,
  });

  if (error) mapRpcError(error);
  if (data == null) mapRpcError(new Error('No cohort id returned'));

  return { cohortId: data as string };
}
