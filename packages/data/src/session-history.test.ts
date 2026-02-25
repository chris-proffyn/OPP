/**
 * Unit tests for P6 session history and trends.
 * Per P6_DASHBOARD_ANALYZER_IMPLEMENTATION_TASKS.md §9.
 * getRecentSessionScoresForPlayer, listCompletedSessionRunsForPlayer,
 * getSessionHistoryForPlayer, getTrendForPlayer. Uses mocked Supabase client.
 */

import {
  getRecentSessionScoresForPlayer,
  listCompletedSessionRunsForPlayer,
  getSessionHistoryForPlayer,
  getTrendForPlayer,
} from './session-history';
import { createMockClient } from './test-utils';

describe('getRecentSessionScoresForPlayer', () => {
  it('returns last N completed runs (session_score, completed_at) ordered by completed_at DESC', async () => {
    const rows = [
      { session_score: 82, completed_at: '2026-02-15T12:00:00Z' },
      { session_score: 78, completed_at: '2026-02-14T11:00:00Z' },
      { session_score: 75, completed_at: '2026-02-13T10:00:00Z' },
      { session_score: 80, completed_at: '2026-02-12T09:00:00Z' },
    ];
    const client = createMockClient([{ data: rows, error: null }]);
    const result = await getRecentSessionScoresForPlayer(client, 'pid-1', 4);
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({ session_score: 82, completed_at: '2026-02-15T12:00:00Z' });
    expect(result[3]).toEqual({ session_score: 80, completed_at: '2026-02-12T09:00:00Z' });
  });

  it('returns empty array when no completed runs', async () => {
    const client = createMockClient([{ data: [], error: null }]);
    const result = await getRecentSessionScoresForPlayer(client, 'pid-1', 4);
    expect(result).toEqual([]);
  });

  it('filters out rows with null session_score or completed_at', async () => {
    const rows = [
      { session_score: 80, completed_at: '2026-02-15T12:00:00Z' },
      { session_score: null, completed_at: '2026-02-14T11:00:00Z' },
      { session_score: 75, completed_at: null },
    ];
    const client = createMockClient([{ data: rows, error: null }]);
    const result = await getRecentSessionScoresForPlayer(client, 'pid-1', 4);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ session_score: 80, completed_at: '2026-02-15T12:00:00Z' });
  });
});

describe('listCompletedSessionRunsForPlayer', () => {
  it('returns completed runs with session name and routine scores', async () => {
    const runs = [
      {
        id: 'run-1',
        calendar_id: 'cal-1',
        completed_at: '2026-02-15T12:00:00Z',
        session_score: 80,
      },
    ];
    const calRows = [
      { id: 'cal-1', session_id: 'sess-1', sessions: { name: 'Singles' } },
    ];
    const prsList = [
      { training_id: 'run-1', routine_id: 'rout-1', routine_score: 45 },
      { training_id: 'run-1', routine_id: 'rout-2', routine_score: 35 },
    ];
    const routineRows = [
      { id: 'rout-1', name: 'Routine A' },
      { id: 'rout-2', name: 'Routine B' },
    ];
    // Mock consumes: runs, then Promise.all([calendar, prs]) — order is prs then calendar
    const client = createMockClient([
      { data: runs, error: null },
      { data: prsList, error: null },
      { data: calRows, error: null },
      { data: routineRows, error: null },
    ]);
    const result = await listCompletedSessionRunsForPlayer(client, 'pid-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('run-1');
    expect(result[0].session_name).toBe('Singles');
    expect(result[0].session_score).toBe(80);
    expect(result[0].routine_scores).toHaveLength(2);
    expect(result[0].routine_scores.map((r) => r.routine_name)).toEqual(['Routine A', 'Routine B']);
    expect(result[0].routine_scores.map((r) => r.routine_score)).toEqual([45, 35]);
  });

  it('returns empty array when no completed runs', async () => {
    const client = createMockClient([{ data: [], error: null }]);
    const result = await listCompletedSessionRunsForPlayer(client, 'pid-1');
    expect(result).toEqual([]);
  });

  it('respects options.since and options.limit', async () => {
    const runs = [
      { id: 'run-1', calendar_id: 'cal-1', completed_at: '2026-02-15T12:00:00Z', session_score: 80 },
    ];
    const calRows = [{ id: 'cal-1', session_id: 'sess-1', sessions: { name: 'Singles' } }];
    const prsList: unknown[] = [];
    // order: runs, then Promise.all([prs, calendar])
    const client = createMockClient([
      { data: runs, error: null },
      { data: prsList, error: null },
      { data: calRows, error: null },
    ]);
    const result = await listCompletedSessionRunsForPlayer(client, 'pid-1', {
      since: '2026-02-01T00:00:00Z',
      limit: 10,
    });
    expect(result).toHaveLength(1);
  });
});

describe('getSessionHistoryForPlayer', () => {
  it('returns listCompletedSessionRunsForPlayer with default limit 50', async () => {
    const runs = [
      { id: 'run-1', calendar_id: 'cal-1', completed_at: '2026-02-15T12:00:00Z', session_score: 80 },
    ];
    const calRows = [{ id: 'cal-1', session_id: 'sess-1', sessions: { name: 'Singles' } }];
    const prsList: unknown[] = [];
    const client = createMockClient([
      { data: runs, error: null },
      { data: prsList, error: null },
      { data: calRows, error: null },
    ]);
    const result = await getSessionHistoryForPlayer(client, 'pid-1');
    expect(result).toHaveLength(1);
    expect(result[0].session_name).toBe('Singles');
  });

  it('accepts custom limit', async () => {
    const client = createMockClient([{ data: [], error: null }]);
    const result = await getSessionHistoryForPlayer(client, 'pid-1', 10);
    expect(result).toEqual([]);
  });
});

describe('getTrendForPlayer', () => {
  it('type session_score: returns average session score in window', async () => {
    const rows = [
      { session_score: 80 },
      { session_score: 82 },
      { session_score: 78 },
    ];
    const client = createMockClient([{ data: rows, error: null }]);
    const result = await getTrendForPlayer(client, 'pid-1', {
      type: 'session_score',
      windowDays: 30,
    });
    expect(result).toBe((80 + 82 + 78) / 3);
  });

  it('type session_score: returns null when no runs in window', async () => {
    const client = createMockClient([{ data: [], error: null }]);
    const result = await getTrendForPlayer(client, 'pid-1', {
      type: 'session_score',
      windowDays: 30,
    });
    expect(result).toBeNull();
  });

  it('type routine: returns average routine score for matching routine name', async () => {
    const runIds = [{ id: 'run-1' }, { id: 'run-2' }];
    const routineRows = [{ id: 'rout-1' }]; // name matches "Singles"
    const prsList = [
      { routine_id: 'rout-1', routine_score: 40 },
      { routine_id: 'rout-1', routine_score: 50 },
    ];
    const client = createMockClient([
      { data: routineRows, error: null },
      { data: runIds, error: null },
      { data: prsList, error: null },
    ]);
    const result = await getTrendForPlayer(client, 'pid-1', {
      type: 'routine',
      routineName: 'Singles',
      windowDays: 30,
    });
    expect(result).toBe(45);
  });

  it('type routine: returns null when routineName is empty', async () => {
    const client = createMockClient([]);
    const result = await getTrendForPlayer(client, 'pid-1', {
      type: 'routine',
      routineName: '   ',
      windowDays: 30,
    });
    expect(result).toBeNull();
  });

  it('type routine: returns null when no runs in window', async () => {
    const client = createMockClient([{ data: [], error: null }]);
    const result = await getTrendForPlayer(client, 'pid-1', {
      type: 'routine',
      routineName: 'Singles',
      windowDays: 30,
    });
    expect(result).toBeNull();
  });

  it('type session_score with windowDays 90: returns average in 90-day window', async () => {
    const rows = [
      { session_score: 78 },
      { session_score: 82 },
      { session_score: 80 },
    ];
    const client = createMockClient([{ data: rows, error: null }]);
    const result = await getTrendForPlayer(client, 'pid-1', {
      type: 'session_score',
      windowDays: 90,
    });
    expect(result).toBe((78 + 82 + 80) / 3);
  });

  it('type session_score with windowDays null (all time): returns average with no date filter', async () => {
    const rows = [
      { session_score: 75 },
      { session_score: 85 },
    ];
    const client = createMockClient([{ data: rows, error: null }]);
    const result = await getTrendForPlayer(client, 'pid-1', {
      type: 'session_score',
      windowDays: null,
    });
    expect(result).toBe((75 + 85) / 2);
  });
});
