/**
 * P7 — OMR (Overall Match Rating) calculation. Per domain §7 and OPP_MATCH_RATING_ENGINE_SPEC.
 * Data layer: fetch eligible matches; pure: compute OMR; update players.match_rating.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import { OMR_TRIM_THRESHOLD, OMR_WINDOW_SIZE } from './rating-params';

const MATCHES_TABLE = 'matches';
const PLAYERS_TABLE = 'players';
const PGRST_NO_ROWS = 'PGRST116';

/** One row's contribution to OMR: match_rating and weight. */
export interface EligibleMatchForOMR {
  match_rating: number;
  weight: number;
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
    throw new DataError('Match not found', 'NOT_FOUND');
  }
  console.error('[@opp/data] Supabase error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

/**
 * Fetch eligible matches for OMR: player_id = playerId, eligible = true, order by played_at DESC, limit.
 * Returns list with match_rating and weight only (data layer; no side effects).
 */
export async function getEligibleMatchesForOMR(
  client: SupabaseClient,
  playerId: string,
  limit: number = OMR_WINDOW_SIZE
): Promise<EligibleMatchForOMR[]> {
  const { data, error } = await client
    .from(MATCHES_TABLE)
    .select('match_rating, weight')
    .eq('player_id', playerId)
    .eq('eligible', true)
    .order('played_at', { ascending: false })
    .limit(Math.max(1, Math.min(limit, OMR_WINDOW_SIZE)));
  if (error) mapError(error);
  const rows = (data ?? []) as { match_rating: number; weight: number }[];
  return rows.map((r) => ({ match_rating: Number(r.match_rating), weight: Number(r.weight) }));
}

/**
 * Compute OMR from eligible matches: if n ≤ 5, weighted average of all; if n ≥ 6, sort by match_rating
 * ascending, trim highest and lowest, then weighted mean of remainder. OMR = (Σ (w_i × MR_i)) / (Σ w_i).
 * Returns null if no matches.
 */
export function computeOMR(matches: EligibleMatchForOMR[]): number | null {
  if (matches.length === 0) return null;
  let use = matches;
  if (matches.length >= OMR_TRIM_THRESHOLD) {
    const sorted = [...matches].sort((a, b) => a.match_rating - b.match_rating);
    use = sorted.slice(1, -1);
  }
  let sumWx = 0;
  let sumW = 0;
  for (const m of use) {
    sumWx += m.weight * m.match_rating;
    sumW += m.weight;
  }
  if (sumW === 0) return null;
  const omr = sumWx / sumW;
  return Math.round(omr * 10) / 10;
}

/**
 * Recompute OMR for a player and write to players.match_rating. Call after each new eligible match
 * insert (for both players). If no eligible matches, sets match_rating to null.
 */
export async function updatePlayerOMR(client: SupabaseClient, playerId: string): Promise<number | null> {
  const eligible = await getEligibleMatchesForOMR(client, playerId);
  const omr = computeOMR(eligible);
  const { error } = await client
    .from(PLAYERS_TABLE)
    .update({ match_rating: omr })
    .eq('id', playerId);
  if (error) mapError(error);
  return omr;
}
