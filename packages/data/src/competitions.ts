/**
 * P7 — Competition data access. Admin-only for mutations; RLS enforces.
 * Per P7_MATCH_RATING_COMPETITION_DOMAIN.md §12.1.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import { getCurrentPlayer } from './players';
import type {
  Competition,
  CreateCompetitionPayload,
  UpdateCompetitionPayload,
} from './types';

const COMPETITIONS_TABLE = 'competitions';
const PGRST_NO_ROWS = 'PGRST116';

export interface ListCompetitionsOptions {
  cohortId?: string;
  limit?: number;
  /** Default 'asc' (soonest first). Use 'desc' for past-first. */
  order?: 'asc' | 'desc';
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
    throw new DataError('Competition not found', 'NOT_FOUND');
  }
  console.error('[@opp/data] Supabase error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

/**
 * List competitions. Options: cohortId, limit, order (scheduled_at). Default order ascending (soonest first).
 * Players can list via RLS where cohort_id in their cohorts or null; admins see all.
 */
export async function listCompetitions(
  client: SupabaseClient,
  options?: ListCompetitionsOptions
): Promise<Competition[]> {
  const ascending = options?.order !== 'desc';
  let query = client
    .from(COMPETITIONS_TABLE)
    .select('id, name, cohort_id, competition_type, scheduled_at, format_legs, format_target, created_at, updated_at')
    .order('scheduled_at', { ascending, nullsFirst: false });
  if (options?.cohortId != null) {
    query = query.eq('cohort_id', options.cohortId);
  }
  if (options?.limit != null && options.limit > 0) {
    query = query.limit(options.limit);
  }
  const { data, error } = await query;
  if (error) mapError(error);
  return (data ?? []) as Competition[];
}

/**
 * Get a single competition by id. Returns null if not found.
 */
export async function getCompetitionById(
  client: SupabaseClient,
  id: string
): Promise<Competition | null> {
  const { data, error } = await client
    .from(COMPETITIONS_TABLE)
    .select('id, name, cohort_id, competition_type, scheduled_at, format_legs, format_target, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) mapError(error);
  return data as Competition | null;
}

/**
 * Create a competition. Admin only (enforce in service or RLS).
 */
export async function createCompetition(
  client: SupabaseClient,
  payload: CreateCompetitionPayload
): Promise<Competition> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(COMPETITIONS_TABLE)
    .insert({
      name: payload.name,
      cohort_id: payload.cohort_id ?? null,
      competition_type: payload.competition_type,
      scheduled_at: payload.scheduled_at ?? null,
      format_legs: payload.format_legs ?? null,
      format_target: payload.format_target ?? null,
    })
    .select()
    .single();
  if (error) mapError(error);
  return data as Competition;
}

/**
 * Update a competition by id (partial). Admin only. Throws NOT_FOUND if no row.
 */
export async function updateCompetition(
  client: SupabaseClient,
  id: string,
  payload: UpdateCompetitionPayload
): Promise<Competition> {
  await requireAdmin(client);
  const updates: Record<string, unknown> = {};
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.cohort_id !== undefined) updates.cohort_id = payload.cohort_id;
  if (payload.competition_type !== undefined) updates.competition_type = payload.competition_type;
  if (payload.scheduled_at !== undefined) updates.scheduled_at = payload.scheduled_at;
  if (payload.format_legs !== undefined) updates.format_legs = payload.format_legs;
  if (payload.format_target !== undefined) updates.format_target = payload.format_target;
  if (Object.keys(updates).length === 0) {
    const existing = await getCompetitionById(client, id);
    if (!existing) throw new DataError('Competition not found', 'NOT_FOUND');
    return existing;
  }
  const { data, error } = await client
    .from(COMPETITIONS_TABLE)
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) mapError(error);
  if (!data) throw new DataError('Competition not found', 'NOT_FOUND');
  return data as Competition;
}

/**
 * Delete a competition by id. Matches referencing this competition have competition_id set to null (FK ON DELETE SET NULL). Admin only. Throws NOT_FOUND if no row.
 */
export async function deleteCompetition(
  client: SupabaseClient,
  id: string
): Promise<void> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(COMPETITIONS_TABLE)
    .delete()
    .eq('id', id)
    .select('id');
  if (error) mapError(error);
  if (!data || data.length === 0) {
    throw new DataError('Competition not found', 'NOT_FOUND');
  }
}
