/**
 * Session and session_routines data access. Admin-only; RLS enforces.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import { getCurrentPlayer } from './players';
import type {
  CreateSessionPayload,
  Session,
  SessionRoutine,
  SessionRoutineInput,
  UpdateSessionPayload,
} from './types';

const SESSIONS_TABLE = 'sessions';
const SESSION_ROUTINES_TABLE = 'session_routines';
const ROUTINES_TABLE = 'routines';

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

function mapError(err: unknown, context: 'session' | 'generic' = 'generic'): never {
  if (err instanceof DataError) throw err;
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: string }).code;
    if (code === PGRST_NO_ROWS) {
      throw new DataError('Session not found', 'NOT_FOUND');
    }
    if (context === 'session' && code === PG_FK_VIOLATION) {
      throw new DataError('Cannot delete: session is used in a schedule', 'VALIDATION');
    }
  }
  console.error('[@opp/data] Supabase error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

/**
 * List all sessions (id, name, created_at, updated_at). Admin only.
 */
export async function listSessions(client: SupabaseClient): Promise<Session[]> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(SESSIONS_TABLE)
    .select('id, name, created_at, updated_at');
  if (error) mapError(error);
  return (data ?? []) as Session[];
}

/**
 * Get session by id with routines ordered by routine_no. Returns null if not found. Admin only.
 */
export async function getSessionById(
  client: SupabaseClient,
  sessionId: string
): Promise<{ session: Session; routines: SessionRoutine[] } | null> {
  await requireAdmin(client);
  const { data: sessionRow, error: sessionError } = await client
    .from(SESSIONS_TABLE)
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessionError) mapError(sessionError);
  if (!sessionRow) return null;

  const { data: routines, error: routinesError } = await client
    .from(SESSION_ROUTINES_TABLE)
    .select('*')
    .eq('session_id', sessionId)
    .order('routine_no', { ascending: true });
  if (routinesError) mapError(routinesError);

  return {
    session: sessionRow as Session,
    routines: (routines ?? []) as SessionRoutine[],
  };
}

/**
 * Get session by id with routines ordered by routine_no. Returns null if not found.
 * For GE: no admin required; RLS allows authenticated SELECT.
 */
export async function getSessionWithRoutines(
  client: SupabaseClient,
  sessionId: string
): Promise<{ session: Session; routines: SessionRoutine[] } | null> {
  const { data: sessionRow, error: sessionError } = await client
    .from(SESSIONS_TABLE)
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessionError) mapError(sessionError);
  if (!sessionRow) return null;

  const { data: routines, error: routinesError } = await client
    .from(SESSION_ROUTINES_TABLE)
    .select('*')
    .eq('session_id', sessionId)
    .order('routine_no', { ascending: true });
  if (routinesError) mapError(routinesError);

  return {
    session: sessionRow as Session,
    routines: (routines ?? []) as SessionRoutine[],
  };
}

/**
 * Create a session. Admin only.
 */
export async function createSession(
  client: SupabaseClient,
  payload: CreateSessionPayload
): Promise<Session> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(SESSIONS_TABLE)
    .insert({ name: payload.name })
    .select()
    .single();
  if (error) mapError(error);
  return data as Session;
}

/**
 * Update session by id. Throws NOT_FOUND if no row. Admin only.
 */
export async function updateSession(
  client: SupabaseClient,
  sessionId: string,
  payload: UpdateSessionPayload
): Promise<Session> {
  await requireAdmin(client);
  const updates: Record<string, unknown> = {};
  if (payload.name !== undefined) updates.name = payload.name;
  if (Object.keys(updates).length === 0) {
    const existing = await getSessionById(client, sessionId);
    if (!existing) throw new DataError('Session not found', 'NOT_FOUND');
    return existing.session;
  }
  const { data, error } = await client
    .from(SESSIONS_TABLE)
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single();
  if (error) mapError(error);
  if (!data) throw new DataError('Session not found', 'NOT_FOUND');
  return data as Session;
}

/**
 * Delete session by id. If referenced by schedule_entries, throws clear VALIDATION error. Admin only.
 */
export async function deleteSession(
  client: SupabaseClient,
  sessionId: string
): Promise<void> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(SESSIONS_TABLE)
    .delete()
    .eq('id', sessionId)
    .select('id');
  if (error) mapError(error, 'session');
  if (!data || data.length === 0) {
    throw new DataError('Session not found', 'NOT_FOUND');
  }
}

/**
 * List session_routines for a session, ordered by routine_no. Admin only.
 */
export async function listSessionRoutines(
  client: SupabaseClient,
  sessionId: string
): Promise<SessionRoutine[]> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(SESSION_ROUTINES_TABLE)
    .select('*')
    .eq('session_id', sessionId)
    .order('routine_no', { ascending: true });
  if (error) mapError(error);
  return (data ?? []) as SessionRoutine[];
}

/**
 * Replace all session_routines for a session. Validates routine_id exists. Admin only.
 */
export async function setSessionRoutines(
  client: SupabaseClient,
  sessionId: string,
  routines: SessionRoutineInput[]
): Promise<SessionRoutine[]> {
  await requireAdmin(client);

  const routineIds = [...new Set(routines.map((r) => r.routine_id))];
  if (routineIds.length > 0) {
    const { data: routineRows, error: rErr } = await client
      .from(ROUTINES_TABLE)
      .select('id')
      .in('id', routineIds);
    if (rErr) mapError(rErr);
    const found = new Set((routineRows ?? []).map((r: { id: string }) => r.id));
    const missing = routineIds.filter((id) => !found.has(id));
    if (missing.length > 0) {
      throw new DataError(
        `Routine(s) not found: ${missing.join(', ')}`,
        'VALIDATION'
      );
    }
  }

  const { error: delError } = await client
    .from(SESSION_ROUTINES_TABLE)
    .delete()
    .eq('session_id', sessionId);
  if (delError) mapError(delError);

  if (routines.length === 0) return [];

  const rows = routines.map((r) => ({
    session_id: sessionId,
    routine_no: r.routine_no,
    routine_id: r.routine_id,
  }));
  const { data: inserted, error: insError } = await client
    .from(SESSION_ROUTINES_TABLE)
    .insert(rows)
    .select();
  if (insError) mapError(insError);
  return (inserted ?? []) as SessionRoutine[];
}
