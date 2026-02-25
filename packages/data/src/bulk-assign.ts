/**
 * Bulk assignment — parameters and algorithm (§6).
 * Pure grouping logic; no DB access. Data layer (§7) uses this to create cohorts and members.
 */

import { DataError } from './errors';
import type { BulkAssignParams, BulkAssignPreview } from './types';

/** Minimal player shape needed for grouping (id + rating for match_level). */
export interface PlayerForBulkAssign {
  id: string;
  training_rating?: number | null;
  player_rating?: number | null;
}

function getRating(p: PlayerForBulkAssign, metric: 'training_rating' | 'player_rating'): number {
  const v = metric === 'training_rating' ? p.training_rating : p.player_rating;
  return v ?? 0;
}

/**
 * Validate bulk assign params. Throws DataError VALIDATION if invalid.
 */
export function validateBulkAssignParams(params: BulkAssignParams): void {
  if (!params.name_prefix?.trim()) {
    throw new DataError('Cohort name prefix is required', 'VALIDATION');
  }
  if (typeof params.name_start_index !== 'number' || params.name_start_index < 0) {
    throw new DataError('Name start index must be a non-negative number', 'VALIDATION');
  }
  if (typeof params.players_per_cohort !== 'number' || params.players_per_cohort < 1) {
    throw new DataError('Players per cohort must be at least 1', 'VALIDATION');
  }
  if (typeof params.duration_days !== 'number' || params.duration_days < 1) {
    throw new DataError('Duration must be at least 1 day', 'VALIDATION');
  }
  if (!params.start_date?.match(/^\d{4}-\d{2}-\d{2}$/)) {
    throw new DataError('Start date must be YYYY-MM-DD', 'VALIDATION');
  }
  const start = new Date(params.start_date);
  if (Number.isNaN(start.getTime())) {
    throw new DataError('Start date is invalid', 'VALIDATION');
  }
  if (params.match_level && (typeof params.level_proximity !== 'number' || params.level_proximity < 0)) {
    throw new DataError('Level proximity must be a non-negative number when Match level is on', 'VALIDATION');
  }
  if (!params.schedule_id?.trim()) {
    throw new DataError('Schedule is required', 'VALIDATION');
  }
}

/**
 * Compute end_date from start_date + duration_days (YYYY-MM-DD).
 */
export function computeBulkAssignEndDate(start_date: string, duration_days: number): string {
  const d = new Date(start_date);
  d.setDate(d.getDate() + duration_days);
  return d.toISOString().slice(0, 10);
}

/**
 * Group unassigned players into cohorts by the bulk-assign algorithm.
 * (1) Sort by rating if match_level else by id.
 * (2) If match_level, form cohorts so each has players within level_proximity range.
 * (3) If !match_level, chunk into groups of players_per_cohort.
 * (4) If required_full_cohort, drop groups with size < players_per_cohort.
 * (5) Name groups using name_prefix and name_start_index.
 */
export function computeBulkAssignGroups(
  params: BulkAssignParams,
  players: PlayerForBulkAssign[]
): BulkAssignPreview {
  validateBulkAssignParams(params);
  const end_date = computeBulkAssignEndDate(params.start_date, params.duration_days);
  const metric = params.level_metric ?? 'training_rating';

  if (players.length === 0) {
    return { groups: [], end_date };
  }

  const sorted =
    params.match_level
      ? [...players].sort((a, b) => getRating(a, metric) - getRating(b, metric))
      : [...players].sort((a, b) => a.id.localeCompare(b.id));

  let rawGroups: string[][];

  if (params.match_level) {
    rawGroups = [];
    const proximity = params.level_proximity;
    const maxSize = params.players_per_cohort;
    let current: string[] = [];
    let minR = getRating(sorted[0], metric);
    let maxR = minR;

    for (const p of sorted) {
      const r = getRating(p, metric);
      const wouldMax = Math.max(maxR, r);
      const wouldMin = current.length > 0 ? minR : r;
      const range = wouldMax - wouldMin;
      if (current.length >= maxSize || (current.length > 0 && range > proximity)) {
        rawGroups.push(current);
        current = [p.id];
        minR = r;
        maxR = r;
      } else {
        current.push(p.id);
        maxR = Math.max(maxR, r);
        minR = Math.min(minR, r);
      }
    }
    if (current.length > 0) rawGroups.push(current);
  } else {
    rawGroups = [];
    for (let i = 0; i < sorted.length; i += params.players_per_cohort) {
      rawGroups.push(sorted.slice(i, i + params.players_per_cohort).map((p) => p.id));
    }
  }

  const filtered = params.required_full_cohort
    ? rawGroups.filter((g) => g.length >= params.players_per_cohort)
    : rawGroups;

  const groups = filtered.map((playerIds, i) => ({
    name: `${params.name_prefix.trim()} ${params.name_start_index + i}`,
    playerIds,
  }));

  return { groups, end_date };
}
