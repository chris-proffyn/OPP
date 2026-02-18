/**
 * Routine and routine_steps data access. Admin-only; RLS enforces.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import { getCurrentPlayer } from './players';
import type {
  CreateRoutinePayload,
  Routine,
  RoutineStep,
  RoutineStepInput,
  RoutineType,
  UpdateRoutinePayload,
} from './types';
import { isRoutineType } from './types';

const ROUTINES_TABLE = 'routines';
const ROUTINE_STEPS_TABLE = 'routine_steps';

const PGRST_NO_ROWS = 'PGRST116';
const PG_FK_VIOLATION = '23503';

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

function mapError(err: unknown, context: 'routine' | 'generic' = 'generic'): never {
  if (err instanceof DataError) throw err;
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: string }).code;
    if (code === PGRST_NO_ROWS) {
      throw new DataError('Routine not found', 'NOT_FOUND');
    }
    if (context === 'routine' && code === PG_FK_VIOLATION) {
      throw new DataError('Cannot delete: routine is used in a session', 'VALIDATION');
    }
  }
  console.error('[@opp/data] Supabase error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

/**
 * List all routines (id, name, description, created_at, updated_at). Admin only.
 */
export async function listRoutines(client: SupabaseClient): Promise<Routine[]> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(ROUTINES_TABLE)
    .select('id, name, description, created_at, updated_at');
  if (error) mapError(error);
  return (data ?? []) as Routine[];
}

/**
 * Get routine by id with steps ordered by step_no. Returns null if not found. Admin only.
 */
export async function getRoutineById(
  client: SupabaseClient,
  routineId: string
): Promise<{ routine: Routine; steps: RoutineStep[] } | null> {
  await requireAdmin(client);
  const { data: routineRow, error: routineError } = await client
    .from(ROUTINES_TABLE)
    .select('*')
    .eq('id', routineId)
    .maybeSingle();
  if (routineError) mapError(routineError);
  if (!routineRow) return null;

  const { data: steps, error: stepsError } = await client
    .from(ROUTINE_STEPS_TABLE)
    .select('*')
    .eq('routine_id', routineId)
    .order('step_no', { ascending: true });
  if (stepsError) mapError(stepsError);

  return {
    routine: routineRow as Routine,
    steps: (steps ?? []) as RoutineStep[],
  };
}

/**
 * Get routine by id with steps ordered by step_no. Returns null if not found.
 * For GE: no admin required; RLS allows authenticated SELECT.
 */
export async function getRoutineWithSteps(
  client: SupabaseClient,
  routineId: string
): Promise<{ routine: Routine; steps: RoutineStep[] } | null> {
  const { data: routineRow, error: routineError } = await client
    .from(ROUTINES_TABLE)
    .select('*')
    .eq('id', routineId)
    .maybeSingle();
  if (routineError) mapError(routineError);
  if (!routineRow) return null;

  const { data: steps, error: stepsError } = await client
    .from(ROUTINE_STEPS_TABLE)
    .select('*')
    .eq('routine_id', routineId)
    .order('step_no', { ascending: true });
  if (stepsError) mapError(stepsError);

  return {
    routine: routineRow as Routine,
    steps: (steps ?? []) as RoutineStep[],
  };
}

/**
 * Create a routine. Admin only.
 */
export async function createRoutine(
  client: SupabaseClient,
  payload: CreateRoutinePayload
): Promise<Routine> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(ROUTINES_TABLE)
    .insert({
      name: payload.name,
      description: payload.description ?? null,
    })
    .select()
    .single();
  if (error) mapError(error);
  return data as Routine;
}

/**
 * Update routine by id. Throws NOT_FOUND if no row. Admin only.
 */
export async function updateRoutine(
  client: SupabaseClient,
  routineId: string,
  payload: UpdateRoutinePayload
): Promise<Routine> {
  await requireAdmin(client);
  const updates: Record<string, unknown> = {};
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.description !== undefined) updates.description = payload.description;
  if (Object.keys(updates).length === 0) {
    const existing = await getRoutineById(client, routineId);
    if (!existing) throw new DataError('Routine not found', 'NOT_FOUND');
    return existing.routine;
  }
  const { data, error } = await client
    .from(ROUTINES_TABLE)
    .update(updates)
    .eq('id', routineId)
    .select()
    .single();
  if (error) mapError(error);
  if (!data) throw new DataError('Routine not found', 'NOT_FOUND');
  return data as Routine;
}

/**
 * Delete routine by id. If referenced by session_routines, throws clear VALIDATION error. Admin only.
 */
export async function deleteRoutine(
  client: SupabaseClient,
  routineId: string
): Promise<void> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(ROUTINES_TABLE)
    .delete()
    .eq('id', routineId)
    .select('id');
  if (error) mapError(error, 'routine');
  if (!data || data.length === 0) {
    throw new DataError('Routine not found', 'NOT_FOUND');
  }
}

/**
 * List routine_steps for a routine, ordered by step_no. Admin only.
 */
export async function listRoutineSteps(
  client: SupabaseClient,
  routineId: string
): Promise<RoutineStep[]> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(ROUTINE_STEPS_TABLE)
    .select('*')
    .eq('routine_id', routineId)
    .order('step_no', { ascending: true });
  if (error) mapError(error);
  return (data ?? []) as RoutineStep[];
}

/**
 * Replace all routine_steps for a routine. Idempotent for same input. Admin only.
 */
export async function setRoutineSteps(
  client: SupabaseClient,
  routineId: string,
  steps: RoutineStepInput[]
): Promise<RoutineStep[]> {
  await requireAdmin(client);

  const { error: delError } = await client
    .from(ROUTINE_STEPS_TABLE)
    .delete()
    .eq('routine_id', routineId);
  if (delError) mapError(delError);

  if (steps.length === 0) return [];

  const routineType = (s: RoutineStepInput): RoutineType => {
    const t = s.routine_type ?? 'SS';
    if (!isRoutineType(t)) return 'SS';
    return t;
  };

  const rows = steps.map((s) => ({
    routine_id: routineId,
    step_no: s.step_no,
    target: s.target,
    routine_type: routineType(s),
  }));
  const { data: inserted, error: insError } = await client
    .from(ROUTINE_STEPS_TABLE)
    .insert(rows)
    .select();
  if (insError) mapError(insError);
  return (inserted ?? []) as RoutineStep[];
}
