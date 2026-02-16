/**
 * Unit tests for schedule data layer. Mock Supabase client via queue.
 */

import type { Schedule, ScheduleEntry } from './types';
import { DataError } from './errors';
import {
  createSchedule,
  deleteSchedule,
  getScheduleById,
  listSchedules,
  listScheduleEntries,
  setScheduleEntries,
  updateSchedule,
} from './schedules';
import { adminPlayer, createMockClient, nonAdminPlayer } from './test-utils';

const sampleSchedule: Schedule = {
  id: 'sched-1',
  name: 'Beginner Daily',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const sampleEntry: ScheduleEntry = {
  id: 'ent-1',
  schedule_id: 'sched-1',
  day_no: 1,
  session_no: 1,
  session_id: 'sess-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const adminResponse = () => ({ data: adminPlayer, error: null });
const nonAdminResponse = () => ({ data: nonAdminPlayer, error: null });

describe('listSchedules', () => {
  it('returns list when admin', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [sampleSchedule], error: null },
    ]);
    const list = await listSchedules(client);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Beginner Daily');
  });

  it('throws FORBIDDEN when non-admin', async () => {
    const client = createMockClient([nonAdminResponse()]);
    await expect(listSchedules(client)).rejects.toThrow(DataError);
    await expect(listSchedules(client)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  });
});

describe('getScheduleById', () => {
  it('returns schedule + entries when found', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: sampleSchedule, error: null },
      { data: [sampleEntry], error: null },
    ]);
    const result = await getScheduleById(client, 'sched-1');
    expect(result).not.toBeNull();
    expect(result!.schedule.name).toBe('Beginner Daily');
    expect(result!.entries).toHaveLength(1);
    expect(result!.entries[0].day_no).toBe(1);
  });

  it('returns null when schedule not found', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: null, error: null },
    ]);
    const result = await getScheduleById(client, 'nonexistent');
    expect(result).toBeNull();
  });
});

describe('createSchedule', () => {
  it('returns created row on success', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: sampleSchedule, error: null },
    ]);
    const created = await createSchedule(client, { name: 'Beginner Daily' });
    expect(created.name).toBe('Beginner Daily');
    expect(created.id).toBe('sched-1');
  });
});

describe('updateSchedule', () => {
  it('returns updated row on success', async () => {
    const updated = { ...sampleSchedule, name: 'Updated Name' };
    const client = createMockClient([
      adminResponse(),
      { data: updated, error: null },
    ]);
    const result = await updateSchedule(client, 'sched-1', { name: 'Updated Name' });
    expect(result.name).toBe('Updated Name');
  });

  it('throws when no row (NOT_FOUND or error)', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: null, error: { code: 'PGRST116' } },
    ]);
    await expect(updateSchedule(client, 'nonexistent', { name: 'X' })).rejects.toThrow(DataError);
  });
});

describe('deleteSchedule', () => {
  it('succeeds when row exists', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [{ id: 'sched-1' }], error: null },
    ]);
    await expect(deleteSchedule(client, 'sched-1')).resolves.toBeUndefined();
  });

  it('throws when no row (NOT_FOUND or error)', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [], error: null },
    ]);
    await expect(deleteSchedule(client, 'nonexistent')).rejects.toThrow(DataError);
  });
});

describe('listScheduleEntries', () => {
  it('returns entries ordered by day_no, session_no', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [sampleEntry], error: null },
    ]);
    const list = await listScheduleEntries(client, 'sched-1');
    expect(list).toHaveLength(1);
    expect(list[0].day_no).toBe(1);
  });
});

describe('setScheduleEntries', () => {
  it('replaces entries and returns inserted rows', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [{ id: 'sess-1' }], error: null },
      { data: null, error: null },
      { data: [sampleEntry], error: null },
    ]);
    const result = await setScheduleEntries(client, 'sched-1', [
      { day_no: 1, session_no: 1, session_id: 'sess-1' },
    ]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('throws when session_id not found (VALIDATION)', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [], error: null },
    ]);
    await expect(
      setScheduleEntries(client, 'sched-1', [{ day_no: 1, session_no: 1, session_id: 'bad-id' }])
    ).rejects.toThrow(DataError);
  });
});
