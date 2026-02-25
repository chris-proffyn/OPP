/**
 * Session runs (training events). Multiple runs per (player, calendar) support replay.
 * RLS: players can create/read/update own runs; admins full access.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import type { SessionRun } from './types';
import { getCurrentPlayer } from './players';

const SESSION_RUNS_TABLE = 'session_runs';
const PLAYER_CALENDAR_TABLE = 'player_calendar';

/** Columns to select for SessionRun (includes run_type, routine_id for free runs). */
const SESSION_RUN_SELECT =
  'id, player_id, calendar_id, started_at, completed_at, session_score, player_level_snapshot, run_type, routine_id, created_at, updated_at';

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
    throw new DataError('Session run not found', 'NOT_FOUND');
  }
  console.error('[@opp/data] Supabase error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

/**
 * Create a new session run (player starts or replays a calendar session). Always inserts a new row.
 * For "Resume" (incomplete run), use getSessionRunByPlayerAndCalendar and use that run instead of creating.
 * Optional player_level_snapshot: set when starting a checkout session for expected_successes calculation.
 */
export async function createSessionRun(
  client: SupabaseClient,
  playerId: string,
  calendarId: string,
  options?: { player_level_snapshot?: number | null }
): Promise<SessionRun> {
  const insertRow: Record<string, unknown> = { player_id: playerId, calendar_id: calendarId };
  if (options?.player_level_snapshot !== undefined) insertRow.player_level_snapshot = options.player_level_snapshot;
  const { data, error } = await client
    .from(SESSION_RUNS_TABLE)
    .insert(insertRow)
    .select()
    .single();
  if (error) mapError(error);
  if (!data) throw new DataError('Session run not found', 'NOT_FOUND');
  return data as SessionRun;
}

/**
 * Create a new free-training run (platinum: single routine, no calendar). Always inserts a new row.
 * Returns the new run; id is the training_id for dart_scores and player_routine_scores.
 * Tier check (platinum) is done by the caller.
 */
export async function createFreeTrainingRun(
  client: SupabaseClient,
  playerId: string,
  routineId: string
): Promise<SessionRun> {
  const { data, error } = await client
    .from(SESSION_RUNS_TABLE)
    .insert({
      player_id: playerId,
      calendar_id: null,
      run_type: 'free',
      routine_id: routineId,
    })
    .select(SESSION_RUN_SELECT)
    .single();
  if (error) mapError(error);
  if (!data) throw new DataError('Session run not found', 'NOT_FOUND');
  return data as SessionRun;
}

/**
 * Get the latest session run by player and calendar (most recent by started_at), or null if none.
 * Used for resume: if the latest run is incomplete, the client can resume it; otherwise create a new run (start/replay).
 */
export async function getSessionRunByPlayerAndCalendar(
  client: SupabaseClient,
  playerId: string,
  calendarId: string
): Promise<SessionRun | null> {
  const { data, error } = await client
    .from(SESSION_RUNS_TABLE)
    .select(SESSION_RUN_SELECT)
    .eq('player_id', playerId)
    .eq('calendar_id', calendarId)
    .order('started_at', { ascending: false })
    .limit(1);
  if (error) mapError(error);
  const rows = Array.isArray(data) ? data : data != null ? [data] : [];
  return (rows[0] ?? null) as SessionRun | null;
}

/**
 * List all session runs for a player and calendar, ordered by started_at DESC (newest first).
 * Used for attempt count and aggregating session score.
 */
export async function listSessionRunsByPlayerAndCalendar(
  client: SupabaseClient,
  playerId: string,
  calendarId: string
): Promise<SessionRun[]> {
  const { data, error } = await client
    .from(SESSION_RUNS_TABLE)
    .select(SESSION_RUN_SELECT)
    .eq('player_id', playerId)
    .eq('calendar_id', calendarId)
    .order('started_at', { ascending: false });
  if (error) mapError(error);
  return (data ?? []) as SessionRun[];
}

/**
 * All session runs for a player (every run across all calendars), ordered by started_at DESC.
 * Used to build per-calendar attempt_count and aggregated session score in session lists.
 */
export async function listSessionRunsForPlayer(
  client: SupabaseClient,
  playerId: string
): Promise<SessionRun[]> {
  const { data, error } = await client
    .from(SESSION_RUNS_TABLE)
    .select(SESSION_RUN_SELECT)
    .eq('player_id', playerId)
    .order('started_at', { ascending: false });
  if (error) mapError(error);
  return (data ?? []) as SessionRun[];
}

/**
 * Aggregated session score for (player, calendar): average of session_score over completed runs.
 * Returns null if no completed runs or no scores.
 */
export async function getAggregatedSessionScoreForPlayerAndCalendar(
  client: SupabaseClient,
  playerId: string,
  calendarId: string
): Promise<number | null> {
  const runs = await listSessionRunsByPlayerAndCalendar(client, playerId, calendarId);
  const withScore = runs.filter((r) => r.completed_at != null && r.session_score != null);
  if (withScore.length === 0) return null;
  const sum = withScore.reduce((a, r) => a + Number(r.session_score), 0);
  return sum / withScore.length;
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
    .select(SESSION_RUN_SELECT)
    .eq('id', sessionRunId)
    .maybeSingle();
  if (error) mapError(error);
  return (data ?? null) as SessionRun | null;
}

/**
 * Complete a session run: set completed_at and session_score. RLS ensures only the run owner (or admin) can update.
 * Optional player_level_snapshot: set if not already set at start (e.g. for checkout expected_successes).
 * Throws NOT_FOUND if no row (e.g. wrong id or not allowed).
 */
export async function completeSessionRun(
  client: SupabaseClient,
  sessionRunId: string,
  sessionScore: number,
  options?: { player_level_snapshot?: number | null }
): Promise<SessionRun> {
  const updates: Record<string, unknown> = {
    completed_at: new Date().toISOString(),
    session_score: sessionScore,
  };
  if (options?.player_level_snapshot !== undefined) updates.player_level_snapshot = options.player_level_snapshot;
  const { data, error } = await client
    .from(SESSION_RUNS_TABLE)
    .update(updates)
    .eq('id', sessionRunId)
    .select(SESSION_RUN_SELECT)
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
