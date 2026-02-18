/**
 * Level requirements data access. Admin-only; RLS enforces.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import { getCurrentPlayer } from './players';
import type {
  CreateLevelRequirementPayload,
  LevelRequirement,
  RoutineType,
  UpdateLevelRequirementPayload,
} from './types';

const LEVEL_REQUIREMENTS_TABLE = 'level_requirements';

const PGRST_NO_ROWS = 'PGRST116';
const PG_UNIQUE_VIOLATION = '23505';

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
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: string }).code;
    if (code === PGRST_NO_ROWS) {
      throw new DataError('Level requirement not found', 'NOT_FOUND');
    }
    if (code === PG_UNIQUE_VIOLATION) {
      throw new DataError('A level requirement for this min_level and routine_type already exists', 'CONFLICT');
    }
  }
  console.error('[@opp/data] Supabase error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

/**
 * List all level_requirements ordered by min_level. Admin only.
 */
export async function listLevelRequirements(
  client: SupabaseClient
): Promise<LevelRequirement[]> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(LEVEL_REQUIREMENTS_TABLE)
    .select('*')
    .order('min_level', { ascending: true });
  if (error) mapError(error);
  return (data ?? []) as LevelRequirement[];
}

/**
 * Get one level requirement by min_level and routine_type. Returns null if not found.
 * Callable by any authenticated user (for GE level-check display). RLS allows SELECT for auth.uid() IS NOT NULL.
 */
export async function getLevelRequirementByMinLevelAndRoutineType(
  client: SupabaseClient,
  minLevel: number,
  routineType: RoutineType
): Promise<LevelRequirement | null> {
  const { data, error } = await client
    .from(LEVEL_REQUIREMENTS_TABLE)
    .select('*')
    .eq('min_level', minLevel)
    .eq('routine_type', routineType)
    .maybeSingle();
  if (error) mapError(error);
  return data as LevelRequirement | null;
}

/**
 * Get one level requirement by min_level (decade start: 0, 10, 20, …, 90). Returns the SS row if present, else null.
 * For backward compatibility; prefer getLevelRequirementByMinLevelAndRoutineType when routine_type is known.
 */
export async function getLevelRequirementByMinLevel(
  client: SupabaseClient,
  minLevel: number
): Promise<LevelRequirement | null> {
  return getLevelRequirementByMinLevelAndRoutineType(client, minLevel, 'SS');
}

/**
 * Create a level requirement. Throws CONFLICT if min_level already exists. Admin only.
 */
export async function createLevelRequirement(
  client: SupabaseClient,
  payload: CreateLevelRequirementPayload
): Promise<LevelRequirement> {
  await requireAdmin(client);
  const row: Record<string, unknown> = {
    min_level: payload.min_level,
    tgt_hits: payload.tgt_hits,
    darts_allowed: payload.darts_allowed,
    routine_type: payload.routine_type,
  };
  if (payload.attempt_count !== undefined) row.attempt_count = payload.attempt_count;
  if (payload.allowed_throws_per_attempt !== undefined) row.allowed_throws_per_attempt = payload.allowed_throws_per_attempt;
  const { data, error } = await client
    .from(LEVEL_REQUIREMENTS_TABLE)
    .insert(row)
    .select()
    .single();
  if (error) mapError(error);
  return data as LevelRequirement;
}

/**
 * Update level requirement by id. Throws CONFLICT if min_level changed and already exists; NOT_FOUND if no row. Admin only.
 */
export async function updateLevelRequirement(
  client: SupabaseClient,
  id: string,
  payload: UpdateLevelRequirementPayload
): Promise<LevelRequirement> {
  await requireAdmin(client);
  const updates: Record<string, unknown> = {};
  if (payload.min_level !== undefined) updates.min_level = payload.min_level;
  if (payload.tgt_hits !== undefined) updates.tgt_hits = payload.tgt_hits;
  if (payload.darts_allowed !== undefined) updates.darts_allowed = payload.darts_allowed;
  if (payload.routine_type !== undefined) updates.routine_type = payload.routine_type;
  if (payload.attempt_count !== undefined) updates.attempt_count = payload.attempt_count;
  if (payload.allowed_throws_per_attempt !== undefined) updates.allowed_throws_per_attempt = payload.allowed_throws_per_attempt;
  if (Object.keys(updates).length === 0) {
    const { data: row, error: fetchError } = await client
      .from(LEVEL_REQUIREMENTS_TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchError) mapError(fetchError);
    if (!row) throw new DataError('Level requirement not found', 'NOT_FOUND');
    return row as LevelRequirement;
  }
  const { data, error } = await client
    .from(LEVEL_REQUIREMENTS_TABLE)
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) mapError(error);
  if (!data) throw new DataError('Level requirement not found', 'NOT_FOUND');
  return data as LevelRequirement;
}

/**
 * Delete level requirement by id. Throws NOT_FOUND if no row. Admin only.
 */
export async function deleteLevelRequirement(
  client: SupabaseClient,
  id: string
): Promise<void> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(LEVEL_REQUIREMENTS_TABLE)
    .delete()
    .eq('id', id)
    .select('id');
  if (error) mapError(error);
  if (!data || data.length === 0) {
    throw new DataError('Level requirement not found', 'NOT_FOUND');
  }
}
