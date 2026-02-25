/**
 * Cohort data access. Admin-only for mutations; RLS enforces.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import { getCurrentPlayer } from './players';
import type {
  BulkAssignParams,
  BulkAssignResult,
  Cohort,
  CohortStatus,
  CreateCohortPayload,
  UpdateCohortPayload,
} from './types';
import { computeBulkAssignGroups } from './bulk-assign';
import { addCohortMember, listPlayersWithoutCohort } from './cohort-members';

const COHORT_SELECT =
  'id, name, level, start_date, end_date, schedule_id, competitions_enabled, cohort_status, created_at, updated_at';

const COHORTS_TABLE = 'cohorts';
const CALENDAR_TABLE = 'calendar';
const PLAYER_CALENDAR_TABLE = 'player_calendar';
const SCHEDULES_TABLE = 'schedules';
const PGRST_NO_ROWS = 'PGRST116';

const SYNCABLE_STATUSES: CohortStatus[] = ['confirmed', 'live', 'overdue', 'complete'];

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
 * List all cohorts. Admin only. Returns cohort_status.
 */
export async function listCohorts(client: SupabaseClient): Promise<Cohort[]> {
  await requireAdmin(client);
  const { data, error } = await client
    .from(COHORTS_TABLE)
    .select(COHORT_SELECT)
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
 * Recompute and persist cohort_status for confirmed → live/overdue/complete from current date and player_calendar completion.
 * This is the single function for automatic status transitions (LIVE, OVERDUE, COMPLETE). Used on-read in getCohortById;
 * a nightly job or cron could call it for all cohorts if the list view must stay current without opening each cohort.
 * Returns the new status if an update was made, otherwise null.
 */
export async function syncCohortStatus(
  client: SupabaseClient,
  cohortId: string
): Promise<CohortStatus | null> {
  const { data: cohort, error: cohortError } = await client
    .from(COHORTS_TABLE)
    .select('id, cohort_status, start_date, end_date')
    .eq('id', cohortId)
    .maybeSingle();
  if (cohortError) mapError(cohortError);
  if (!cohort) return null;
  const current = (cohort as { cohort_status: CohortStatus }).cohort_status;
  if (!SYNCABLE_STATUSES.includes(current)) return null;

  const { data: calIds } = await client
    .from(CALENDAR_TABLE)
    .select('id')
    .eq('cohort_id', cohortId);
  const calendarIds = ((calIds ?? []) as { id: string }[]).map((r) => r.id);
  const today = new Date().toISOString().slice(0, 10);
  const start_date = (cohort as { start_date: string }).start_date;
  const end_date = (cohort as { end_date: string }).end_date;

  let target: CohortStatus;
  if (calendarIds.length === 0) {
    target = start_date <= today ? (end_date < today ? 'overdue' : 'live') : 'confirmed';
  } else {
    const { count: total } = await client
      .from(PLAYER_CALENDAR_TABLE)
      .select('id', { count: 'exact', head: true })
      .in('calendar_id', calendarIds);
    const { count: completed } = await client
      .from(PLAYER_CALENDAR_TABLE)
      .select('id', { count: 'exact', head: true })
      .in('calendar_id', calendarIds)
      .eq('status', 'completed');
    const totalN = total ?? 0;
    const completedN = completed ?? 0;
    if (totalN > 0 && completedN >= totalN) {
      target = 'complete';
    } else if (end_date < today) {
      target = 'overdue';
    } else if (start_date <= today) {
      target = 'live';
    } else {
      target = 'confirmed';
    }
  }

  if (target === current) return null;
  const { error: updateError } = await client
    .from(COHORTS_TABLE)
    .update({ cohort_status: target })
    .eq('id', cohortId);
  if (updateError) mapError(updateError);
  return target;
}

/** Alias for syncCohortStatus: single function to recompute LIVE/OVERDUE/COMPLETE from date and completion. */
export const recomputeCohortStatus = syncCohortStatus;

/**
 * Get cohort by id with optional schedule name and member count. Returns null if not found. Admin only.
 * Syncs cohort_status (confirmed → live/overdue/complete) from dates and completion before returning.
 */
export async function getCohortById(
  client: SupabaseClient,
  cohortId: string
): Promise<GetCohortByIdResult | null> {
  await requireAdmin(client);
  const syncedStatus = await syncCohortStatus(client, cohortId);
  const { data: cohort, error: cohortError } = await client
    .from(COHORTS_TABLE)
    .select(COHORT_SELECT)
    .eq('id', cohortId)
    .maybeSingle();
  if (cohortError) mapError(cohortError);
  if (!cohort) return null;
  const cohortRow = cohort as Cohort;

  const [scheduleRes, countRes] = await Promise.all([
    client.from(SCHEDULES_TABLE).select('name').eq('id', cohortRow.schedule_id).maybeSingle(),
    client.from('cohort_members').select('id', { count: 'exact', head: true }).eq('cohort_id', cohortId),
  ]);
  if (scheduleRes.error) mapError(scheduleRes.error);
  if (countRes.error) mapError(countRes.error);

  return {
    cohort: cohortRow,
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
      ...(payload.competitions_enabled !== undefined && { competitions_enabled: payload.competitions_enabled }),
      ...(payload.cohort_status !== undefined && { cohort_status: payload.cohort_status }),
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
  const existingRow = await client.from(COHORTS_TABLE).select('cohort_status').eq('id', cohortId).maybeSingle();
  if (!existingRow.data) throw new DataError('Cohort not found', 'NOT_FOUND');
  const currentStatus = (existingRow.data as { cohort_status: CohortStatus }).cohort_status;

  if (payload.cohort_status !== undefined) {
    if (payload.cohort_status !== 'confirmed') {
      throw new DataError('Only transition to confirmed is allowed via update; use transitionCohortToConfirmed', 'VALIDATION');
    }
    if (currentStatus !== 'proposed') {
      throw new DataError('Cohort must be proposed to transition to confirmed', 'VALIDATION');
    }
  }

  if (SYNCABLE_STATUSES.includes(currentStatus)) {
    const disallowed = ['name', 'level', 'start_date', 'end_date', 'schedule_id'] as const;
    for (const key of disallowed) {
      if (payload[key] !== undefined) {
        throw new DataError(
          `Cohort is ${currentStatus}; details (e.g. name, level, dates, schedule) cannot be changed.`,
          'VALIDATION'
        );
      }
    }
  }

  const updates: Record<string, unknown> = {};
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.level !== undefined) updates.level = payload.level;
  if (payload.start_date !== undefined) updates.start_date = payload.start_date;
  if (payload.end_date !== undefined) updates.end_date = payload.end_date;
  if (payload.schedule_id !== undefined) updates.schedule_id = payload.schedule_id;
  if (payload.competitions_enabled !== undefined) updates.competitions_enabled = payload.competitions_enabled;
  if (payload.cohort_status !== undefined) updates.cohort_status = payload.cohort_status;
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
 * Transition cohort from proposed to confirmed (admin "Approve"). Throws if not found or not proposed. Admin only.
 */
export async function transitionCohortToConfirmed(
  client: SupabaseClient,
  cohortId: string
): Promise<Cohort> {
  return updateCohort(client, cohortId, { cohort_status: 'confirmed' });
}

/**
 * Start of the decade containing the given value (e.g. 27 → 20, 35 → 30).
 * Used for bulk-created cohort level from average PR of members.
 */
function decadeStart(value: number): number {
  const start = Math.floor(value / 10) * 10;
  return Math.max(0, Math.min(90, start));
}

/**
 * Cohort level for a bulk-created cohort: start of the decade containing the average PR of its members.
 * If no members or all PRs null, returns 0.
 */
function cohortLevelFromAveragePR(
  playerIds: string[],
  playerById: Map<string, { player_rating?: number | null }>
): number {
  if (playerIds.length === 0) return 0;
  let sum = 0;
  let count = 0;
  for (const id of playerIds) {
    const p = playerById.get(id);
    const pr = p?.player_rating;
    if (pr != null && Number.isFinite(pr)) {
      sum += pr;
      count++;
    }
  }
  const avg = count > 0 ? sum / count : 0;
  return decadeStart(avg);
}

/**
 * Bulk assign unassigned players to new cohorts. Creates cohorts (draft then proposed when members added) and adds members.
 * Cohort level is set to the start of the decade containing the average PR of the cohort's members (e.g. avg PR 27 → level 20).
 * Idempotency: only considers players without cohort; re-running only affects newly unassigned players.
 * Throws VALIDATION if no unassigned players or no cohorts created (e.g. required_full_cohort and remainder too small).
 */
export async function bulkAssignPlayersToCohorts(
  client: SupabaseClient,
  params: BulkAssignParams
): Promise<BulkAssignResult> {
  await requireAdmin(client);
  const players = await listPlayersWithoutCohort(client);
  if (players.length === 0) {
    throw new DataError('No unassigned players', 'VALIDATION');
  }
  const preview = computeBulkAssignGroups(params, players);
  if (preview.groups.length === 0) {
    throw new DataError(
      'No cohorts created (e.g. not enough unassigned players for a full cohort when Required full cohort is on)',
      'VALIDATION'
    );
  }
  const playerById = new Map(players.map((p) => [p.id, { player_rating: p.player_rating }]));
  const cohorts: BulkAssignResult['cohorts'] = [];
  for (const group of preview.groups) {
    const level = cohortLevelFromAveragePR(group.playerIds, playerById);
    const cohort = await createCohort(client, {
      name: group.name,
      level,
      start_date: params.start_date,
      end_date: preview.end_date,
      schedule_id: params.schedule_id,
      competitions_enabled: false,
    });
    for (const playerId of group.playerIds) {
      await addCohortMember(client, cohort.id, playerId);
    }
    cohorts.push({ cohortId: cohort.id, cohortName: cohort.name, playerIds: group.playerIds });
  }
  return { cohorts };
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
