/**
 * P7 — Player Rating (PR) calculation. Per domain §8.
 * PR = hybrid of TR and OMR; uses constants from rating-params (§2).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import { getPlayerById } from './players';
import { PR_OMR_WEIGHT, PR_TR_WEIGHT } from './rating-params';

const PLAYERS_TABLE = 'players';
const PR_MIN = 1;
const PR_MAX = 99;
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
    throw new DataError('Player not found', 'NOT_FOUND');
  }
  console.error('[@opp/data] Supabase error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

/**
 * Compute PR from TR and OMR. If both present: PR = (TR × α + OMR × β) / (α + β). If only TR, PR = TR; if only OMR, PR = OMR. Clamped 1–99 to align with TR scale. Returns null if both null.
 */
export function computePR(tr: number | null, omr: number | null): number | null {
  const hasTr = tr != null && !Number.isNaN(tr);
  const hasOmr = omr != null && !Number.isNaN(omr);
  if (!hasTr && !hasOmr) return null;
  if (hasTr && !hasOmr) return Math.round(Math.max(PR_MIN, Math.min(PR_MAX, tr)) * 10) / 10;
  if (!hasTr && hasOmr) return Math.round(Math.max(PR_MIN, Math.min(PR_MAX, omr)) * 10) / 10;
  const α = PR_TR_WEIGHT;
  const β = PR_OMR_WEIGHT;
  const trVal = tr as number;
  const omrVal = omr as number;
  const pr = (trVal * α + omrVal * β) / (α + β);
  return Math.round(Math.max(PR_MIN, Math.min(PR_MAX, pr)) * 10) / 10;
}

/**
 * Read player's training_rating and match_rating (OMR), compute PR, update players.player_rating. Call after OMR update and after TR update so PR stays in sync.
 */
export async function updatePlayerPR(client: SupabaseClient, playerId: string): Promise<number | null> {
  const player = await getPlayerById(client, playerId);
  if (!player) throw new DataError('Player not found', 'NOT_FOUND');
  const tr = player.training_rating != null ? Number(player.training_rating) : null;
  const omr = player.match_rating != null ? Number(player.match_rating) : null;
  const pr = computePR(tr, omr);
  const { error } = await client
    .from(PLAYERS_TABLE)
    .update({ player_rating: pr })
    .eq('id', playerId);
  if (error) mapError(error);
  return pr;
}
