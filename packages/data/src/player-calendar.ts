/**
 * Player calendar and next/available sessions. RLS allows players to read/update own rows.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import type {
  NextOrAvailableSession,
  PlayerCalendar,
  PlayerCalendarFilters,
  PlayerCalendarStatus,
  SessionWithStatus,
} from './types';

const PLAYER_CALENDAR_TABLE = 'player_calendar';
const CALENDAR_TABLE = 'calendar';
const SESSION_RUNS_TABLE = 'session_runs';

/** Missed sessions within this many hours are still "available" */
const MISSED_SESSION_HOURS = 48;

const PGRST_NO_ROWS = 'PGRST116';

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
    throw new DataError('Player calendar entry not found', 'NOT_FOUND');
  }
  console.error('[@opp/data] Supabase error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

const VALID_STATUSES: PlayerCalendarStatus[] = ['planned', 'completed'];

function assertValidStatus(status: string): asserts status is PlayerCalendarStatus {
  if (!VALID_STATUSES.includes(status as PlayerCalendarStatus)) {
    throw new DataError(`status must be one of: ${VALID_STATUSES.join(', ')}`, 'VALIDATION');
  }
}

export interface PlayerCalendarWithDetails extends PlayerCalendar {
  scheduled_at?: string;
  session_name?: string | null;
}

/**
 * List player_calendar rows for a player with optional filters (status, fromDate, toDate on calendar.scheduled_at).
 */
export async function listPlayerCalendar(
  client: SupabaseClient,
  playerId: string,
  filters?: PlayerCalendarFilters
): Promise<PlayerCalendarWithDetails[]> {
  let query = client
    .from(PLAYER_CALENDAR_TABLE)
    .select(`
      id,
      player_id,
      calendar_id,
      status,
      created_at,
      updated_at,
      calendar(scheduled_at, session_id, sessions(name))
    `)
    .eq('player_id', playerId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) mapError(error);
  type Row = PlayerCalendar & {
    calendar: { scheduled_at: string; session_id: string; sessions: { name: string } | { name: string }[] | null } | { scheduled_at: string; session_id: string; sessions: { name: string } | { name: string }[] | null }[] | null;
  };
  const rows = (data ?? []) as Row[];
  const norm = (c: Row['calendar']) => {
    if (!c) return { scheduled_at: undefined, session_name: null };
    const cal = Array.isArray(c) ? c[0] : c;
    const sess = cal?.sessions;
    const session_name = Array.isArray(sess) ? sess[0]?.name ?? null : sess?.name ?? null;
    return { scheduled_at: cal?.scheduled_at, session_name };
  };
  let result = rows
    .map((r) => ({
    ...r,
    scheduled_at: norm(r.calendar).scheduled_at,
    session_name: norm(r.calendar).session_name,
  }))
    .sort((a, b) => {
      const at = a.scheduled_at ?? '';
      const bt = b.scheduled_at ?? '';
      return at.localeCompare(bt);
    });

  if (filters?.fromDate || filters?.toDate) {
    result = result.filter((r) => {
      const at = r.scheduled_at;
      if (!at) return false;
      if (filters.fromDate && at < filters.fromDate) return false;
      if (filters.toDate && at > filters.toDate) return false;
      return true;
    });
  }
  return result;
}

/**
 * Next upcoming planned session for the player (scheduled_at >= now). Returns null if none.
 */
export async function getNextSessionForPlayer(
  client: SupabaseClient,
  playerId: string
): Promise<NextOrAvailableSession | null> {
  const now = new Date().toISOString();
  const { data: pcRows, error: pcError } = await client
    .from(PLAYER_CALENDAR_TABLE)
    .select('calendar_id')
    .eq('player_id', playerId)
    .eq('status', 'planned');
  if (pcError) mapError(pcError);
  const calendarIds = ((pcRows ?? []) as { calendar_id: string }[]).map((r) => r.calendar_id);
  if (calendarIds.length === 0) return null;

  const { data: calRows, error: calError } = await client
    .from(CALENDAR_TABLE)
    .select(`
      id,
      scheduled_at,
      day_no,
      session_no,
      session_id,
      cohort_id,
      schedule_id,
      sessions(name)
    `)
    .in('id', calendarIds)
    .gte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(1);
  if (calError) mapError(calError);
  type CalRow = { id: string; scheduled_at: string; day_no: number; session_no: number; session_id: string; cohort_id: string; schedule_id: string; sessions: { name: string } | { name: string }[] | null };
  const list = (calRows ?? []) as CalRow[];
  const c = list[0];
  if (!c) return null;
  const session_name = Array.isArray(c.sessions) ? c.sessions[0]?.name ?? '' : c.sessions?.name ?? '';
  return {
    calendar_id: c.id,
    session_id: c.session_id,
    session_name,
    scheduled_at: c.scheduled_at,
    day_no: c.day_no,
    session_no: c.session_no,
    cohort_id: c.cohort_id,
    schedule_id: c.schedule_id,
  };
}

/**
 * Available sessions = next scheduled + missed (planned, scheduled in last MISSED_SESSION_HOURS). Ordered by scheduled_at ASC.
 */
export async function getAvailableSessionsForPlayer(
  client: SupabaseClient,
  playerId: string
): Promise<NextOrAvailableSession[]> {
  const now = new Date();
  const fromDate = new Date(now.getTime() - MISSED_SESSION_HOURS * 60 * 60 * 1000).toISOString();
  const { data: pcRows, error: pcError } = await client
    .from(PLAYER_CALENDAR_TABLE)
    .select('calendar_id')
    .eq('player_id', playerId)
    .eq('status', 'planned');
  if (pcError) mapError(pcError);
  const calendarIds = ((pcRows ?? []) as { calendar_id: string }[]).map((r) => r.calendar_id);
  if (calendarIds.length === 0) return [];

  const { data: calRows, error: calError } = await client
    .from(CALENDAR_TABLE)
    .select(`
      id,
      scheduled_at,
      day_no,
      session_no,
      session_id,
      cohort_id,
      schedule_id,
      sessions(name)
    `)
    .in('id', calendarIds)
    .gte('scheduled_at', fromDate)
    .order('scheduled_at', { ascending: true });
  if (calError) mapError(calError);
  type CalRow = { id: string; scheduled_at: string; day_no: number; session_no: number; session_id: string; cohort_id: string; schedule_id: string; sessions: { name: string } | { name: string }[] | null };
  const list = (calRows ?? []) as CalRow[];
  return list.map((c) => {
    const session_name = Array.isArray(c.sessions) ? c.sessions[0]?.name ?? '' : c.sessions?.name ?? '';
    return {
      calendar_id: c.id,
      session_id: c.session_id,
      session_name,
      scheduled_at: c.scheduled_at,
      day_no: c.day_no,
      session_no: c.session_no,
      cohort_id: c.cohort_id,
      schedule_id: c.schedule_id,
    };
  });
}

/**
 * All sessions for the player (every calendar entry in their player_calendar), with display status:
 * Completed (player_calendar.status === 'completed'), Due (planned, scheduled_at <= now), Future (planned, scheduled_at > now).
 * Includes session_score for completed runs (from session_runs). Ordered by scheduled_at ASC.
 */
export async function getAllSessionsForPlayer(
  client: SupabaseClient,
  playerId: string
): Promise<SessionWithStatus[]> {
  const now = new Date().toISOString();
  const [pcResult, runsResult] = await Promise.all([
    client
      .from(PLAYER_CALENDAR_TABLE)
      .select(`
        calendar_id,
        status,
        calendar(id, scheduled_at, day_no, session_no, session_id, cohort_id, schedule_id, sessions(name))
      `)
      .eq('player_id', playerId),
    client
      .from(SESSION_RUNS_TABLE)
      .select('calendar_id, session_score')
      .eq('player_id', playerId)
      .not('completed_at', 'is', null),
  ]);
  if (pcResult.error) mapError(pcResult.error);
  type PcRow = {
    calendar_id: string;
    status: PlayerCalendarStatus;
    calendar: {
      id: string;
      scheduled_at: string;
      day_no: number;
      session_no: number;
      session_id: string;
      cohort_id: string;
      schedule_id: string;
      sessions: { name: string } | { name: string }[] | null;
    } | {
      id: string;
      scheduled_at: string;
      day_no: number;
      session_no: number;
      session_id: string;
      cohort_id: string;
      schedule_id: string;
      sessions: { name: string } | { name: string }[] | null;
    }[];
  };
  const rows = (pcResult.data ?? []) as PcRow[];
  type RunRow = { calendar_id: string; session_score: number | null };
  const scoreByCalendar = new Map<string, number>();
  for (const row of (runsResult.data ?? []) as RunRow[]) {
    if (row.session_score != null) scoreByCalendar.set(row.calendar_id, row.session_score);
  }
  const result: SessionWithStatus[] = [];
  for (const r of rows) {
    const cal = Array.isArray(r.calendar) ? r.calendar[0] : r.calendar;
    if (!cal?.scheduled_at) continue;
    const session_name = Array.isArray(cal.sessions) ? cal.sessions[0]?.name ?? '' : cal.sessions?.name ?? '';
    const displayStatus: SessionWithStatus['status'] =
      r.status === 'completed'
        ? 'Completed'
        : cal.scheduled_at <= now
          ? 'Due'
          : 'Future';
    const score = scoreByCalendar.get(cal.id);
    result.push({
      calendar_id: cal.id,
      session_id: cal.session_id,
      session_name,
      scheduled_at: cal.scheduled_at,
      day_no: cal.day_no,
      session_no: cal.session_no,
      cohort_id: cal.cohort_id,
      schedule_id: cal.schedule_id,
      status: displayStatus,
      ...(score != null && { session_score: score }),
    });
  }
  result.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  return result;
}

/**
 * Update player_calendar status (e.g. to 'completed' when session is done). RLS: own row or admin. Throws NOT_FOUND if no row.
 */
export async function updatePlayerCalendarStatus(
  client: SupabaseClient,
  playerCalendarId: string,
  status: PlayerCalendarStatus
): Promise<PlayerCalendar> {
  assertValidStatus(status);
  const { data, error } = await client
    .from(PLAYER_CALENDAR_TABLE)
    .update({ status })
    .eq('id', playerCalendarId)
    .select()
    .single();
  if (error) mapError(error);
  if (!data) throw new DataError('Player calendar entry not found', 'NOT_FOUND');
  return data as PlayerCalendar;
}
