/**
 * Unit tests for player step runs (checkout per-step outcomes).
 */

import type { PlayerStepRun } from './types';
import { DataError } from './errors';
import {
  createPlayerStepRun,
  updatePlayerStepRun,
  listPlayerStepRunsByTrainingId,
  getPlayerStepRunByTrainingRoutineStep,
} from './player-step-runs';
import { createMockClient } from './test-utils';

const sampleRun: PlayerStepRun = {
  id: 'psr-1',
  player_id: 'pid-1',
  training_id: 'run-1',
  routine_id: 'rout-1',
  routine_no: 1,
  step_no: 1,
  routine_step_id: null,
  checkout_target: 41,
  expected_successes: 4.5,
  expected_successes_int: 5,
  actual_successes: 0,
  step_score: null,
  completed_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('createPlayerStepRun', () => {
  it('returns created row', async () => {
    const client = createMockClient([{ data: sampleRun, error: null }]);
    const result = await createPlayerStepRun(client, {
      player_id: 'pid-1',
      training_id: 'run-1',
      routine_id: 'rout-1',
      routine_no: 1,
      step_no: 1,
      checkout_target: 41,
      expected_successes: 4.5,
      expected_successes_int: 5,
    });
    expect(result.id).toBe('psr-1');
    expect(result.expected_successes_int).toBe(5);
    expect(result.actual_successes).toBe(0);
  });
});

describe('updatePlayerStepRun', () => {
  it('returns updated row with actual_successes, step_score, completed_at', async () => {
    const updated = { ...sampleRun, actual_successes: 5, step_score: 100, completed_at: '2026-01-01T01:00:00Z' };
    const client = createMockClient([{ data: updated, error: null }]);
    const result = await updatePlayerStepRun(client, 'psr-1', {
      actual_successes: 5,
      step_score: 100,
      completed_at: '2026-01-01T01:00:00Z',
    });
    expect(result.actual_successes).toBe(5);
    expect(result.step_score).toBe(100);
    expect(result.completed_at).toBe('2026-01-01T01:00:00Z');
  });

  it('throws NOT_FOUND when no row', async () => {
    const client = createMockClient([{ data: null, error: { code: 'PGRST116' } }]);
    await expect(updatePlayerStepRun(client, 'bad-id', { step_score: 50 })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('listPlayerStepRunsByTrainingId', () => {
  it('returns step runs ordered by routine_no, step_no', async () => {
    const client = createMockClient([{ data: [sampleRun], error: null }]);
    const list = await listPlayerStepRunsByTrainingId(client, 'run-1');
    expect(list).toHaveLength(1);
    expect(list[0].training_id).toBe('run-1');
  });
});

describe('getPlayerStepRunByTrainingRoutineStep', () => {
  it('returns row when found', async () => {
    const client = createMockClient([{ data: sampleRun, error: null }]);
    const result = await getPlayerStepRunByTrainingRoutineStep(client, 'run-1', 'rout-1', 1);
    expect(result).not.toBeNull();
    expect(result!.step_no).toBe(1);
  });

  it('returns null when not found', async () => {
    const client = createMockClient([{ data: null, error: null }]);
    const result = await getPlayerStepRunByTrainingRoutineStep(client, 'run-1', 'rout-1', 99);
    expect(result).toBeNull();
  });
});
