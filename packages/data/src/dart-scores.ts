/**
 * Dart scores: one row per dart thrown. RLS: players can insert/select own; admin full.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import type { DartScore, DartScorePayload } from './types';

const DART_SCORES_TABLE = 'dart_scores';

const VALID_RESULTS = ['H', 'M'] as const;

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
  console.error('[@opp/data] Supabase error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

function assertValidResult(result: string): asserts result is 'H' | 'M' {
  if (!VALID_RESULTS.includes(result as 'H' | 'M')) {
    throw new DataError(`result must be one of: ${VALID_RESULTS.join(', ')}`, 'VALIDATION');
  }
}

/**
 * Insert one dart score. Validates result is 'H' or 'M'. Returns the created row.
 */
export async function insertDartScore(
  client: SupabaseClient,
  payload: DartScorePayload
): Promise<DartScore> {
  assertValidResult(payload.result);
  const row: Record<string, unknown> = {
    player_id: payload.player_id,
    training_id: payload.training_id,
    routine_id: payload.routine_id,
    routine_no: payload.routine_no,
    step_no: payload.step_no,
    dart_no: payload.dart_no,
    target: payload.target,
    actual: payload.actual,
    result: payload.result,
  };
  if (payload.attempt_index != null) row.attempt_index = payload.attempt_index;
  const { data, error } = await client
    .from(DART_SCORES_TABLE)
    .insert(row)
    .select()
    .single();
  if (error) mapError(error);
  if (!data) throw new DataError('Failed to create dart score', 'NETWORK');
  return data as DartScore;
}

/**
 * Bulk insert dart scores. Validates each result. Returns the created rows.
 */
export async function insertDartScores(
  client: SupabaseClient,
  payloads: DartScorePayload[]
): Promise<DartScore[]> {
  if (payloads.length === 0) return [];
  for (const p of payloads) assertValidResult(p.result);
  const rows = payloads.map((p) => {
    const row: Record<string, unknown> = {
      player_id: p.player_id,
      training_id: p.training_id,
      routine_id: p.routine_id,
      routine_no: p.routine_no,
      step_no: p.step_no,
      dart_no: p.dart_no,
      target: p.target,
      actual: p.actual,
      result: p.result,
    };
    if (p.attempt_index != null) row.attempt_index = p.attempt_index;
    return row;
  });
  const { data, error } = await client.from(DART_SCORES_TABLE).insert(rows).select();
  if (error) mapError(error);
  return (data ?? []) as DartScore[];
}

/**
 * List all dart scores for a session run (training_id). Ordered by routine_no, step_no, dart_no.
 * Used for ITA rating derivation.
 */
export async function listDartScoresByTrainingId(
  client: SupabaseClient,
  trainingId: string
): Promise<DartScore[]> {
  const { data, error } = await client
    .from(DART_SCORES_TABLE)
    .select('id, player_id, training_id, routine_id, routine_no, step_no, dart_no, attempt_index, target, actual, result, created_at')
    .eq('training_id', trainingId)
    .order('routine_no', { ascending: true })
    .order('step_no', { ascending: true })
    .order('dart_no', { ascending: true });
  if (error) mapError(error);
  return (data ?? []) as DartScore[];
}

/**
 * P8 §5.1 — Dart-level data for Analyzer (Gold/Platinum). Return dart_scores for a session run (training_id),
 * ordered by routine_no, step_no, dart_no. RLS restricts to own data (player_id = auth player).
 * Tier gating: UI should call this only when tier is Gold or Platinum (getEffectiveTier / isPremiumTier);
 * data layer does not check tier so API stays consistent; RLS ensures Free-tier users only see own darts if ever called.
 */
export async function getDartScoresForSessionRun(
  client: SupabaseClient,
  trainingId: string
): Promise<DartScore[]> {
  return listDartScoresByTrainingId(client, trainingId);
}
