/**
 * Cohort members data access. Admin-only for add/remove; getCurrentCohortForPlayer used by app/UI.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import { getCurrentPlayer } from './players';
import type { Cohort, CohortMember } from './types';

const COHORT_MEMBERS_TABLE = 'cohort_members';
const COHORTS_TABLE = 'cohorts';
const PGRST_NO_ROWS = 'PGRST116';

function requireAdmin(client: SupabaseClient): Promise<void> {
  return getCurrentPlayer(client).then((current) => {
    if (!current || current.role !== 'admin') {
      throw new DataError('Admin access required', 'FORBIDDEN');
    }
  });
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
    throw new DataError('Cohort member not found', 'NOT_FOUND');
  }
  console.error('[@opp/data] Supabase error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

export interface CohortMemberWithPlayer {
  id: string;
  cohort_id: string;
  player_id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * List cohort members for a cohort, with display_name from players. Admin only.
 */
export async function listCohortMembers(
  client: SupabaseClient,
  cohortId: string
): Promise<CohortMemberWithPlayer[]> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(COHORT_MEMBERS_TABLE)
    .select(`
      id,
      cohort_id,
      player_id,
      created_at,
      updated_at,
      players(display_name)
    `)
    .eq('cohort_id', cohortId);
  if (error) mapError(error);
  const rows = (data ?? []) as (CohortMember & { players: { display_name: string } | { display_name: string }[] | null })[];
  return rows.map((r) => ({
    id: r.id,
    cohort_id: r.cohort_id,
    player_id: r.player_id,
    display_name: Array.isArray(r.players) ? r.players[0]?.display_name ?? null : r.players?.display_name ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

/**
 * Return the single active cohort for the player (member and cohort.end_date >= today), or null.
 */
export async function getCurrentCohortForPlayer(
  client: SupabaseClient,
  playerId: string
): Promise<Cohort | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await client
    .from(COHORT_MEMBERS_TABLE)
    .select('cohort_id')
    .eq('player_id', playerId);
  if (error) mapError(error);
  const memberRows = (data ?? []) as { cohort_id: string }[];
  if (memberRows.length === 0) return null;
  const cohortIds = memberRows.map((r) => r.cohort_id);
  const { data: cohorts, error: cohortsError } = await client
    .from(COHORTS_TABLE)
    .select('*')
    .in('id', cohortIds)
    .gte('end_date', today);
  if (cohortsError) mapError(cohortsError);
  const list = (cohorts ?? []) as Cohort[];
  if (list.length === 0) return null;
  list.sort((a, b) => b.end_date.localeCompare(a.end_date));
  return list[0] ?? null;
}

/**
 * Add a player to a cohort. Throws CONFLICT if player is already in another active cohort. Admin only.
 */
export async function addCohortMember(
  client: SupabaseClient,
  cohortId: string,
  playerId: string
): Promise<CohortMember> {
  await requireAdmin(client);
  const current = await getCurrentCohortForPlayer(client, playerId);
  if (current && current.id !== cohortId) {
    throw new DataError(
      'Player is already in another active cohort. At most one cohort per player.',
      'CONFLICT'
    );
  }
  const { data, error } = await client
    .from(COHORT_MEMBERS_TABLE)
    .insert({ cohort_id: cohortId, player_id: playerId })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') {
      throw new DataError('Player is already in this cohort', 'CONFLICT');
    }
    mapError(error);
  }
  return data as CohortMember;
}

/**
 * Remove a player from a cohort. Throws NOT_FOUND if no such membership. Admin only.
 */
export async function removeCohortMember(
  client: SupabaseClient,
  cohortId: string,
  playerId: string
): Promise<void> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(COHORT_MEMBERS_TABLE)
    .delete()
    .eq('cohort_id', cohortId)
    .eq('player_id', playerId)
    .select('id');
  if (error) mapError(error);
  if (!data || data.length === 0) {
    throw new DataError('Cohort member not found', 'NOT_FOUND');
  }
}
