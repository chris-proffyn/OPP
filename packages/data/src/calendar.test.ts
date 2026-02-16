/**
 * Unit tests for calendar data layer.
 */

import { DataError } from './errors';
import {
  getCalendarEntryById,
  generateCalendarForCohort,
  listCalendarByCohort,
} from './calendar';
import type { Calendar } from './types';
import type { Schedule, ScheduleEntry } from './types';
import { adminPlayer, createMockClient } from './test-utils';

const adminResponse = () => ({ data: adminPlayer, error: null });

const sampleCalendar: Calendar & { sessions: { name: string } | null } = {
  id: 'cal-1',
  scheduled_at: '2026-03-02T19:00:00Z',
  cohort_id: 'cohort-1',
  schedule_id: 'sched-1',
  day_no: 1,
  session_no: 1,
  session_id: 'sess-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  sessions: { name: 'ITA' },
};

const sampleSchedule = {
  id: 'sched-1',
  name: 'Beginner Daily',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
} as Schedule;

const sampleEntry: ScheduleEntry = {
  id: 'ent-1',
  schedule_id: 'sched-1',
  day_no: 1,
  session_no: 1,
  session_id: 'sess-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('listCalendarByCohort', () => {
  it('returns calendar entries with session_name', async () => {
    const client = createMockClient([
      { data: [sampleCalendar], error: null },
    ]);
    const list = await listCalendarByCohort(client, 'cohort-1');
    expect(list).toHaveLength(1);
    expect(list[0].day_no).toBe(1);
    expect(list[0].session_name).toBe('ITA');
  });
});

describe('generateCalendarForCohort', () => {
  it('creates calendar rows and returns them', async () => {
    const client = createMockClient([
      adminResponse(), // generateCalendar requireAdmin
      { data: { id: 'cohort-1', start_date: '2026-03-02', schedule_id: 'sched-1' }, error: null },
      adminResponse(), // getScheduleById requireAdmin
      { data: sampleSchedule, error: null },
      { data: [sampleEntry], error: null },
      { data: null, error: null },
      { data: [sampleCalendar as Calendar], error: null },
      { data: [{ player_id: 'pid-1' }], error: null },
      { data: null, error: null },
    ]);
    const result = await generateCalendarForCohort(client, 'cohort-1');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].day_no).toBe(1);
  });

  it('throws NOT_FOUND when cohort missing', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: null, error: null },
    ]);
    const promise = generateCalendarForCohort(client, 'nonexistent');
    await expect(promise).rejects.toThrow(DataError);
    await expect(promise).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('getCalendarEntryById', () => {
  it('returns entry with session_name and cohort_name when found', async () => {
    const client = createMockClient([
      {
        data: {
          ...sampleCalendar,
          sessions: { name: 'ITA' },
          cohorts: { name: 'Test Cohort' },
        },
        error: null,
      },
    ]);
    const result = await getCalendarEntryById(client, 'cal-1');
    expect(result).not.toBeNull();
    expect(result!.session_name).toBe('ITA');
    expect(result!.cohort_name).toBe('Test Cohort');
  });

  it('returns null when not found', async () => {
    const client = createMockClient([
      { data: null, error: null },
    ]);
    const result = await getCalendarEntryById(client, 'nonexistent');
    expect(result).toBeNull();
  });
});
