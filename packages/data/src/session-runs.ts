/**
 * Session runs (training events). One per player per calendar session.
 * RLS: players can create/read/update own runs; admins full access.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import type { SessionRun } from './types';
import { getCurrentPlayer } from './players';

const SESSION_RUNS_TABLE = 'session_runs';
const PLAYER_CALENDAR_TABLE = 'player_calendar';

const PGRST_NO_ROWS = 'PGRST116';
const PG_UNIQUE_VIOLATION = '23505';

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
    throw new DataError('Session run not found', 'NOT_FOUND');
  }
  console.error('[@opp/data] Supabase error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

/**
 * Create a session run (player starts a calendar session). If a run already exists for
 * (playerId, calendarId), returns that run so the player can resume. Otherwise inserts and returns the new run.
 */
export async function createSessionRun(
  client: SupabaseClient,
  playerId: string,
  calendarId: string
): Promise<SessionRun> {
  const { data: existing } = await client
    .from(SESSION_RUNS_TABLE)
    .select('id, player_id, calendar_id, started_at, completed_at, session_score, created_at, updated_at')
    .eq('player_id', playerId)
    .eq('calendar_id', calendarId)
    .maybeSingle();
  if (existing) return existing as SessionRun;

  const { data, error } = await client
    .from(SESSION_RUNS_TABLE)
    .insert({ player_id: playerId, calendar_id: calendarId })
    .select()
    .single();
  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      const run = await getSessionRunByPlayerAndCalendar(client, playerId, calendarId);
      if (run) return run;
      throw new DataError('Session already started', 'CONFLICT');
    }
    mapError(error);
  }
  if (!data) throw new DataError('Session run not found', 'NOT_FOUND');
  return data as SessionRun;
}

/**
 * Get session run by player and calendar, or null if none. Used for resume and display.
 */
export async function getSessionRunByPlayerAndCalendar(
  client: SupabaseClient,
  playerId: string,
  calendarId: string
): Promise<SessionRun | null> {
  const { data, error } = await client
    .from(SESSION_RUNS_TABLE)
    .select('id, player_id, calendar_id, started_at, completed_at, session_score, created_at, updated_at')
    .eq('player_id', playerId)
    .eq('calendar_id', calendarId)
    .maybeSingle();
  if (error) mapError(error);
  return (data ?? null) as SessionRun | null;
}

/**
 * Get session run by id. Used for ITA derivation. Returns null if not found.
 */
export async function getSessionRunById(
  client: SupabaseClient,
  sessionRunId: string
): Promise<SessionRun | null> {
  const { data, error } = await client
    .from(SESSION_RUNS_TABLE)
    .select('id, player_id, calendar_id, started_at, completed_at, session_score, created_at, updated_at')
    .eq('id', sessionRunId)
    .maybeSingle();
  if (error) mapError(error);
  return (data ?? null) as SessionRun | null;
}

/**
 * Complete a session run: set completed_at and session_score. RLS ensures only the run owner (or admin) can update.
 * Throws NOT_FOUND if no row (e.g. wrong id or not allowed).
 */
export async function completeSessionRun(
  client: SupabaseClient,
  sessionRunId: string,
  sessionScore: number
): Promise<SessionRun> {
  const { data, error } = await client
    .from(SESSION_RUNS_TABLE)
    .update({
      completed_at: new Date().toISOString(),
      session_score: sessionScore,
    })
    .eq('id', sessionRunId)
    .select()
    .single();
  if (error) mapError(error);
  if (!data) throw new DataError('Session run not found', 'NOT_FOUND');
  return data as SessionRun;
}

/**
 * Admin only: reset a calendar session — delete all session runs for this calendar_id
 * (CASCADE removes dart_scores and player_routine_scores) and set player_calendar status
 * back to 'planned' so the slot appears as not completed. As if the session never took place.
 */
export async function resetSessionForCalendar(
  client: SupabaseClient,
  calendarId: string
): Promise<void> {
  const current = await getCurrentPlayer(client);
  if (!current || current.role !== 'admin') {
    throw new DataError('Admin access required', 'FORBIDDEN');
  }

  const { error: delError } = await client
    .from(SESSION_RUNS_TABLE)
    .delete()
    .eq('calendar_id', calendarId);
  if (delError) mapError(delError);

  // Reset player_calendar status to 'planned' for all players assigned to this session.
  const { error: updError } = await client
    .from(PLAYER_CALENDAR_TABLE)
    .update({ status: 'planned' })
    .eq('calendar_id', calendarId)
    .select('id');
  if (updError) mapError(updError);
}
