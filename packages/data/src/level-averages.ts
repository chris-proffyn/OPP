/**
 * Level averages data access. List/read: any authenticated user. Create/update/delete: admin only.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import { getCurrentPlayer } from './players';
import type {
  CreateLevelAveragePayload,
  LevelAverage,
  RoutineType,
  UpdateLevelAveragePayload,
} from './types';

const TABLE = 'level_averages';

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
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: string }).code;
    if (code === PGRST_NO_ROWS) {
      throw new DataError('Level average not found', 'NOT_FOUND');
    }
  }
  console.error('[@opp/data] Supabase error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

function toLevelAverage(row: Record<string, unknown>): LevelAverage {
  return {
    id: row.id as string,
    level_min: Number(row.level_min),
    level_max: Number(row.level_max),
    description: String(row.description),
    three_dart_avg: Number(row.three_dart_avg),
    single_acc_pct: row.single_acc_pct != null ? Number(row.single_acc_pct) : null,
    double_acc_pct: row.double_acc_pct != null ? Number(row.double_acc_pct) : null,
    treble_acc_pct: row.treble_acc_pct != null ? Number(row.treble_acc_pct) : null,
    bull_acc_pct: row.bull_acc_pct != null ? Number(row.bull_acc_pct) : null,
    created_at: String(row.created_at),
  };
}

/**
 * List all level_averages ordered by level_min. Admin only (for admin UI); RLS allows SELECT for authenticated.
 */
export async function listLevelAverages(client: SupabaseClient): Promise<LevelAverage[]> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .order('level_min', { ascending: true });
  if (error) mapError(error);
  return ((data ?? []) as Record<string, unknown>[]).map(toLevelAverage);
}

/**
 * Get level_averages row for a given player level (the band where level_min <= level <= level_max).
 * Callable by any authenticated user (for GE expected-hit calculation). Returns null if no band found.
 */
export async function getLevelAverageForLevel(
  client: SupabaseClient,
  level: number
): Promise<LevelAverage | null> {
  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .lte('level_min', level)
    .gte('level_max', level)
    .limit(1)
    .maybeSingle();
  if (error) mapError(error);
  return data ? toLevelAverage(data as Record<string, unknown>) : null;
}

/**
 * Expected hits for a single-dart routine: darts_allowed * (accuracy_pct / 100).
 * Uses level_averages segment accuracy by routine_type (SS→single, SD→double, ST→treble).
 * Returns null for checkout (C) or if level average or accuracy not found.
 */
export async function getExpectedHitsForSingleDartRoutine(
  client: SupabaseClient,
  playerLevel: number,
  routineType: RoutineType,
  dartsAllowed: number
): Promise<number | null> {
  if (routineType === 'C') return null;
  const row = await getLevelAverageForLevel(client, playerLevel);
  if (!row) return null;
  const accPct =
    routineType === 'SS'
      ? row.single_acc_pct
      : routineType === 'SD'
        ? row.double_acc_pct
        : routineType === 'ST'
          ? row.treble_acc_pct
          : null;
  if (accPct == null) return null;
  const expected = (dartsAllowed * accPct) / 100;
  return Math.round(expected * 100) / 100;
}

/**
 * Get one level average by id. Admin only. Returns null if not found.
 */
export async function getLevelAverageById(
  client: SupabaseClient,
  id: string
): Promise<LevelAverage | null> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) mapError(error);
  return data ? toLevelAverage(data as Record<string, unknown>) : null;
}

/**
 * Create a level average. Admin only.
 */
export async function createLevelAverage(
  client: SupabaseClient,
  payload: CreateLevelAveragePayload
): Promise<LevelAverage> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(TABLE)
    .insert({
      level_min: payload.level_min,
      level_max: payload.level_max,
      description: payload.description,
      three_dart_avg: payload.three_dart_avg,
      single_acc_pct: payload.single_acc_pct ?? null,
      double_acc_pct: payload.double_acc_pct ?? null,
      treble_acc_pct: payload.treble_acc_pct ?? null,
      bull_acc_pct: payload.bull_acc_pct ?? null,
    })
    .select()
    .single();
  if (error) mapError(error);
  return toLevelAverage((data ?? {}) as Record<string, unknown>);
}

/**
 * Update level average by id. Admin only.
 */
export async function updateLevelAverage(
  client: SupabaseClient,
  id: string,
  payload: UpdateLevelAveragePayload
): Promise<LevelAverage> {
  await requireAdmin(client);
  const updates: Record<string, unknown> = {};
  if (payload.level_min !== undefined) updates.level_min = payload.level_min;
  if (payload.level_max !== undefined) updates.level_max = payload.level_max;
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.three_dart_avg !== undefined) updates.three_dart_avg = payload.three_dart_avg;
  if (payload.single_acc_pct !== undefined) updates.single_acc_pct = payload.single_acc_pct;
  if (payload.double_acc_pct !== undefined) updates.double_acc_pct = payload.double_acc_pct;
  if (payload.treble_acc_pct !== undefined) updates.treble_acc_pct = payload.treble_acc_pct;
  if (payload.bull_acc_pct !== undefined) updates.bull_acc_pct = payload.bull_acc_pct;
  if (Object.keys(updates).length === 0) {
    const row = await getLevelAverageById(client, id);
    if (!row) throw new DataError('Level average not found', 'NOT_FOUND');
    return row;
  }
  const { data, error } = await client
    .from(TABLE)
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) mapError(error);
  if (!data) throw new DataError('Level average not found', 'NOT_FOUND');
  return toLevelAverage(data as Record<string, unknown>);
}

/**
 * Delete level average by id. Admin only.
 */
export async function deleteLevelAverage(client: SupabaseClient, id: string): Promise<void> {
  await requireAdmin(client);
  const { data, error } = await client.from(TABLE).delete().eq('id', id).select('id');
  if (error) mapError(error);
  if (!data || data.length === 0) {
    throw new DataError('Level average not found', 'NOT_FOUND');
  }
}
