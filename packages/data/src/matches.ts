/**
 * P7 — Matches and next competition data access. Per P7_MATCH_RATING_COMPETITION_DOMAIN.md §5, §10.3.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import { getCurrentCohortForPlayer } from './cohort-members';
import { listCompetitions } from './competitions';
import type { Competition, Match, MatchWithOpponentDisplay } from './types';

const MATCHES_TABLE = 'matches';
const PGRST_NO_ROWS = 'PGRST116';

export interface ListMatchesForPlayerOptions {
  limit?: number;
  competitionId?: string;
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

const MATCH_SELECT =
  'id, player_id, opponent_id, competition_id, calendar_id, played_at, format_best_of, legs_won, legs_lost, total_legs, three_dart_avg, player_3da_baseline, doubles_attempted, doubles_hit, doubles_pct, opponent_rating_at_match, rating_difference, match_rating, weight, eligible, created_at, updated_at';

/**
 * List matches for a player (player_id = playerId), ordered by played_at DESC. Includes opponent display_name for UI.
 * RLS: players see own matches; admins see all.
 */
export async function listMatchesForPlayer(
  client: SupabaseClient,
  playerId: string,
  options?: ListMatchesForPlayerOptions
): Promise<MatchWithOpponentDisplay[]> {
  let query = client
    .from(MATCHES_TABLE)
    .select(`${MATCH_SELECT}, opponent:players!opponent_id(nickname)`)
    .eq('player_id', playerId)
    .order('played_at', { ascending: false });
  if (options?.competitionId != null) {
    query = query.eq('competition_id', options.competitionId);
  }
  if (options?.limit != null && options.limit > 0) {
    query = query.limit(options.limit);
  }
  const { data, error } = await query;
  if (error) mapError(error);
  type Row = Match & { opponent: { nickname: string } | { nickname: string }[] | null };
  const rows = (data ?? []) as Row[];
  return rows.map((r) => {
    const { opponent, ...match } = r;
    const raw = Array.isArray(opponent) ? opponent[0] : opponent;
    const opponent_display_name =
      raw && typeof raw === 'object' && 'nickname' in raw
        ? (raw.nickname as string) ?? null
        : null;
    return { ...match, opponent_display_name } as MatchWithOpponentDisplay;
  });
}

/**
 * Return the next competition for the player: cohort is in player's current cohort and scheduled_at >= now(), earliest first. Returns null if no current cohort or no such competition.
 */
export async function getNextCompetitionForPlayer(
  client: SupabaseClient,
  playerId: string
): Promise<Competition | null> {
  const cohort = await getCurrentCohortForPlayer(client, playerId);
  if (!cohort) return null;
  const list = await listCompetitions(client, {
    cohortId: cohort.id,
    limit: 20,
    order: 'asc',
  });
  const now = new Date().toISOString();
  const next = list.find((c) => c.scheduled_at != null && c.scheduled_at >= now) ?? null;
  return next;
}

/**
 * List matches for a competition (admin/reporting). Ordered by played_at.
 */
export async function listMatchesForCompetition(
  client: SupabaseClient,
  competitionId: string
): Promise<Match[]> {
  const { data, error } = await client
    .from(MATCHES_TABLE)
    .select(MATCH_SELECT)
    .eq('competition_id', competitionId)
    .order('played_at', { ascending: true });
  if (error) mapError(error);
  return (data ?? []) as Match[];
}
