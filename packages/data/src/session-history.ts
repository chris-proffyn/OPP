/**
 * P6 Dashboard and Analyzer: session history and trends.
 * Per docs/P6_DASHBOARD_ANALYZER_DOMAIN.md §6.3, §7.2, §9.
 * RLS: players read own session_runs and player_routine_scores; calendar/routines readable per P2/P3.
 *
 * Free training exclusion (§9): All queries here exclude free-training runs (calendar_id IS NULL / run_type = 'free')
 * so session history, getSessionHistoryForPlayer, getTrendForPlayer and getRecentSessionScoresForPlayer only
 * include scheduled runs. Direct reports that query dart_scores (or join to session_runs) can include or exclude
 * free training by filtering on session_runs.run_type = 'free'.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import type {
  ListCompletedSessionRunsOptions,
  RecentSessionScore,
  SessionHistoryEntry,
} from './types';
import type { RoutineType } from './types';

const SESSION_RUNS_TABLE = 'session_runs';
const CALENDAR_TABLE = 'calendar';
const PLAYER_ROUTINE_SCORES_TABLE = 'player_routine_scores';
const ROUTINES_TABLE = 'routines';
const ROUTINE_STEPS_TABLE = 'routine_steps';

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
  console.error('[@opp/data] Session history error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

/**
 * Last N completed session runs: session_score and completed_at. For Dashboard TR trend (last 4 → compare last 2 vs previous 2).
 * Excludes free-training runs (calendar_id IS NULL) so only scheduled session scores affect the trend.
 */
export async function getRecentSessionScoresForPlayer(
  client: SupabaseClient,
  playerId: string,
  limit: number
): Promise<RecentSessionScore[]> {
  const { data, error } = await client
    .from(SESSION_RUNS_TABLE)
    .select('session_score, completed_at')
    .eq('player_id', playerId)
    .not('completed_at', 'is', null)
    .not('session_score', 'is', null)
    .not('calendar_id', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(Math.max(1, limit));

  if (error) mapError(error);
  const rows = (data ?? []) as { session_score: number; completed_at: string }[];
  return rows
    .filter((r) => r.session_score != null && r.completed_at != null)
    .map((r) => ({ session_score: Number(r.session_score), completed_at: r.completed_at }));
}

/**
 * Completed session runs with session name and per-routine scores. Optional since date and limit.
 * Excludes free-training runs (calendar_id IS NULL) so only scheduled sessions appear in history.
 */
export async function listCompletedSessionRunsForPlayer(
  client: SupabaseClient,
  playerId: string,
  options?: ListCompletedSessionRunsOptions
): Promise<SessionHistoryEntry[]> {
  let query = client
    .from(SESSION_RUNS_TABLE)
    .select('id, calendar_id, completed_at, session_score')
    .eq('player_id', playerId)
    .not('completed_at', 'is', null)
    .not('calendar_id', 'is', null)
    .order('completed_at', { ascending: false });

  if (options?.since) {
    query = query.gte('completed_at', options.since);
  }
  const limit = options?.limit ?? 50;
  const { data: runs, error: runsError } = await query.limit(limit);

  if (runsError) mapError(runsError);
  const runList = (runs ?? []) as { id: string; calendar_id: string; completed_at: string; session_score: number | null }[];
  if (runList.length === 0) return [];

  const calendarIds = [...new Set(runList.map((r) => r.calendar_id))];
  const runIds = runList.map((r) => r.id);

  const [calResult, prsResult] = await Promise.all([
    client
      .from(CALENDAR_TABLE)
      .select('id, session_id, sessions(name)')
      .in('id', calendarIds),
    client
      .from(PLAYER_ROUTINE_SCORES_TABLE)
      .select('training_id, routine_id, routine_score')
      .eq('player_id', playerId)
      .in('training_id', runIds),
  ]);

  if (calResult.error) mapError(calResult.error);
  if (prsResult.error) mapError(prsResult.error);

  type CalRow = {
    id: string;
    session_id: string;
    sessions: { name: string } | { name: string }[] | null;
  };
  const calRows = (calResult.data ?? []) as unknown as CalRow[];
  const sessionNameByCalendarId = new Map<string, string>();
  for (const c of calRows) {
    const sess = c.sessions;
    const name = Array.isArray(sess) ? sess[0]?.name ?? null : sess?.name ?? null;
    sessionNameByCalendarId.set(c.id, name ?? '');
  }

  const prsList = (prsResult.data ?? []) as { training_id: string; routine_id: string; routine_score: number }[];
  const routineIds = [...new Set(prsList.map((p) => p.routine_id))];
  const routineNameById = new Map<string, string>();
  if (routineIds.length > 0) {
    const { data: routineRows, error: routineError } = await client
      .from(ROUTINES_TABLE)
      .select('id, name')
      .in('id', routineIds);
    if (!routineError && routineRows) {
      for (const r of routineRows as { id: string; name: string }[]) {
        routineNameById.set(r.id, r.name);
      }
    }
  }

  const prsByRunId = new Map<string, { routine_id: string; routine_name: string; routine_score: number }[]>();
  for (const p of prsList) {
    const list = prsByRunId.get(p.training_id) ?? [];
    list.push({
      routine_id: p.routine_id,
      routine_name: routineNameById.get(p.routine_id) ?? '',
      routine_score: p.routine_score,
    });
    prsByRunId.set(p.training_id, list);
  }

  return runList.map((run) => ({
    id: run.id,
    calendar_id: run.calendar_id,
    completed_at: run.completed_at,
    session_score: run.session_score,
    session_name: sessionNameByCalendarId.get(run.calendar_id) ?? null,
    routine_scores: prsByRunId.get(run.id) ?? [],
  }));
}

/**
 * Session history for Analyzer: listCompletedSessionRunsForPlayer with limit (default 50).
 */
export async function getSessionHistoryForPlayer(
  client: SupabaseClient,
  playerId: string,
  limit?: number
): Promise<SessionHistoryEntry[]> {
  return listCompletedSessionRunsForPlayer(client, playerId, { limit: limit ?? 50 });
}

/**
 * Aggregate trend: session_score = average session score in window; routine = average routine score for matching routine name or routine_type in window.
 * P8: windowDays null/undefined = all time (no date filter).
 * When type === 'routine', provide either routineName (name ilike) or routineType (SS, SD, ST, C).
 * Excludes free-training runs (calendar_id IS NULL) so only scheduled runs affect trends.
 */
export async function getTrendForPlayer(
  client: SupabaseClient,
  playerId: string,
  options: {
    type: 'session_score' | 'routine';
    routineName?: string;
    routineType?: RoutineType;
    windowDays?: number | null;
  }
): Promise<number | null> {
  const windowDays = options.windowDays;
  const allTime = windowDays == null || windowDays === undefined;
  let sinceIso: string | undefined;
  if (!allTime) {
    const since = new Date();
    since.setDate(since.getDate() - windowDays);
    sinceIso = since.toISOString();
  }

  if (options.type === 'session_score') {
    let query = client
      .from(SESSION_RUNS_TABLE)
      .select('session_score')
      .eq('player_id', playerId)
      .not('completed_at', 'is', null)
      .not('session_score', 'is', null)
      .not('calendar_id', 'is', null);
    if (sinceIso) query = query.gte('completed_at', sinceIso);
    const { data, error } = await query;

    if (error) mapError(error);
    const rows = (data ?? []) as { session_score: number }[];
    if (rows.length === 0) return null;
    const sum = rows.reduce((a, r) => a + Number(r.session_score), 0);
    return sum / rows.length;
  }

  if (options.type === 'routine') {
    let matchingRoutineIds: Set<string>;

    if (options.routineType != null) {
      const { data: stepRows, error: stepsError } = await client
        .from(ROUTINE_STEPS_TABLE)
        .select('routine_id')
        .eq('routine_type', options.routineType);
      if (stepsError) mapError(stepsError);
      matchingRoutineIds = new Set(((stepRows ?? []) as { routine_id: string }[]).map((r) => r.routine_id));
    } else {
      const namePart = (options.routineName ?? '').trim();
      if (!namePart) return null;
      const { data: routineRows } = await client
        .from(ROUTINES_TABLE)
        .select('id')
        .ilike('name', `%${namePart}%`);
      matchingRoutineIds = new Set(((routineRows ?? []) as { id: string }[]).map((r) => r.id));
    }

    if (matchingRoutineIds.size === 0) return null;

    let runsQuery = client
      .from(SESSION_RUNS_TABLE)
      .select('id')
      .eq('player_id', playerId)
      .not('calendar_id', 'is', null)
      .not('completed_at', 'is', null);
    if (sinceIso) runsQuery = runsQuery.gte('completed_at', sinceIso);
    const { data: runs, error: runsError } = await runsQuery;

    if (runsError) mapError(runsError);
    const runIds = (runs ?? []).map((r: { id: string }) => r.id) as string[];
    if (runIds.length === 0) return null;

    const { data: prs, error: prsError } = await client
      .from(PLAYER_ROUTINE_SCORES_TABLE)
      .select('routine_id, routine_score')
      .eq('player_id', playerId)
      .in('training_id', runIds);

    if (prsError) mapError(prsError);
    const prsList = (prs ?? []) as { routine_id: string; routine_score: number }[];
    const matching = prsList.filter((p) => matchingRoutineIds.has(p.routine_id));
    if (matching.length === 0) return null;
    const sum = matching.reduce((a, p) => a + Number(p.routine_score), 0);
    return sum / matching.length;
  }

  return null;
}
