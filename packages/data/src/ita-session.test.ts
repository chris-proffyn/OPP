/**
 * Unit tests for ITA session: getRoutineITAType, computeITARatingsFromDartScores.
 */

import { computeDoublesRating } from './ita-scoring';
import {
  computeITARatingsFromDartScores,
  getRoutineITAType,
  type DartRow,
  type ITARoutineInfo,
} from './ita-session';

describe('getRoutineITAType', () => {
  it('identifies Singles by name', () => {
    expect(getRoutineITAType('Singles')).toBe('Singles');
    expect(getRoutineITAType('  singles  ')).toBe('Singles');
    expect(getRoutineITAType('ITA Singles')).toBe('Singles');
  });

  it('identifies Doubles by name', () => {
    expect(getRoutineITAType('Doubles')).toBe('Doubles');
    expect(getRoutineITAType('DOUBLES')).toBe('Doubles');
  });

  it('identifies Checkout by name', () => {
    expect(getRoutineITAType('Checkout')).toBe('Checkout');
    expect(getRoutineITAType('Checkouts')).toBe('Checkout');
  });

  it('returns null for non-ITA names', () => {
    expect(getRoutineITAType('Warm up')).toBeNull();
    expect(getRoutineITAType('')).toBeNull();
  });
});

describe('computeITARatingsFromDartScores', () => {
  it('computes Singles from segment scores (9 darts per step)', () => {
    const routines: ITARoutineInfo[] = [
      { routine_no: 1, type: 'Singles', stepCount: 5 },
      { routine_no: 2, type: 'Doubles', stepCount: 5 },
      { routine_no: 3, type: 'Checkout', stepCount: 5 },
    ];
    const darts: DartRow[] = [];
    for (let step = 1; step <= 5; step++) {
      const hits = step === 1 ? 2 : step === 2 ? 3 : step === 3 ? 1 : step === 4 ? 3 : 4;
      for (let d = 1; d <= 9; d++) {
        darts.push({ routine_no: 1, step_no: step, dart_no: d, result: d <= hits ? 'H' : 'M' });
      }
    }
    const r = computeITARatingsFromDartScores(routines, darts);
    const segmentScores = [2 / 9 * 100, 3 / 9 * 100, 1 / 9 * 100, 3 / 9 * 100, 4 / 9 * 100];
    const expectedSingles = segmentScores.reduce((a, b) => a + b, 0) / 5;
    expect(r.singlesRating).toBeCloseTo(expectedSingles);
    expect(r.itaScore).toBeGreaterThanOrEqual(0);
  });

  it('computes Doubles from darts to first H per step', () => {
    const routines: ITARoutineInfo[] = [
      { routine_no: 1, type: 'Singles', stepCount: 1 },
      { routine_no: 2, type: 'Doubles', stepCount: 2 },
      { routine_no: 3, type: 'Checkout', stepCount: 1 },
    ];
    const darts: DartRow[] = [];
    for (let step = 1; step <= 2; step++) {
      const firstHitAt = step === 1 ? 2 : 1;
      for (let d = 1; d <= 9; d++) {
        darts.push({ routine_no: 2, step_no: step, dart_no: d, result: d === firstHitAt ? 'H' : 'M' });
      }
    }
    const r = computeITARatingsFromDartScores(routines, darts);
    expect(r.doublesRating).toBeGreaterThan(0);
    const avgDarts = (2 + 1) / 2;
    expect(r.doublesRating).toBe(computeDoublesRating(avgDarts));
  });

  it('computes ITA score from all three ratings', () => {
    const routines: ITARoutineInfo[] = [
      { routine_no: 1, type: 'Singles', stepCount: 1 },
      { routine_no: 2, type: 'Doubles', stepCount: 1 },
      { routine_no: 3, type: 'Checkout', stepCount: 1 },
    ];
    const darts: DartRow[] = [];
    for (let d = 1; d <= 9; d++) darts.push({ routine_no: 1, step_no: 1, dart_no: d, result: d <= 2 ? 'H' : 'M' });
    for (let d = 1; d <= 9; d++) darts.push({ routine_no: 2, step_no: 1, dart_no: d, result: d === 1 ? 'H' : 'M' });
    for (let d = 1; d <= 3; d++) darts.push({ routine_no: 3, step_no: 1, dart_no: d, result: 'M' });
    const r = computeITARatingsFromDartScores(routines, darts);
    expect(r.itaScore).toBe(Math.floor((3 * r.singlesRating + 2 * r.doublesRating + 1 * r.checkoutRating) / 6));
  });
});
