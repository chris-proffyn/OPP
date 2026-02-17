/**
 * Calendar and calendar generation. Admin-only for list/generate; RLS allows cohort members to read.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import { getCurrentPlayer } from './players';
import { getScheduleById } from './schedules';
import type { Calendar, GenerateCalendarOptions, UpdateCalendarEntryPayload } from './types';
import type { ScheduleEntry } from './types';

const CALENDAR_TABLE = 'calendar';
const COHORT_MEMBERS_TABLE = 'cohort_members';
const PLAYER_CALENDAR_TABLE = 'player_calendar';
const COHORTS_TABLE = 'cohorts';
const PGRST_NO_ROWS = 'PGRST116';

const DEFAULT_SESSION_TIME = '19:00';

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
    throw new DataError('Calendar entry not found', 'NOT_FOUND');
  }
  console.error('[@opp/data] Supabase error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

function parseTimeOfDay(timeStr: string): { hours: number; minutes: number } {
  const parts = timeStr.trim().split(':');
  const hours = Math.min(23, Math.max(0, parseInt(parts[0] ?? '0', 10) || 0));
  const minutes = Math.min(59, Math.max(0, parseInt(parts[1] ?? '0', 10) || 0));
  return { hours, minutes };
}

function toScheduledAt(dateStr: string, dayOffset: number, timeOfDay: string): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  const { hours, minutes } = parseTimeOfDay(timeOfDay);
  d.setUTCHours(hours, minutes, 0, 0);
  return d.toISOString();
}

export interface CalendarWithSessionName extends Calendar {
  session_name: string | null;
}

/**
 * List calendar entries for a cohort, ordered by scheduled_at. Optionally include session name. Admin or cohort member (RLS).
 */
export async function listCalendarByCohort(
  client: SupabaseClient,
  cohortId: string
): Promise<CalendarWithSessionName[]> {
  const { data: rows, error } = await client
    .from(CALENDAR_TABLE)
    .select(`
      id,
      scheduled_at,
      cohort_id,
      schedule_id,
      day_no,
      session_no,
      session_id,
      created_at,
      updated_at,
      sessions(name)
    `)
    .eq('cohort_id', cohortId)
    .order('scheduled_at', { ascending: true });
  if (error) mapError(error);
  const list = (rows ?? []) as (Calendar & { sessions: { name: string } | { name: string }[] | null })[];
  return list.map((r) => ({
    ...r,
    session_name: Array.isArray(r.sessions) ? r.sessions[0]?.name ?? null : r.sessions?.name ?? null,
  }));
}

/**
 * Generate calendar for a cohort: create calendar rows from schedule + start_date, then player_calendar for each member. Replaces existing. Admin only.
 */
export async function generateCalendarForCohort(
  client: SupabaseClient,
  cohortId: string,
  options?: GenerateCalendarOptions
): Promise<Calendar[]> {
  await requireAdmin(client);
  const timeOfDay = options?.defaultTimeOfDay ?? DEFAULT_SESSION_TIME;

  const { data: cohortRow, error: cohortError } = await client
    .from(COHORTS_TABLE)
    .select('id, start_date, schedule_id')
    .eq('id', cohortId)
    .maybeSingle();
  if (cohortError) mapError(cohortError);
  if (!cohortRow) throw new DataError('Cohort not found', 'NOT_FOUND');

  const schedule = await getScheduleById(client, (cohortRow as { schedule_id: string }).schedule_id);
  if (!schedule || schedule.entries.length === 0) {
    throw new DataError('Schedule has no entries', 'VALIDATION');
  }

  const startDate = (cohortRow as { start_date: string }).start_date;
  const scheduleId = (cohortRow as { schedule_id: string }).schedule_id;

  const { error: delError } = await client
    .from(CALENDAR_TABLE)
    .delete()
    .eq('cohort_id', cohortId);
  if (delError) mapError(delError);

  const calendarRows: {
    scheduled_at: string;
    cohort_id: string;
    schedule_id: string;
    day_no: number;
    session_no: number;
    session_id: string;
  }[] = schedule.entries.map((e: ScheduleEntry) => ({
    scheduled_at: toScheduledAt(startDate, e.day_no - 1, timeOfDay),
    cohort_id: cohortId,
    schedule_id: scheduleId,
    day_no: e.day_no,
    session_no: e.session_no,
    session_id: e.session_id,
  }));

  const { data: inserted, error: insError } = await client
    .from(CALENDAR_TABLE)
    .insert(calendarRows)
    .select();
  if (insError) mapError(insError);
  const calendars = (inserted ?? []) as Calendar[];

  const { data: members, error: membersError } = await client
    .from(COHORT_MEMBERS_TABLE)
    .select('player_id')
    .eq('cohort_id', cohortId);
  if (membersError) mapError(membersError);
  const playerIds = ((members ?? []) as { player_id: string }[]).map((m) => m.player_id);

  if (playerIds.length > 0 && calendars.length > 0) {
    const playerCalendarRows: { player_id: string; calendar_id: string; status: string }[] = [];
    for (const p of playerIds) {
      for (const c of calendars) {
        playerCalendarRows.push({ player_id: p, calendar_id: c.id, status: 'planned' });
      }
    }
    const { error: pcError } = await client.from(PLAYER_CALENDAR_TABLE).insert(playerCalendarRows);
    if (pcError) mapError(pcError);
  }

  return calendars;
}

export interface CalendarEntryWithDetails extends Calendar {
  session_name: string | null;
  cohort_name?: string | null;
  schedule_name?: string | null;
}

/**
 * Update a calendar entry. Admin only. Only provided fields are updated.
 * RLS: calendar_update_admin.
 */
export async function updateCalendarEntry(
  client: SupabaseClient,
  calendarId: string,
  payload: UpdateCalendarEntryPayload
): Promise<Calendar> {
  await requireAdmin(client);
  const updates: Record<string, unknown> = {};
  if (payload.scheduled_at !== undefined) updates.scheduled_at = payload.scheduled_at;
  if (payload.session_id !== undefined) updates.session_id = payload.session_id;
  if (Object.keys(updates).length === 0) {
    const { data: row, error: fetchError } = await client
      .from(CALENDAR_TABLE)
      .select('*')
      .eq('id', calendarId)
      .maybeSingle();
    if (fetchError) mapError(fetchError);
    if (!row) throw new DataError('Calendar entry not found', 'NOT_FOUND');
    return row as Calendar;
  }
  const { data, error } = await client
    .from(CALENDAR_TABLE)
    .update(updates)
    .eq('id', calendarId)
    .select()
    .single();
  if (error) mapError(error);
  if (!data) throw new DataError('Calendar entry not found', 'NOT_FOUND');
  return data as Calendar;
}

/**
 * Get a single calendar entry by id, with session name, cohort name, and schedule name. Returns null if not found.
 * RLS: player can read if in cohort (calendar_select_member).
 */
export async function getCalendarEntryById(
  client: SupabaseClient,
  calendarId: string
): Promise<CalendarEntryWithDetails | null> {
  const { data: row, error } = await client
    .from(CALENDAR_TABLE)
    .select(`
      *,
      sessions(name),
      cohorts(name),
      schedules(name)
    `)
    .eq('id', calendarId)
    .maybeSingle();
  if (error) mapError(error);
  if (!row) return null;
  const r = row as Calendar & {
    sessions: { name: string } | null;
    cohorts: { name: string } | null;
    schedules: { name: string } | null;
  };
  return {
    ...r,
    session_name: r.sessions?.name ?? null,
    cohort_name: r.cohorts?.name ?? null,
    schedule_name: r.schedules?.name ?? null,
  };
}
