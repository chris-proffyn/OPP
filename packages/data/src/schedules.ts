/**
 * Schedule and schedule_entries data access. Admin-only; RLS enforces.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import { getCurrentPlayer } from './players';
import type {
  CreateSchedulePayload,
  Schedule,
  ScheduleEntry,
  ScheduleEntryInput,
  UpdateSchedulePayload,
} from './types';

const SCHEDULES_TABLE = 'schedules';
const SCHEDULE_ENTRIES_TABLE = 'schedule_entries';
const SESSIONS_TABLE = 'sessions';

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
    throw new DataError('Schedule not found', 'NOT_FOUND');
  }
  console.error('[@opp/data] Supabase error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

/**
 * List all schedules (id, name, created_at). Admin only.
 */
export async function listSchedules(client: SupabaseClient): Promise<Schedule[]> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(SCHEDULES_TABLE)
    .select('id, name, created_at, updated_at');
  if (error) mapError(error);
  return (data ?? []) as Schedule[];
}

/**
 * Get schedule by id with entries ordered by day_no, session_no. Returns null if not found. Admin only.
 */
export async function getScheduleById(
  client: SupabaseClient,
  scheduleId: string
): Promise<{ schedule: Schedule; entries: ScheduleEntry[] } | null> {
  await requireAdmin(client);
  const { data: scheduleRow, error: scheduleError } = await client
    .from(SCHEDULES_TABLE)
    .select('*')
    .eq('id', scheduleId)
    .maybeSingle();
  if (scheduleError) mapError(scheduleError);
  if (!scheduleRow) return null;

  const { data: entries, error: entriesError } = await client
    .from(SCHEDULE_ENTRIES_TABLE)
    .select('*')
    .eq('schedule_id', scheduleId)
    .order('day_no', { ascending: true })
    .order('session_no', { ascending: true });
  if (entriesError) mapError(entriesError);

  return {
    schedule: scheduleRow as Schedule,
    entries: (entries ?? []) as ScheduleEntry[],
  };
}

/**
 * Create a schedule. Admin only.
 */
export async function createSchedule(
  client: SupabaseClient,
  payload: CreateSchedulePayload
): Promise<Schedule> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(SCHEDULES_TABLE)
    .insert({ name: payload.name })
    .select()
    .single();
  if (error) mapError(error);
  return data as Schedule;
}

/**
 * Update schedule by id. Throws NOT_FOUND if no row. Admin only.
 */
export async function updateSchedule(
  client: SupabaseClient,
  scheduleId: string,
  payload: UpdateSchedulePayload
): Promise<Schedule> {
  await requireAdmin(client);
  const updates: Record<string, unknown> = {};
  if (payload.name !== undefined) updates.name = payload.name;
  if (Object.keys(updates).length === 0) {
    const existing = await getScheduleById(client, scheduleId);
    if (!existing) throw new DataError('Schedule not found', 'NOT_FOUND');
    return existing.schedule;
  }
  const { data, error } = await client
    .from(SCHEDULES_TABLE)
    .update(updates)
    .eq('id', scheduleId)
    .select()
    .single();
  if (error) mapError(error);
  if (!data) throw new DataError('Schedule not found', 'NOT_FOUND');
  return data as Schedule;
}

/**
 * Delete schedule by id. CASCADE removes entries. Throws NOT_FOUND if no row. Admin only.
 */
export async function deleteSchedule(
  client: SupabaseClient,
  scheduleId: string
): Promise<void> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(SCHEDULES_TABLE)
    .delete()
    .eq('id', scheduleId)
    .select('id');
  if (error) mapError(error);
  if (!data || data.length === 0) {
    throw new DataError('Schedule not found', 'NOT_FOUND');
  }
}

/**
 * List schedule_entries for a schedule, ordered by day_no, session_no. Admin only.
 */
export async function listScheduleEntries(
  client: SupabaseClient,
  scheduleId: string
): Promise<ScheduleEntry[]> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(SCHEDULE_ENTRIES_TABLE)
    .select('*')
    .eq('schedule_id', scheduleId)
    .order('day_no', { ascending: true })
    .order('session_no', { ascending: true });
  if (error) mapError(error);
  return (data ?? []) as ScheduleEntry[];
}

/**
 * Replace all schedule_entries for a schedule. Validates session_id exists. Idempotent for same input. Admin only.
 */
export async function setScheduleEntries(
  client: SupabaseClient,
  scheduleId: string,
  entries: ScheduleEntryInput[]
): Promise<ScheduleEntry[]> {
  await requireAdmin(client);

  const sessionIds = [...new Set(entries.map((e) => e.session_id))];
  if (sessionIds.length > 0) {
    const { data: sessions, error: sessError } = await client
      .from(SESSIONS_TABLE)
      .select('id')
      .in('id', sessionIds);
    if (sessError) mapError(sessError);
    const found = new Set((sessions ?? []).map((r: { id: string }) => r.id));
    const missing = sessionIds.filter((id) => !found.has(id));
    if (missing.length > 0) {
      throw new DataError(
        `Session(s) not found: ${missing.join(', ')}`,
        'VALIDATION'
      );
    }
  }

  const { error: delError } = await client
    .from(SCHEDULE_ENTRIES_TABLE)
    .delete()
    .eq('schedule_id', scheduleId);
  if (delError) mapError(delError);

  if (entries.length === 0) return [];

  const rows = entries.map((e) => ({
    schedule_id: scheduleId,
    day_no: e.day_no,
    session_no: e.session_no,
    session_id: e.session_id,
  }));
  const { data: inserted, error: insError } = await client
    .from(SCHEDULE_ENTRIES_TABLE)
    .insert(rows)
    .select();
  if (insError) mapError(insError);
  return (inserted ?? []) as ScheduleEntry[];
}
