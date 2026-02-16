/**
 * Unit tests for player calendar and next/available sessions.
 */

import { DataError } from './errors';
import {
  getAvailableSessionsForPlayer,
  getNextSessionForPlayer,
  listPlayerCalendar,
  updatePlayerCalendarStatus,
} from './player-calendar';
import type { PlayerCalendar } from './types';
import { createMockClient } from './test-utils';

const samplePlayerCalendar: PlayerCalendar & {
  calendar: { scheduled_at: string; session_id: string; sessions: { name: string } | null } | null;
} = {
  id: 'pc-1',
  player_id: 'pid-1',
  calendar_id: 'cal-1',
  status: 'planned',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  calendar: {
    scheduled_at: '2026-03-02T19:00:00Z',
    session_id: 'sess-1',
    sessions: { name: 'ITA' },
  },
};

const sampleCalendarRow = {
  id: 'cal-1',
  scheduled_at: '2026-03-02T19:00:00Z',
  day_no: 1,
  session_no: 1,
  session_id: 'sess-1',
  cohort_id: 'cohort-1',
  schedule_id: 'sched-1',
  sessions: { name: 'ITA' },
};

describe('listPlayerCalendar', () => {
  it('returns player_calendar rows with scheduled_at and session_name', async () => {
    const client = createMockClient([
      { data: [samplePlayerCalendar], error: null },
    ]);
    const list = await listPlayerCalendar(client, 'pid-1');
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe('planned');
    expect(list[0].scheduled_at).toBe('2026-03-02T19:00:00Z');
    expect(list[0].session_name).toBe('ITA');
  });

  it('filters by status when provided', async () => {
    const client = createMockClient([
      { data: [samplePlayerCalendar], error: null },
    ]);
    const list = await listPlayerCalendar(client, 'pid-1', { status: 'planned' });
    expect(list).toHaveLength(1);
  });
});

describe('getNextSessionForPlayer', () => {
  it('returns next planned session when one exists', async () => {
    const client = createMockClient([
      { data: [{ calendar_id: 'cal-1' }], error: null },
      { data: [sampleCalendarRow], error: null },
    ]);
    const result = await getNextSessionForPlayer(client, 'pid-1');
    expect(result).not.toBeNull();
    expect(result!.calendar_id).toBe('cal-1');
    expect(result!.session_name).toBe('ITA');
    expect(result!.day_no).toBe(1);
  });

  it('returns null when no planned sessions', async () => {
    const client = createMockClient([
      { data: [], error: null },
    ]);
    const result = await getNextSessionForPlayer(client, 'pid-1');
    expect(result).toBeNull();
  });
});

describe('getAvailableSessionsForPlayer', () => {
  it('returns array of planned sessions', async () => {
    const client = createMockClient([
      { data: [{ calendar_id: 'cal-1' }], error: null },
      { data: [sampleCalendarRow], error: null },
    ]);
    const list = await getAvailableSessionsForPlayer(client, 'pid-1');
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(1);
    expect(list[0].session_name).toBe('ITA');
  });

  it('returns empty array when no planned sessions', async () => {
    const client = createMockClient([
      { data: [], error: null },
    ]);
    const list = await getAvailableSessionsForPlayer(client, 'pid-1');
    expect(list).toEqual([]);
  });
});

describe('updatePlayerCalendarStatus', () => {
  it('returns updated row on success', async () => {
    const updated = { ...samplePlayerCalendar, status: 'completed' as const };
    const client = createMockClient([
      { data: updated, error: null },
    ]);
    const result = await updatePlayerCalendarStatus(client, 'pc-1', 'completed');
    expect(result.status).toBe('completed');
  });

  it('throws VALIDATION for invalid status', async () => {
    const client = createMockClient([]);
    await expect(
      updatePlayerCalendarStatus(client, 'pc-1', 'invalid' as 'planned')
    ).rejects.toThrow(DataError);
    await expect(
      updatePlayerCalendarStatus(client, 'pc-1', 'invalid' as 'planned')
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  it('throws NOT_FOUND when no row', async () => {
    const client = createMockClient([
      { data: null, error: { code: 'PGRST116' } },
    ]);
    await expect(updatePlayerCalendarStatus(client, 'nonexistent', 'completed')).rejects.toThrow(
      DataError
    );
    await expect(updatePlayerCalendarStatus(client, 'nonexistent', 'completed')).rejects.toMatchObject(
      { code: 'NOT_FOUND' }
    );
  });
});
