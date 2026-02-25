/**
 * Cohort members data access. Admin-only for add/remove; getCurrentCohortForPlayer used by app/UI.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import { getCurrentPlayer, listPlayers } from './players';
import type { Cohort, CohortMember, CohortStatus, Player } from './types';

const COHORT_MEMBERS_TABLE = 'cohort_members';
const COHORTS_TABLE = 'cohorts';
const PGRST_NO_ROWS = 'PGRST116';

const EDITABLE_COHORT_STATUSES: CohortStatus[] = ['draft', 'proposed'];

async function requireCohortEditable(client: SupabaseClient, cohortId: string): Promise<void> {
  const { data, error } = await client
    .from(COHORTS_TABLE)
    .select('cohort_status')
    .eq('id', cohortId)
    .maybeSingle();
  if (error) mapError(error);
  if (!data) throw new DataError('Cohort not found', 'NOT_FOUND');
  const status = (data as { cohort_status: CohortStatus }).cohort_status;
  if (!EDITABLE_COHORT_STATUSES.includes(status)) {
    throw new DataError(`Cohort is ${status}; member list cannot be changed. Only draft or proposed cohorts can be edited.`, 'VALIDATION');
  }
}

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
 * List cohort members for a cohort, with display_name from players.nickname. Admin only.
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
      players(nickname)
    `)
    .eq('cohort_id', cohortId);
  if (error) mapError(error);
  const rows = (data ?? []) as (CohortMember & { players: { nickname: string } | { nickname: string }[] | null })[];
  return rows.map((r) => ({
    id: r.id,
    cohort_id: r.cohort_id,
    player_id: r.player_id,
    display_name: Array.isArray(r.players) ? r.players[0]?.nickname ?? null : r.players?.nickname ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

/** Opponent option for Record match: player_id and display_name (same cohort only). */
export interface OpponentOption {
  player_id: string;
  display_name: string | null;
}

/**
 * List other players in the current player's cohort (for opponent dropdown in Record match). Does not require admin; RLS allows SELECT on cohort_members for same cohort.
 */
export async function getOpponentsInCurrentCohort(
  client: SupabaseClient,
  playerId: string
): Promise<OpponentOption[]> {
  const cohort = await getCurrentCohortForPlayer(client, playerId);
  if (!cohort) return [];
  const { data, error } = await client
    .from(COHORT_MEMBERS_TABLE)
    .select('player_id, players(nickname)')
    .eq('cohort_id', cohort.id);
  if (error) mapError(error);
  const rows = (data ?? []) as { player_id: string; players: { nickname: string } | { nickname: string }[] | null }[];
  return rows
    .filter((r) => r.player_id !== playerId)
    .map((r) => ({
      player_id: r.player_id,
      display_name: Array.isArray(r.players) ? r.players[0]?.nickname ?? null : r.players?.nickname ?? null,
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
 * List players who have no row in cohort_members (awaiting cohort assignment). Admin only.
 * Includes player_rating and training_rating for display. Ordered by training_rating (desc, nulls last) then nickname.
 */
export async function listPlayersWithoutCohort(client: SupabaseClient): Promise<Player[]> {
  await requireAdmin(client);
  const [allPlayers, { data: memberRows }] = await Promise.all([
    listPlayers(client),
    client.from(COHORT_MEMBERS_TABLE).select('player_id'),
  ]);
  const memberIds = new Set(((memberRows ?? []) as { player_id: string }[]).map((r) => r.player_id));
  const without = allPlayers.filter((p) => !memberIds.has(p.id));
  without.sort((a, b) => {
    const ar = a.training_rating ?? -1;
    const br = b.training_rating ?? -1;
    if (br !== ar) return br - ar;
    return (a.nickname ?? '').localeCompare(b.nickname ?? '');
  });
  return without;
}

/**
 * Add a player to a cohort. Throws CONFLICT if player is already in another active cohort. Admin only.
 * Only allowed when cohort is draft or proposed.
 */
export async function addCohortMember(
  client: SupabaseClient,
  cohortId: string,
  playerId: string
): Promise<CohortMember> {
  await requireAdmin(client);
  await requireCohortEditable(client, cohortId);
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
 * Only allowed when cohort is draft or proposed. If cohort has no members left, status is set back to draft.
 */
export async function removeCohortMember(
  client: SupabaseClient,
  cohortId: string,
  playerId: string
): Promise<void> {
  await requireAdmin(client);
  await requireCohortEditable(client, cohortId);
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
  const { count } = await client
    .from(COHORT_MEMBERS_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('cohort_id', cohortId);
  if ((count ?? 0) === 0) {
    await client.from(COHORTS_TABLE).update({ cohort_status: 'draft' }).eq('id', cohortId);
  }
}

/**
 * Move a player from one cohort to another. Both cohorts must be draft or proposed. Admin only.
 */
export async function movePlayerToCohort(
  client: SupabaseClient,
  playerId: string,
  fromCohortId: string,
  toCohortId: string
): Promise<void> {
  await requireAdmin(client);
  if (fromCohortId === toCohortId) {
    throw new DataError('Source and target cohort must be different', 'VALIDATION');
  }
  await requireCohortEditable(client, fromCohortId);
  await requireCohortEditable(client, toCohortId);
  const toMembers = await listCohortMembers(client, toCohortId);
  if (toMembers.some((m) => m.player_id === playerId)) {
    throw new DataError('Player is already in the target cohort', 'CONFLICT');
  }
  await removeCohortMember(client, fromCohortId, playerId);
  await addCohortMember(client, toCohortId, playerId);
}
