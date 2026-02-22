/**
 * Unit tests for ITA session: getRoutineITAType, isITASession, hasCompletedITA, computeITARatingsFromDartScores.
 */

import { computeDoublesRating } from './ita-scoring';
import {
  computeITARatingsFromDartScores,
  getRoutineITAType,
  hasCompletedITA,
  isITASession,
  type DartRow,
  type ITARoutineInfo,
} from './ita-session';

describe('isITASession', () => {
  it('returns true for "ITA" and "Initial Training Assessment" (case-insensitive)', () => {
    expect(isITASession('ITA')).toBe(true);
    expect(isITASession('ita')).toBe(true);
    expect(isITASession('  ita  ')).toBe(true);
    expect(isITASession('Initial Training Assessment')).toBe(true);
    expect(isITASession('INITIAL TRAINING ASSESSMENT')).toBe(true);
    expect(isITASession('  initial training assessment  ')).toBe(true);
  });

  it('returns false for other session names', () => {
    expect(isITASession('Singles')).toBe(false);
    expect(isITASession('Day 1')).toBe(false);
    expect(isITASession('')).toBe(false);
    expect(isITASession('ITA Practice')).toBe(false);
  });
});

describe('hasCompletedITA', () => {
  it('returns false for null or undefined player', () => {
    expect(hasCompletedITA(null)).toBe(false);
    expect(hasCompletedITA(undefined)).toBe(false);
  });

  it('returns false when ita_completed_at is null or missing', () => {
    expect(hasCompletedITA({})).toBe(false);
    expect(hasCompletedITA({ ita_completed_at: null })).toBe(false);
    expect(hasCompletedITA({ baseline_rating: 50 })).toBe(false);
  });

  it('returns true when ita_completed_at is set', () => {
    expect(hasCompletedITA({ ita_completed_at: '2024-01-15T12:00:00Z' })).toBe(true);
    expect(hasCompletedITA({ ita_completed_at: '' })).toBe(true);
  });
});

describe('getRoutineITAType', () => {
  it('maps SS (single segment) to Singles', () => {
    expect(getRoutineITAType('SS')).toBe('Singles');
  });

  it('maps SD (double) to Doubles', () => {
    expect(getRoutineITAType('SD')).toBe('Doubles');
  });

  it('maps ST (treble) to Trebles', () => {
    expect(getRoutineITAType('ST')).toBe('Trebles');
  });

  it('maps C (checkout) to Checkout', () => {
    expect(getRoutineITAType('C')).toBe('Checkout');
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
