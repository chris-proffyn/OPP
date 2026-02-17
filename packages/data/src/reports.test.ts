/**
 * P8 §11.1, §11.2 — Unit tests for getCohortPerformanceReport and getCompetitionReport.
 * Mock client; assert shape and empty/partial behaviour.
 */

import { DataError } from './errors';
import { getCohortPerformanceReport, getCompetitionReport } from './reports';
import type { Competition } from './types';
import { adminPlayer, createMockClient } from './test-utils';

const adminResponse = () => ({ data: adminPlayer, error: null });

/** One object that works as both cohort_members row and calendar row so Promise.all order does not matter. */
const memberAndCalendarRow = {
  id: 'cal-1',
  cohort_id: 'cohort-1',
  player_id: 'pid-1',
  scheduled_at: '2026-02-15T19:00:00Z',
  schedule_id: 'sched-1',
  day_no: 1,
  session_no: 1,
  session_id: 'sess-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  sessions: { name: 'Singles' },
  players: { nickname: 'Alice' },
};

describe('getCohortPerformanceReport', () => {
  it('returns list of players with completion counts, average session score, TR', async () => {
    const pcRows = [{ player_id: 'pid-1', status: 'completed' }];
    const runRows = [{ player_id: 'pid-1', session_score: 82 }];
    const playerRows = [{ id: 'pid-1', training_rating: 65 }];

    const client = createMockClient([
      adminResponse(),
      adminResponse(),
      { data: [memberAndCalendarRow], error: null },
      { data: [memberAndCalendarRow], error: null },
      { data: pcRows, error: null },
      { data: runRows, error: null },
      { data: playerRows, error: null },
    ]);

    const result = await getCohortPerformanceReport(client, 'cohort-1');

    expect(result.cohortId).toBe('cohort-1');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].player_id).toBe('pid-1');
    expect(result.rows[0].display_name).toBe('Alice');
    expect(result.rows[0].sessions_planned).toBe(1);
    expect(result.rows[0].sessions_completed).toBe(1);
    expect(result.rows[0].completion_pct).toBe(1);
    expect(result.rows[0].average_session_score).toBe(82);
    expect(result.rows[0].training_rating).toBe(65);
  });

  it('returns empty rows when no members in cohort', async () => {
    const client = createMockClient([
      adminResponse(),
      adminResponse(),
      { data: [], error: null },
      { data: [], error: null },
    ]);

    const result = await getCohortPerformanceReport(client, 'cohort-empty');

    expect(result.cohortId).toBe('cohort-empty');
    expect(result.rows).toEqual([]);
  });

  it('returns partial data when calendar has no completed runs (TR only)', async () => {
    const memberRow = { ...memberAndCalendarRow, player_id: 'pid-1', players: { nickname: 'Bob' } };
    const pcRows = [{ player_id: 'pid-1', status: 'planned' }];
    const runRows: { player_id: string; session_score: number }[] = [];
    const client = createMockClient([
      adminResponse(),
      adminResponse(),
      { data: [memberRow], error: null },
      { data: [memberRow], error: null },
      { data: pcRows, error: null },
      { data: runRows, error: null },
      { data: [{ id: 'pid-1', training_rating: 50 }], error: null },
    ]);

    const result = await getCohortPerformanceReport(client, 'cohort-1');

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].sessions_planned).toBe(1);
    expect(result.rows[0].sessions_completed).toBe(0);
    expect(result.rows[0].completion_pct).toBe(0);
    expect(result.rows[0].average_session_score).toBeNull();
    expect(result.rows[0].training_rating).toBe(50);
  });

  it('throws FORBIDDEN when non-admin', async () => {
    const nonAdmin = { ...adminPlayer, role: 'player' as const };
    const client = createMockClient([{ data: nonAdmin, error: null }]);

    await expect(getCohortPerformanceReport(client, 'cohort-1')).rejects.toThrow(DataError);
    await expect(getCohortPerformanceReport(client, 'cohort-1')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('respects options.limit and caps number of players', async () => {
    const row1 = { ...memberAndCalendarRow, id: 'cal-1', player_id: 'p1', players: { nickname: 'A' } };
    const row2 = { ...memberAndCalendarRow, id: 'cal-2', player_id: 'p2', players: { nickname: 'B' } };
    const client = createMockClient([
      adminResponse(),
      adminResponse(),
      { data: [row1, row2], error: null },
      { data: [row1, row2], error: null },
      { data: [{ player_id: 'p1', status: 'completed' }], error: null },
      { data: [{ player_id: 'p1', session_score: 70 }], error: null },
      { data: [{ id: 'p1', training_rating: 60 }], error: null },
    ]);

    const result = await getCohortPerformanceReport(client, 'c', { limit: 1 });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].player_id).toBe('p1');
  });
});

const sampleCompetition: Competition = {
  id: 'comp-1',
  name: 'League day',
  cohort_id: 'cohort-1',
  competition_type: 'competition_day',
  scheduled_at: '2026-03-15T18:00:00Z',
  format_legs: 5,
  format_target: 501,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('getCompetitionReport', () => {
  it('returns competition plus matches list; shape correct', async () => {
    const matches = [
      {
        id: 'match-1',
        player_id: 'pid-1',
        opponent_id: 'pid-2',
        competition_id: 'comp-1',
        calendar_id: 'cal-1',
        played_at: '2026-03-15T19:00:00Z',
        format_best_of: 5,
        legs_won: 3,
        legs_lost: 1,
        total_legs: 4,
        three_dart_avg: null,
        player_3da_baseline: null,
        doubles_attempted: null,
        doubles_hit: null,
        doubles_pct: null,
        opponent_rating_at_match: null,
        rating_difference: null,
        match_rating: 72.5,
        weight: 1,
        eligible: true,
        created_at: '2026-03-15T19:00:00Z',
        updated_at: '2026-03-15T19:00:00Z',
      },
    ];
    const playerRows = [
      { id: 'pid-1', nickname: 'Alice' },
      { id: 'pid-2', nickname: 'Bob' },
    ];

    const client = createMockClient([
      adminResponse(),
      { data: sampleCompetition, error: null },
      { data: matches, error: null },
      { data: playerRows, error: null },
    ]);

    const result = await getCompetitionReport(client, 'comp-1');

    expect(result.competition).toEqual(sampleCompetition);
    expect(result.competition.name).toBe('League day');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].id).toBe('match-1');
    expect(result.matches[0].player_id).toBe('pid-1');
    expect(result.matches[0].opponent_id).toBe('pid-2');
    expect(result.matches[0].player_display_name).toBe('Alice');
    expect(result.matches[0].opponent_display_name).toBe('Bob');
    expect(result.matches[0].result).toBe('3–1');
    expect(result.matches[0].match_rating).toBe(72.5);
    expect(result.matches[0].eligible).toBe(true);
    expect(result.summary).toHaveLength(2);
    const aliceSummary = result.summary.find((r) => r.player_id === 'pid-1');
    expect(aliceSummary?.match_count).toBe(1);
    expect(aliceSummary?.wins).toBe(1);
    expect(aliceSummary?.losses).toBe(0);
  });

  it('returns empty matches and summary when no matches', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: sampleCompetition, error: null },
      { data: [], error: null },
    ]);

    const result = await getCompetitionReport(client, 'comp-1');

    expect(result.competition).toEqual(sampleCompetition);
    expect(result.matches).toEqual([]);
    expect(result.summary).toEqual([]);
  });

  it('throws when competition does not exist', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: null, error: null },
      { data: [], error: null },
    ]);

    await expect(getCompetitionReport(client, 'nonexistent')).rejects.toThrow(DataError);
  });

  it('throws FORBIDDEN when non-admin', async () => {
    const nonAdmin = { ...adminPlayer, role: 'player' as const };
    const client = createMockClient([{ data: nonAdmin, error: null }]);

    await expect(getCompetitionReport(client, 'comp-1')).rejects.toThrow(DataError);
    await expect(getCompetitionReport(client, 'comp-1')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});
