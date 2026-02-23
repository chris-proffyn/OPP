/**
 * P7 — Unit tests for competitions CRUD. Mock client. Per implementation tasks §14.1.
 */

import {
  createCompetition,
  deleteCompetition,
  getCompetitionById,
  listCompetitions,
  updateCompetition,
} from './competitions';
import type { Competition } from './types';
import { adminPlayer, createMockClient, nonAdminPlayer } from './test-utils';

const adminResponse = () => ({ data: adminPlayer, error: null });

const sampleCompetition: Competition = {
  id: 'comp-1',
  name: 'Competition day - 5 Legs',
  cohort_id: 'cohort-1',
  competition_type: 'competition_day',
  scheduled_at: '2026-03-15T18:00:00Z',
  format_legs: 5,
  format_target: 501,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('listCompetitions', () => {
  it('returns competitions ordered by scheduled_at', async () => {
    const client = createMockClient([
      { data: [sampleCompetition], error: null },
    ]);
    const list = await listCompetitions(client);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Competition day - 5 Legs');
    expect(list[0].competition_type).toBe('competition_day');
  });

  it('returns empty array when no data', async () => {
    const client = createMockClient([{ data: [], error: null }]);
    const list = await listCompetitions(client);
    expect(list).toEqual([]);
  });
});

describe('getCompetitionById', () => {
  it('returns competition when found', async () => {
    const client = createMockClient([
      { data: sampleCompetition, error: null },
    ]);
    const comp = await getCompetitionById(client, 'comp-1');
    expect(comp).not.toBeNull();
    expect(comp!.name).toBe('Competition day - 5 Legs');
  });

  it('returns null when not found', async () => {
    const client = createMockClient([{ data: null, error: null }]);
    const comp = await getCompetitionById(client, 'nonexistent');
    expect(comp).toBeNull();
  });
});

describe('createCompetition', () => {
  it('returns created row when admin', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: sampleCompetition, error: null },
    ]);
    const created = await createCompetition(client, {
      name: 'Competition day - 5 Legs',
      competition_type: 'competition_day',
      cohort_id: 'cohort-1',
      scheduled_at: '2026-03-15T18:00:00Z',
      format_legs: 5,
      format_target: 501,
    });
    expect(created.id).toBe('comp-1');
    expect(created.name).toBe('Competition day - 5 Legs');
  });

  it('throws FORBIDDEN when non-admin', async () => {
    const client = createMockClient([
      { data: nonAdminPlayer, error: null },
    ]);
    await expect(
      createCompetition(client, {
        name: 'Test',
        competition_type: 'competition_day',
      })
    ).rejects.toMatchObject({ code: 'FORBIDDEN', message: 'Admin access required' });
  });
});

describe('updateCompetition', () => {
  it('returns updated row when admin', async () => {
    const updated = { ...sampleCompetition, name: 'Updated name' };
    const client = createMockClient([
      adminResponse(),
      { data: updated, error: null },
    ]);
    const result = await updateCompetition(client, 'comp-1', { name: 'Updated name' });
    expect(result.name).toBe('Updated name');
  });

  it('throws FORBIDDEN when non-admin', async () => {
    const client = createMockClient([{ data: nonAdminPlayer, error: null }]);
    await expect(
      updateCompetition(client, 'comp-1', { name: 'X' })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('deleteCompetition', () => {
  it('succeeds when admin', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [{ id: 'comp-1' }], error: null },
    ]);
    await expect(deleteCompetition(client, 'comp-1')).resolves.toBeUndefined();
  });

  it('throws NOT_FOUND when no row deleted', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [], error: null },
    ]);
    await expect(deleteCompetition(client, 'nonexistent')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Competition not found',
    });
  });
});
