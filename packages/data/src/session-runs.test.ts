/**
 * Unit tests for session runs (createSessionRun, getSessionRunByPlayerAndCalendar, completeSessionRun).
 * Per P4 §11.1. Uses mocked Supabase client.
 */

import { DataError } from './errors';
import {
  completeSessionRun,
  createSessionRun,
  getSessionRunByPlayerAndCalendar,
} from './session-runs';
import type { SessionRun } from './types';
import { createMockClient } from './test-utils';

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
      { data: null, error: null },
      { data: sampleRun, error: null },
    ]);
    const result = await createSessionRun(client, 'pid-1', 'cal-1');
    expect(result).toEqual(sampleRun);
    expect(result.id).toBe('run-1');
    expect(result.player_id).toBe('pid-1');
    expect(result.calendar_id).toBe('cal-1');
  });

  it('returns existing run when one already exists for (playerId, calendarId)', async () => {
    const client = createMockClient([
      { data: sampleRun, error: null },
    ]);
    const result = await createSessionRun(client, 'pid-1', 'cal-1');
    expect(result).toEqual(sampleRun);
    expect(result.id).toBe('run-1');
  });
});

describe('getSessionRunByPlayerAndCalendar', () => {
  it('returns run when found', async () => {
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
