/**
 * Cohort data access. Admin-only for mutations; RLS enforces.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import { getCurrentPlayer } from './players';
import type {
  Cohort,
  CreateCohortPayload,
  UpdateCohortPayload,
} from './types';

const COHORTS_TABLE = 'cohorts';
const SCHEDULES_TABLE = 'schedules';
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
    throw new DataError('Cohort not found', 'NOT_FOUND');
  }
  console.error('[@opp/data] Supabase error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

function validateDateRange(start_date: string, end_date: string): void {
  const start = new Date(start_date);
  const end = new Date(end_date);
  if (end < start) {
    throw new DataError('end_date must be >= start_date', 'VALIDATION');
  }
}

/**
 * List all cohorts. Admin only.
 */
export async function listCohorts(client: SupabaseClient): Promise<Cohort[]> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(COHORTS_TABLE)
    .select('id, name, level, start_date, end_date, schedule_id, created_at, updated_at')
    .order('created_at', { ascending: false });
  if (error) mapError(error);
  return (data ?? []) as Cohort[];
}

export interface GetCohortByIdResult {
  cohort: Cohort;
  schedule_name: string | null;
  member_count: number;
}

/**
 * Get cohort by id with optional schedule name and member count. Returns null if not found. Admin only.
 */
export async function getCohortById(
  client: SupabaseClient,
  cohortId: string
): Promise<GetCohortByIdResult | null> {
  await requireAdmin(client);
  const { data: cohort, error: cohortError } = await client
    .from(COHORTS_TABLE)
    .select('*')
    .eq('id', cohortId)
    .maybeSingle();
  if (cohortError) mapError(cohortError);
  if (!cohort) return null;

  const [scheduleRes, countRes] = await Promise.all([
    client.from(SCHEDULES_TABLE).select('name').eq('id', (cohort as Cohort).schedule_id).maybeSingle(),
    client.from('cohort_members').select('id', { count: 'exact', head: true }).eq('cohort_id', cohortId),
  ]);
  if (scheduleRes.error) mapError(scheduleRes.error);
  if (countRes.error) mapError(countRes.error);

  return {
    cohort: cohort as Cohort,
    schedule_name: scheduleRes.data ? (scheduleRes.data as { name: string }).name : null,
    member_count: countRes.count ?? 0,
  };
}

/**
 * Create a cohort. Validates end_date >= start_date. Admin only.
 */
export async function createCohort(
  client: SupabaseClient,
  payload: CreateCohortPayload
): Promise<Cohort> {
  await requireAdmin(client);
  validateDateRange(payload.start_date, payload.end_date);
  const { data, error } = await client
    .from(COHORTS_TABLE)
    .insert({
      name: payload.name,
      level: payload.level,
      start_date: payload.start_date,
      end_date: payload.end_date,
      schedule_id: payload.schedule_id,
    })
    .select()
    .single();
  if (error) mapError(error);
  return data as Cohort;
}

/**
 * Update cohort by id. Validates end_date >= start_date if both provided. Throws NOT_FOUND if no row. Admin only.
 */
export async function updateCohort(
  client: SupabaseClient,
  cohortId: string,
  payload: UpdateCohortPayload
): Promise<Cohort> {
  await requireAdmin(client);
  const updates: Record<string, unknown> = {};
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.level !== undefined) updates.level = payload.level;
  if (payload.start_date !== undefined) updates.start_date = payload.start_date;
  if (payload.end_date !== undefined) updates.end_date = payload.end_date;
  if (payload.schedule_id !== undefined) updates.schedule_id = payload.schedule_id;
  const start = updates.start_date as string | undefined;
  const end = updates.end_date as string | undefined;
  if (start !== undefined || end !== undefined) {
    const existing = await client.from(COHORTS_TABLE).select('start_date, end_date').eq('id', cohortId).single();
    if (existing.data) {
      const s = (start ?? (existing.data as { start_date: string }).start_date);
      const e = (end ?? (existing.data as { end_date: string }).end_date);
      validateDateRange(s, e);
    }
  }
  if (Object.keys(updates).length === 0) {
    const row = await getCohortById(client, cohortId);
    if (!row) throw new DataError('Cohort not found', 'NOT_FOUND');
    return row.cohort;
  }
  const { data, error } = await client
    .from(COHORTS_TABLE)
    .update(updates)
    .eq('id', cohortId)
    .select()
    .single();
  if (error) mapError(error);
  if (!data) throw new DataError('Cohort not found', 'NOT_FOUND');
  return data as Cohort;
}

/**
 * Delete cohort by id. CASCADE removes cohort_members, calendar, player_calendar. Throws NOT_FOUND if no row. Admin only.
 */
export async function deleteCohort(
  client: SupabaseClient,
  cohortId: string
): Promise<void> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(COHORTS_TABLE)
    .delete()
    .eq('id', cohortId)
    .select('id');
  if (error) mapError(error);
  if (!data || data.length === 0) {
    throw new DataError('Cohort not found', 'NOT_FOUND');
  }
}
