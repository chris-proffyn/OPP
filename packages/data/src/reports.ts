/**
 * P8 — Admin reports: cohort performance and competition report.
 * Per P8_POLISH_SCALE_DOMAIN.md §6. All data via data layer; no raw SQL in UI.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import { getCurrentPlayer } from './players';
import { listCohortMembers } from './cohort-members';
import { listCalendarByCohort } from './calendar';
import { getCompetitionById } from './competitions';
import { listMatchesForCompetition } from './matches';
import type {
  CohortPerformanceReport,
  CohortPerformanceReportRow,
  CompetitionReport,
  CompetitionReportMatchRow,
  CompetitionReportSummaryRow,
} from './types';

const PLAYER_CALENDAR_TABLE = 'player_calendar';
const SESSION_RUNS_TABLE = 'session_runs';
const PLAYERS_TABLE = 'players';
const PGRST_NO_ROWS = 'PGRST116';

export interface GetCohortPerformanceReportOptions {
  fromDate?: string;
  toDate?: string;
  /** Cap number of players in report (e.g. 500). Omit for no limit. P8 §9.5: use for very large cohorts. */
  limit?: number;
}

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
    throw new DataError('Not found', 'NOT_FOUND');
  }
  console.error('[@opp/data] Supabase error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

/**
 * Cohort performance report: players in cohort with sessions planned/completed, completion %, average session score, TR.
 * Admin only. Options: fromDate/toDate filter calendar entries by scheduled_at (ISO).
 */
export async function getCohortPerformanceReport(
  client: SupabaseClient,
  cohortId: string,
  options?: GetCohortPerformanceReportOptions
): Promise<CohortPerformanceReport> {
  await requireAdmin(client);

  const [membersRaw, calendarList] = await Promise.all([
    listCohortMembers(client, cohortId),
    listCalendarByCohort(client, cohortId),
  ]);
  const members = options?.limit != null && options.limit > 0
    ? membersRaw.slice(0, options.limit)
    : membersRaw;

  const calendarIds =
    options?.fromDate || options?.toDate
      ? calendarList
          .filter((c) => {
            const at = c.scheduled_at ?? '';
            if (options?.fromDate && at < options.fromDate) return false;
            if (options?.toDate && at > options.toDate) return false;
            return true;
          })
          .map((c) => c.id)
      : calendarList.map((c) => c.id);

  const playerIds = members.map((m) => m.player_id);
  if (playerIds.length === 0) {
    return { cohortId, rows: [] };
  }

  const plannedByPlayer: Record<string, number> = {};
  const completedByPlayer: Record<string, number> = {};
  const scoreSumByPlayer: Record<string, number> = {};
  const scoreCountByPlayer: Record<string, number> = {};
  playerIds.forEach((id) => {
    plannedByPlayer[id] = 0;
    completedByPlayer[id] = 0;
    scoreSumByPlayer[id] = 0;
    scoreCountByPlayer[id] = 0;
  });

  if (calendarIds.length > 0) {
    const { data: pcRows, error: pcError } = await client
      .from(PLAYER_CALENDAR_TABLE)
      .select('player_id, status')
      .in('calendar_id', calendarIds);
    if (pcError) mapError(pcError);
    const pcList = (pcRows ?? []) as { player_id: string; status: string }[];
    pcList.forEach((r) => {
      if (playerIds.includes(r.player_id)) {
        plannedByPlayer[r.player_id] = (plannedByPlayer[r.player_id] ?? 0) + 1;
        if (r.status === 'completed') {
          completedByPlayer[r.player_id] = (completedByPlayer[r.player_id] ?? 0) + 1;
        }
      }
    });

    const { data: runRows, error: runError } = await client
      .from(SESSION_RUNS_TABLE)
      .select('player_id, session_score')
      .in('calendar_id', calendarIds)
      .not('completed_at', 'is', null)
      .not('session_score', 'is', null);
    if (runError) mapError(runError);
    const runList = (runRows ?? []) as { player_id: string; session_score: number }[];
    runList.forEach((r) => {
      if (playerIds.includes(r.player_id) && typeof r.session_score === 'number') {
        scoreSumByPlayer[r.player_id] = (scoreSumByPlayer[r.player_id] ?? 0) + r.session_score;
        scoreCountByPlayer[r.player_id] = (scoreCountByPlayer[r.player_id] ?? 0) + 1;
      }
    });
  }

  const { data: playerRows, error: plError } = await client
    .from(PLAYERS_TABLE)
    .select('id, training_rating')
    .in('id', playerIds);
  if (plError) mapError(plError);
  const trainingRatingByPlayer: Record<string, number | null> = {};
  (playerRows ?? []).forEach((r: { id: string; training_rating: number | null }) => {
    trainingRatingByPlayer[r.id] = r.training_rating != null ? Number(r.training_rating) : null;
  });

  const rows: CohortPerformanceReportRow[] = members.map((m) => {
    const planned = plannedByPlayer[m.player_id] ?? 0;
    const completed = completedByPlayer[m.player_id] ?? 0;
    const completion_pct = planned > 0 ? Math.round((completed / planned) * 1000) / 1000 : 0;
    const sum = scoreSumByPlayer[m.player_id] ?? 0;
    const count = scoreCountByPlayer[m.player_id] ?? 0;
    const average_session_score = count > 0 ? Math.round((sum / count) * 10) / 10 : null;
    return {
      player_id: m.player_id,
      display_name: m.display_name ?? null,
      sessions_planned: planned,
      sessions_completed: completed,
      completion_pct,
      average_session_score,
      training_rating: trainingRatingByPlayer[m.player_id] ?? null,
    };
  });

  return { cohortId, rows };
}

/**
 * Competition report: competition details plus matches (with player/opponent names, result, MR, eligible) and per-player summary (match count, wins, losses).
 * Admin only. Uses getCompetitionById and listMatchesForCompetition; enriches with display names and summary.
 */
export async function getCompetitionReport(
  client: SupabaseClient,
  competitionId: string
): Promise<CompetitionReport> {
  await requireAdmin(client);

  const [competition, matches] = await Promise.all([
    getCompetitionById(client, competitionId),
    listMatchesForCompetition(client, competitionId),
  ]);

  if (!competition) {
    throw new DataError('Competition not found', 'NOT_FOUND');
  }

  const playerIds = new Set<string>();
  matches.forEach((m) => {
    playerIds.add(m.player_id);
    playerIds.add(m.opponent_id);
  });

  const idList = Array.from(playerIds);
  let displayNameByPlayer: Record<string, string | null> = {};
  if (idList.length > 0) {
    const { data: plRows, error } = await client
      .from(PLAYERS_TABLE)
      .select('id, nickname')
      .in('id', idList);
    if (error) mapError(error);
    (plRows ?? []).forEach((r: { id: string; nickname: string | null }) => {
      displayNameByPlayer[r.id] = r.nickname ?? null;
    });
  }

  const matchRows: CompetitionReportMatchRow[] = matches.map((m) => ({
    id: m.id,
    player_id: m.player_id,
    opponent_id: m.opponent_id,
    player_display_name: displayNameByPlayer[m.player_id] ?? null,
    opponent_display_name: displayNameByPlayer[m.opponent_id] ?? null,
    played_at: m.played_at,
    legs_won: m.legs_won,
    legs_lost: m.legs_lost,
    result: `${m.legs_won}–${m.legs_lost}`,
    match_rating: m.match_rating,
    eligible: m.eligible,
  }));

  const summaryByPlayer: Record<string, { match_count: number; wins: number; losses: number }> = {};
  idList.forEach((id) => {
    summaryByPlayer[id] = { match_count: 0, wins: 0, losses: 0 };
  });
  matches.forEach((m) => {
    const rec = summaryByPlayer[m.player_id];
    if (rec) {
      rec.match_count += 1;
      if (m.legs_won > m.legs_lost) rec.wins += 1;
      else if (m.legs_won < m.legs_lost) rec.losses += 1;
    }
  });

  const summary: CompetitionReportSummaryRow[] = idList.map((player_id) => ({
    player_id,
    display_name: displayNameByPlayer[player_id] ?? null,
    match_count: summaryByPlayer[player_id]?.match_count ?? 0,
    wins: summaryByPlayer[player_id]?.wins ?? 0,
    losses: summaryByPlayer[player_id]?.losses ?? 0,
  }));

  return {
    competition,
    matches: matchRows,
    summary,
  };
}
