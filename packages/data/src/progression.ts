/**
 * P5 Training Rating: CR progression after session. Per P5_TRAINING_RATING_DOMAIN.md §6.
 * RLS: only the player (own row) or admin can update players.training_rating.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import { getPlayerById } from './players';
import { levelChangeFromSessionScore } from './scoring';

const PLAYERS_TABLE = 'players';
const PGRST_NO_ROWS = 'PGRST116';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
  if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === PGRST_NO_ROWS) {
    throw new DataError('Player not found', 'NOT_FOUND');
  }
  console.error('[@opp/data] Progression error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

/**
 * Apply CR (training_rating) progression after a training session.
 * Reads current training_rating (or 0 if null), adds levelChangeFromSessionScore(sessionScorePercent), clamps to 1–99, updates players row.
 * RLS ensures only that player or admin can update. Throws NOT_FOUND if player missing.
 * @returns The new training_rating (1–99).
 */
export async function applyTrainingRatingProgression(
  client: SupabaseClient,
  playerId: string,
  sessionScorePercent: number
): Promise<number> {
  const player = await getPlayerById(client, playerId);
  if (!player) {
    throw new DataError('Player not found', 'NOT_FOUND');
  }

  const currentCR = player.training_rating != null ? Number(player.training_rating) : 0;
  const change = levelChangeFromSessionScore(sessionScorePercent);
  const newValue = clamp(Math.round(currentCR) + change, 1, 99);

  const { data, error } = await client
    .from(PLAYERS_TABLE)
    .update({ training_rating: newValue })
    .eq('id', playerId)
    .select('training_rating')
    .single();

  if (error) mapError(error);
  const updated = (data as { training_rating: number } | null)?.training_rating;
  return updated != null ? Number(updated) : newValue;
}
