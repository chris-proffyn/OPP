/**
 * Unit tests for level requirements data layer. Mock Supabase client via queue.
 */

import type { LevelRequirement } from './types';
import { DataError } from './errors';
import {
  createLevelRequirement,
  deleteLevelRequirement,
  getLevelRequirementByMinLevel,
  getLevelRequirementByMinLevelAndRoutineType,
  listLevelRequirements,
  updateLevelRequirement,
} from './level-requirements';
import { adminPlayer, createMockClient, nonAdminPlayer } from './test-utils';

const adminResponse = () => ({ data: adminPlayer, error: null });
const nonAdminResponse = () => ({ data: nonAdminPlayer, error: null });

const sampleLevel: LevelRequirement = {
  id: 'lr-1',
  min_level: 20,
  tgt_hits: 2,
  darts_allowed: 9,
  routine_type: 'SS',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('listLevelRequirements', () => {
  it('returns list ordered by min_level when admin', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [sampleLevel], error: null },
    ]);
    const list = await listLevelRequirements(client);
    expect(list).toHaveLength(1);
    expect(list[0].min_level).toBe(20);
    expect(list[0].tgt_hits).toBe(2);
  });

  it('throws FORBIDDEN when non-admin', async () => {
    const client = createMockClient([nonAdminResponse()]);
    await expect(listLevelRequirements(client)).rejects.toThrow(DataError);
    await expect(listLevelRequirements(client)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  });
});

describe('getLevelRequirementByMinLevel', () => {
  it('returns SS row when found', async () => {
    const client = createMockClient([{ data: sampleLevel, error: null }]);
    const result = await getLevelRequirementByMinLevel(client, 20);
    expect(result).not.toBeNull();
    expect(result!.min_level).toBe(20);
    expect(result!.routine_type).toBe('SS');
  });

  it('returns null when not found', async () => {
    const client = createMockClient([{ data: null, error: null }]);
    const result = await getLevelRequirementByMinLevel(client, 99);
    expect(result).toBeNull();
  });
});

describe('getLevelRequirementByMinLevelAndRoutineType', () => {
  it('returns row when found', async () => {
    const client = createMockClient([{ data: sampleLevel, error: null }]);
    const result = await getLevelRequirementByMinLevelAndRoutineType(client, 20, 'SS');
    expect(result).not.toBeNull();
    expect(result!.min_level).toBe(20);
    expect(result!.routine_type).toBe('SS');
  });

  it('returns null when not found', async () => {
    const client = createMockClient([{ data: null, error: null }]);
    const result = await getLevelRequirementByMinLevelAndRoutineType(client, 20, 'SD');
    expect(result).toBeNull();
  });
});

describe('createLevelRequirement', () => {
  it('returns created row on success', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: sampleLevel, error: null },
    ]);
    const created = await createLevelRequirement(client, {
      min_level: 20,
      tgt_hits: 2,
      darts_allowed: 9,
      routine_type: 'SS',
    });
    expect(created.min_level).toBe(20);
    expect(created.tgt_hits).toBe(2);
  });

  it('throws CONFLICT on unique violation (min_level + routine_type already exists)', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: null, error: { code: '23505' } },
    ]);
    await expect(
      createLevelRequirement(client, { min_level: 20, tgt_hits: 2, darts_allowed: 9, routine_type: 'SS' })
    ).rejects.toMatchObject({ code: 'CONFLICT', message: /min_level and routine_type/ });
  });

  it('creates row with routine_type SD (same min_level, different routine_type allowed in DB)', async () => {
    const sdRow = { ...sampleLevel, routine_type: 'SD' as const, id: 'lr-2' };
    const client = createMockClient([
      adminResponse(),
      { data: sdRow, error: null },
    ]);
    const created = await createLevelRequirement(client, {
      min_level: 20,
      routine_type: 'SD',
      tgt_hits: 1,
      darts_allowed: 9,
    });
    expect(created.routine_type).toBe('SD');
    expect(created.min_level).toBe(20);
  });
});

describe('updateLevelRequirement', () => {
  it('returns updated row on success', async () => {
    const updated = { ...sampleLevel, tgt_hits: 3 };
    const client = createMockClient([
      adminResponse(),
      { data: updated, error: null },
    ]);
    const result = await updateLevelRequirement(client, 'lr-1', { tgt_hits: 3 });
    expect(result.tgt_hits).toBe(3);
  });

  it('throws NOT_FOUND when no row', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: null, error: { code: 'PGRST116' } },
    ]);
    await expect(
      updateLevelRequirement(client, 'nonexistent', { min_level: 10 })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('throws CONFLICT when min_level changed to existing decade', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: null, error: { code: '23505' } },
    ]);
    await expect(
      updateLevelRequirement(client, 'lr-1', { min_level: 10 })
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('updates routine_type when provided', async () => {
    const updated = { ...sampleLevel, routine_type: 'ST' as const };
    const client = createMockClient([
      adminResponse(),
      { data: updated, error: null },
    ]);
    const result = await updateLevelRequirement(client, 'lr-1', { routine_type: 'ST' });
    expect(result.routine_type).toBe('ST');
  });
});

describe('deleteLevelRequirement', () => {
  it('succeeds when row exists', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [{ id: 'lr-1' }], error: null },
    ]);
    await expect(deleteLevelRequirement(client, 'lr-1')).resolves.toBeUndefined();
  });

  it('throws NOT_FOUND when no row', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [], error: null },
    ]);
    await expect(deleteLevelRequirement(client, 'nonexistent')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
