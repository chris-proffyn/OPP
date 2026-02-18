/**
 * Unit tests for level averages data layer (getLevelAverageForLevel, getExpectedHitsForSingleDartRoutine).
 * Expected-hit calculation from level_averages + routine_type + darts_allowed.
 */

import {
  getExpectedHitsForSingleDartRoutine,
  getLevelAverageForLevel,
} from './level-averages';
import { createMockClient } from './test-utils';

const sampleLevelAverage = {
  id: 'la-1',
  level_min: 20,
  level_max: 29,
  description: 'Level 20-29',
  three_dart_avg: 45,
  single_acc_pct: 40,
  double_acc_pct: 20,
  treble_acc_pct: 15,
  bull_acc_pct: 10,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('getLevelAverageForLevel', () => {
  it('returns level average row when level falls in band', async () => {
    const client = createMockClient([{ data: sampleLevelAverage, error: null }]);
    const result = await getLevelAverageForLevel(client, 25);
    expect(result).not.toBeNull();
    expect(result!.level_min).toBe(20);
    expect(result!.level_max).toBe(29);
    expect(result!.single_acc_pct).toBe(40);
    expect(result!.double_acc_pct).toBe(20);
    expect(result!.treble_acc_pct).toBe(15);
  });

  it('returns null when no band found', async () => {
    const client = createMockClient([{ data: null, error: null }]);
    const result = await getLevelAverageForLevel(client, 99);
    expect(result).toBeNull();
  });
});

describe('getExpectedHitsForSingleDartRoutine', () => {
  it('returns expected hits for SS (single_acc_pct): darts_allowed * single_acc_pct / 100', async () => {
    const client = createMockClient([{ data: sampleLevelAverage, error: null }]);
    const expected = await getExpectedHitsForSingleDartRoutine(client, 25, 'SS', 9);
    expect(expected).toBe(3.6); // 9 * 40 / 100
  });

  it('returns expected hits for SD (double_acc_pct): darts_allowed * double_acc_pct / 100', async () => {
    const client = createMockClient([{ data: sampleLevelAverage, error: null }]);
    const expected = await getExpectedHitsForSingleDartRoutine(client, 25, 'SD', 9);
    expect(expected).toBe(1.8); // 9 * 20 / 100
  });

  it('returns expected hits for ST (treble_acc_pct): darts_allowed * treble_acc_pct / 100', async () => {
    const client = createMockClient([{ data: sampleLevelAverage, error: null }]);
    const expected = await getExpectedHitsForSingleDartRoutine(client, 25, 'ST', 9);
    expect(expected).toBe(1.35); // 9 * 15 / 100, rounded to 2 decimals
  });

  it('returns null for routine_type C (checkout)', async () => {
    const client = createMockClient([]);
    const expected = await getExpectedHitsForSingleDartRoutine(client, 25, 'C', 9);
    expect(expected).toBeNull();
  });

  it('returns null when level average not found', async () => {
    const client = createMockClient([{ data: null, error: null }]);
    const expected = await getExpectedHitsForSingleDartRoutine(client, 99, 'SS', 9);
    expect(expected).toBeNull();
  });

  it('returns null when segment accuracy missing for routine type', async () => {
    const rowNoSingle = { ...sampleLevelAverage, single_acc_pct: null };
    const client = createMockClient([{ data: rowNoSingle, error: null }]);
    const expected = await getExpectedHitsForSingleDartRoutine(client, 25, 'SS', 9);
    expect(expected).toBeNull();
  });

  it('rounds expected hits to 2 decimal places', async () => {
    const client = createMockClient([{ data: { ...sampleLevelAverage, single_acc_pct: 33.33 }, error: null }]);
    const expected = await getExpectedHitsForSingleDartRoutine(client, 25, 'SS', 9);
    expect(expected).toBe(3); // 9 * 33.33 / 100 = 2.9997 -> 3.00
  });
});
