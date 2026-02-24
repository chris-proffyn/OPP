/**
 * Unit tests for cohort data layer. Mock Supabase via test-utils queue.
 */

import { DataError } from './errors';
import {
  createCohort,
  deleteCohort,
  getCohortById,
  listCohorts,
  updateCohort,
} from './cohorts';
import type { Cohort } from './types';
import { adminPlayer, createMockClient, nonAdminPlayer } from './test-utils';

const adminResponse = () => ({ data: adminPlayer, error: null });
const nonAdminResponse = () => ({ data: nonAdminPlayer, error: null });

const sampleCohort: Cohort = {
  id: 'cohort-1',
  name: 'BanjaxFruitcake-Mar26',
  level: 20,
  start_date: '2026-03-02',
  end_date: '2026-04-12',
  schedule_id: 'sched-1',
  competitions_enabled: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('listCohorts', () => {
  it('returns list when admin', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [sampleCohort], error: null },
    ]);
    const list = await listCohorts(client);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('BanjaxFruitcake-Mar26');
    expect(list[0].level).toBe(20);
  });

  it('throws FORBIDDEN when non-admin', async () => {
    const client = createMockClient([nonAdminResponse()]);
    await expect(listCohorts(client)).rejects.toThrow(DataError);
    await expect(listCohorts(client)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  });
});

describe('getCohortById', () => {
  it('returns cohort with schedule_name and member_count when found', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: sampleCohort, error: null },
      { data: { name: 'Beginner Daily' }, error: null },
      { data: null, error: null, count: 3 },
    ]);
    const result = await getCohortById(client, 'cohort-1');
    expect(result).not.toBeNull();
    expect(result!.cohort.name).toBe('BanjaxFruitcake-Mar26');
    expect(result!.schedule_name).toBe('Beginner Daily');
    expect(result!.member_count).toBe(3);
  });

  it('returns null when cohort not found', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: null, error: null },
    ]);
    const result = await getCohortById(client, 'nonexistent');
    expect(result).toBeNull();
  });
});

describe('createCohort', () => {
  it('returns created row on success', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: sampleCohort, error: null },
    ]);
    const created = await createCohort(client, {
      name: 'BanjaxFruitcake-Mar26',
      level: 20,
      start_date: '2026-03-02',
      end_date: '2026-04-12',
      schedule_id: 'sched-1',
    });
    expect(created.name).toBe('BanjaxFruitcake-Mar26');
    expect(created.id).toBe('cohort-1');
  });

  it('throws VALIDATION when end_date < start_date', async () => {
    const client = createMockClient([adminResponse()]);
    const promise = createCohort(client, {
      name: 'X',
      level: 20,
      start_date: '2026-04-01',
      end_date: '2026-03-01',
      schedule_id: 'sched-1',
    });
    await expect(promise).rejects.toThrow(DataError);
    await expect(promise).rejects.toMatchObject({ code: 'VALIDATION' });
  });
});

describe('updateCohort', () => {
  it('returns updated row on success', async () => {
    const updated = { ...sampleCohort, name: 'Updated Name' };
    const client = createMockClient([
      adminResponse(),
      { data: updated, error: null },
    ]);
    const result = await updateCohort(client, 'cohort-1', { name: 'Updated Name' });
    expect(result.name).toBe('Updated Name');
  });

  it('throws NOT_FOUND when no row', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: null, error: { code: 'PGRST116' } },
    ]);
    const promise = updateCohort(client, 'nonexistent', { name: 'X' });
    await expect(promise).rejects.toThrow(DataError);
    await expect(promise).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('deleteCohort', () => {
  it('succeeds when row exists', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [{ id: 'cohort-1' }], error: null },
    ]);
    await expect(deleteCohort(client, 'cohort-1')).resolves.toBeUndefined();
  });

  it('throws NOT_FOUND when no row', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [], error: null },
    ]);
    const promise = deleteCohort(client, 'nonexistent');
    await expect(promise).rejects.toThrow(DataError);
    await expect(promise).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
