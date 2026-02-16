/**
 * Unit tests for dart scores (insertDartScore, insertDartScores). Per P4 §11.2.
 * Uses mocked Supabase client.
 */

import { DataError } from './errors';
import { insertDartScore, insertDartScores } from './dart-scores';
import type { DartScore, DartScorePayload } from './types';
import { createMockClient } from './test-utils';

const samplePayload: DartScorePayload = {
  player_id: 'pid-1',
  training_id: 'run-1',
  routine_id: 'rout-1',
  routine_no: 1,
  step_no: 1,
  dart_no: 1,
  target: 'S20',
  actual: 'S20',
  result: 'H',
};

const sampleRow: DartScore = {
  id: 'ds-1',
  ...samplePayload,
  created_at: '2026-02-15T10:00:00Z',
};

describe('insertDartScore', () => {
  it('returns created row on success', async () => {
    const client = createMockClient([
      { data: sampleRow, error: null },
    ]);
    const result = await insertDartScore(client, samplePayload);
    expect(result).toEqual(sampleRow);
    expect(result.player_id).toBe('pid-1');
    expect(result.training_id).toBe('run-1');
    expect(result.routine_id).toBe('rout-1');
    expect(result.routine_no).toBe(1);
    expect(result.step_no).toBe(1);
    expect(result.dart_no).toBe(1);
    expect(result.target).toBe('S20');
    expect(result.actual).toBe('S20');
    expect(result.result).toBe('H');
  });

  it('accepts result M (miss)', async () => {
    const payload: DartScorePayload = { ...samplePayload, actual: 'M', result: 'M' };
    const row: DartScore = { id: 'ds-2', ...payload, created_at: '2026-02-15T10:01:00Z' };
    const client = createMockClient([{ data: row, error: null }]);
    const result = await insertDartScore(client, payload);
    expect(result.result).toBe('M');
  });

  it('throws VALIDATION for invalid result', async () => {
    const client = createMockClient([]);
    await expect(
      insertDartScore(client, { ...samplePayload, result: 'X' as 'H' })
    ).rejects.toThrow(DataError);
    await expect(
      insertDartScore(client, { ...samplePayload, result: 'X' as 'H' })
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });
});

describe('insertDartScores', () => {
  it('returns created rows on bulk insert', async () => {
    const payloads: DartScorePayload[] = [
      samplePayload,
      { ...samplePayload, dart_no: 2, result: 'M', actual: 'M' },
      { ...samplePayload, dart_no: 3, result: 'H', actual: 'S20' },
    ];
    const rows: DartScore[] = payloads.map((p, i) => ({
      id: `ds-${i + 1}`,
      ...p,
      created_at: '2026-02-15T10:00:00Z',
    }));
    const client = createMockClient([{ data: rows, error: null }]);
    const result = await insertDartScores(client, payloads);
    expect(result).toHaveLength(3);
    expect(result[0].result).toBe('H');
    expect(result[1].result).toBe('M');
    expect(result[2].result).toBe('H');
  });

  it('returns empty array when payloads empty', async () => {
    const client = createMockClient([]);
    const result = await insertDartScores(client, []);
    expect(result).toEqual([]);
  });

  it('throws VALIDATION when any result invalid', async () => {
    const client = createMockClient([]);
    await expect(
      insertDartScores(client, [samplePayload, { ...samplePayload, dart_no: 2, result: 'X' as 'H' }])
    ).rejects.toThrow(DataError);
  });
});
