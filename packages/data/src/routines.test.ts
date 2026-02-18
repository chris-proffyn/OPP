/**
 * Unit tests for routine data layer. Mock Supabase client via queue.
 */

import type { Routine, RoutineStep } from './types';
import { DataError } from './errors';
import {
  createRoutine,
  deleteRoutine,
  getRoutineById,
  listRoutines,
  listRoutineSteps,
  setRoutineSteps,
  updateRoutine,
} from './routines';
import { adminPlayer, createMockClient, nonAdminPlayer } from './test-utils';

const adminResponse = () => ({ data: adminPlayer, error: null });
const nonAdminResponse = () => ({ data: nonAdminPlayer, error: null });

const sampleRoutine: Routine = {
  id: 'rout-1',
  name: 'Singles',
  description: 'S20 x 9',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const sampleStep: RoutineStep = {
  id: 'step-1',
  routine_id: 'rout-1',
  step_no: 1,
  target: 'S20',
  routine_type: 'SS',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('listRoutines', () => {
  it('returns list when admin', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [sampleRoutine], error: null },
    ]);
    const list = await listRoutines(client);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Singles');
  });

  it('throws FORBIDDEN when non-admin', async () => {
    const client = createMockClient([nonAdminResponse()]);
    await expect(listRoutines(client)).rejects.toThrow(DataError);
    await expect(listRoutines(client)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  });
});

describe('getRoutineById', () => {
  it('returns routine + steps when found', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: sampleRoutine, error: null },
      { data: [sampleStep], error: null },
    ]);
    const result = await getRoutineById(client, 'rout-1');
    expect(result).not.toBeNull();
    expect(result!.routine.name).toBe('Singles');
    expect(result!.steps).toHaveLength(1);
    expect(result!.steps[0].target).toBe('S20');
    expect(result!.steps[0].routine_type).toBe('SS');
  });

  it('returns null when routine not found', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: null, error: null },
    ]);
    const result = await getRoutineById(client, 'nonexistent');
    expect(result).toBeNull();
  });
});

describe('createRoutine', () => {
  it('returns created row on success', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: sampleRoutine, error: null },
    ]);
    const created = await createRoutine(client, { name: 'Singles', description: 'S20 x 9' });
    expect(created.name).toBe('Singles');
    expect(created.description).toBe('S20 x 9');
  });
});

describe('updateRoutine', () => {
  it('returns updated row on success', async () => {
    const updated = { ...sampleRoutine, name: 'Updated' };
    const client = createMockClient([
      adminResponse(),
      { data: updated, error: null },
    ]);
    const result = await updateRoutine(client, 'rout-1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });
});

describe('deleteRoutine', () => {
  it('succeeds when row exists', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [{ id: 'rout-1' }], error: null },
    ]);
    await expect(deleteRoutine(client, 'rout-1')).resolves.toBeUndefined();
  });

  it('throws when routine is used in a session (FK violation)', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: null, error: { code: '23503' } },
    ]);
    await expect(deleteRoutine(client, 'rout-1')).rejects.toThrow(DataError);
  });
});

describe('listRoutineSteps', () => {
  it('returns steps ordered by step_no', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [sampleStep], error: null },
    ]);
    const list = await listRoutineSteps(client, 'rout-1');
    expect(list).toHaveLength(1);
    expect(list[0].target).toBe('S20');
  });
});

describe('setRoutineSteps', () => {
  it('replaces steps and returns array', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: null, error: null },
      { data: [sampleStep], error: null },
    ]);
    const result = await setRoutineSteps(client, 'rout-1', [
      { step_no: 1, target: 'S20' },
    ]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('accepts steps with routine_type (SS, SD, ST, C)', async () => {
    const stepSD = { ...sampleStep, routine_type: 'SD' as const, target: 'D16' };
    const client = createMockClient([
      adminResponse(),
      { data: null, error: null },
      { data: [stepSD], error: null },
    ]);
    const result = await setRoutineSteps(client, 'rout-1', [
      { step_no: 1, target: 'D16', routine_type: 'SD' },
    ]);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].routine_type).toBe('SD');
  });
});
