/**
 * Unit tests for session runs (createSessionRun, getSessionRunByPlayerAndCalendar, completeSessionRun).
 * Per P4 §11.1. Uses mocked Supabase client.
 */

import { DataError } from './errors';
import {
  completeSessionRun,
  createSessionRun,
  getSessionRunByPlayerAndCalendar,
  listSessionRunsByPlayerAndCalendar,
  listSessionRunsForPlayer,
  getAggregatedSessionScoreForPlayerAndCalendar,
  resetSessionForCalendar,
} from './session-runs';
import type { SessionRun } from './types';
import { adminPlayer, createMockClient, nonAdminPlayer } from './test-utils';

const sampleRun: SessionRun = {
  id: 'run-1',
  player_id: 'pid-1',
  calendar_id: 'cal-1',
  started_at: '2026-02-15T10:00:00Z',
  completed_at: null,
  session_score: null,
  created_at: '2026-02-15T10:00:00Z',
  updated_at: '2026-02-15T10:00:00Z',
};

const completedRun: SessionRun = {
  ...sampleRun,
  completed_at: '2026-02-15T11:00:00Z',
  session_score: 75.5,
};

describe('createSessionRun', () => {
  it('returns new run on success', async () => {
    const client = createMockClient([
      { data: sampleRun, error: null },
    ]);
    const result = await createSessionRun(client, 'pid-1', 'cal-1');
    expect(result).toEqual(sampleRun);
    expect(result.id).toBe('run-1');
    expect(result.player_id).toBe('pid-1');
    expect(result.calendar_id).toBe('cal-1');
  });

  it('creates a second run for same (playerId, calendarId) when replaying', async () => {
    const run2 = { ...sampleRun, id: 'run-2', started_at: '2026-02-16T10:00:00Z' };
    const client = createMockClient([
      { data: run2, error: null },
    ]);
    const result = await createSessionRun(client, 'pid-1', 'cal-1');
    expect(result.id).toBe('run-2');
    expect(result.calendar_id).toBe('cal-1');
  });
});

describe('getSessionRunByPlayerAndCalendar', () => {
  it('returns latest run when found', async () => {
    const client = createMockClient([
      { data: sampleRun, error: null },
    ]);
    const result = await getSessionRunByPlayerAndCalendar(client, 'pid-1', 'cal-1');
    expect(result).toEqual(sampleRun);
  });

  it('returns null when no run exists', async () => {
    const client = createMockClient([
      { data: null, error: null },
    ]);
    const result = await getSessionRunByPlayerAndCalendar(client, 'pid-1', 'cal-1');
    expect(result).toBeNull();
  });
});

describe('listSessionRunsByPlayerAndCalendar', () => {
  it('returns all runs ordered by started_at DESC', async () => {
    const run2 = { ...sampleRun, id: 'run-2', started_at: '2026-02-16T10:00:00Z' };
    const client = createMockClient([
      { data: [run2, sampleRun], error: null },
    ]);
    const result = await listSessionRunsByPlayerAndCalendar(client, 'pid-1', 'cal-1');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('run-2');
    expect(result[1].id).toBe('run-1');
  });

  it('returns empty array when no runs', async () => {
    const client = createMockClient([{ data: [], error: null }]);
    const result = await listSessionRunsByPlayerAndCalendar(client, 'pid-1', 'cal-1');
    expect(result).toEqual([]);
  });
});

describe('getAggregatedSessionScoreForPlayerAndCalendar', () => {
  it('returns average of completed run scores', async () => {
    const run2 = { ...completedRun, id: 'run-2', session_score: 85 };
    const client = createMockClient([
      { data: [run2, completedRun], error: null },
    ]);
    const result = await getAggregatedSessionScoreForPlayerAndCalendar(client, 'pid-1', 'cal-1');
    expect(result).toBe((75.5 + 85) / 2);
  });

  it('returns null when no completed runs with score', async () => {
    const client = createMockClient([{ data: [sampleRun], error: null }]);
    const result = await getAggregatedSessionScoreForPlayerAndCalendar(client, 'pid-1', 'cal-1');
    expect(result).toBeNull();
  });
});

describe('completeSessionRun', () => {
  it('returns updated run on success', async () => {
    const client = createMockClient([
      { data: completedRun, error: null },
    ]);
    const result = await completeSessionRun(client, 'run-1', 75.5);
    expect(result).toEqual(completedRun);
    expect(result.session_score).toBe(75.5);
    expect(result.completed_at).toBeTruthy();
  });

  it('throws NOT_FOUND when no row (or not allowed)', async () => {
    const client = createMockClient([
      { data: null, error: { code: 'PGRST116', message: 'No rows' } },
    ]);
    await expect(completeSessionRun(client, 'bad-id', 50)).rejects.toThrow(DataError);
    await expect(completeSessionRun(client, 'bad-id', 50)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Session run not found',
    });
  });
});

describe('resetSessionForCalendar', () => {
  it('succeeds when current user is admin', async () => {
    const client = createMockClient([
      { data: adminPlayer, error: null },
      { data: null, error: null },
    ]);
    await expect(resetSessionForCalendar(client, 'cal-1')).resolves.toBeUndefined();
  });

  it('throws FORBIDDEN when current user is not admin', async () => {
    const client = createMockClient([{ data: nonAdminPlayer, error: null }]);
    await expect(resetSessionForCalendar(client, 'cal-1')).rejects.toThrow(DataError);
    await expect(resetSessionForCalendar(client, 'cal-1')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  });
});
