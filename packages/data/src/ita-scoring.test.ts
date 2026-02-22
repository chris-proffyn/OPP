/**
 * Unit tests for ITA scoring pure functions. Per OPP_TRAINING_RATING_ENGINE_SPEC_v2.md §4.
 */

import {
  computeCheckoutRating,
  computeDoublesRating,
  computeITAScore,
  computeSinglesRating,
} from './ita-scoring';

describe('computeSinglesRating', () => {
  it('returns average of segment scores', () => {
    expect(computeSinglesRating([22, 33, 11, 33, 44])).toBeCloseTo(28.6);
    expect(computeSinglesRating([22, 33, 11, 33, 44])).toBe((22 + 33 + 11 + 33 + 44) / 5);
  });

  it('returns 0 for empty array', () => {
    expect(computeSinglesRating([])).toBe(0);
  });

  it('returns single segment score', () => {
    expect(computeSinglesRating([26.4])).toBe(26.4);
  });
});

describe('computeDoublesRating', () => {
  it('returns 100 for 1 dart', () => {
    expect(computeDoublesRating(1)).toBe(100);
    expect(computeDoublesRating(0.5)).toBe(100);
  });

  it('returns scale values at integers', () => {
    expect(computeDoublesRating(2)).toBe(90);
    expect(computeDoublesRating(3)).toBe(70);
    expect(computeDoublesRating(4)).toBe(50);
    expect(computeDoublesRating(5)).toBe(30);
    expect(computeDoublesRating(6)).toBe(0);
    expect(computeDoublesRating(10)).toBe(0);
  });

  it('interpolates: 5.7 darts → ~9 (spec §4.3)', () => {
    const r = computeDoublesRating(5.7);
    expect(r).toBeCloseTo(9, 0);
    expect(r).toBeGreaterThanOrEqual(8.5);
    expect(r).toBeLessThanOrEqual(9.5);
  });
});

describe('computeCheckoutRating', () => {
  it('returns 100 for minimum (0 above min)', () => {
    expect(computeCheckoutRating(0)).toBe(100);
  });

  it('returns scale at integer steps', () => {
    expect(computeCheckoutRating(1)).toBe(80);
    expect(computeCheckoutRating(2)).toBe(60);
    expect(computeCheckoutRating(3)).toBe(40);
    expect(computeCheckoutRating(4)).toBe(20);
  });

  it('returns 0 for min+10 or more', () => {
    expect(computeCheckoutRating(10)).toBe(0);
    expect(computeCheckoutRating(15)).toBe(0);
  });

  it('interpolates between 4 and 10', () => {
    const r = computeCheckoutRating(7);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(20);
  });
});

describe('computeITAScore', () => {
  it('returns (3×S + 2×D + 1×C)/6 rounded down (spec §4.5)', () => {
    expect(computeITAScore(26.4, 9, 80)).toBe(29);
    const raw = (3 * 26.4 + 2 * 9 + 1 * 80) / 6;
    expect(raw).toBeCloseTo(29.53);
    expect(computeITAScore(26.4, 9, 80)).toBe(Math.floor(raw));
  });

  it('rounds down', () => {
    expect(computeITAScore(30, 30, 30)).toBe(30);
    expect(computeITAScore(26.4, 9, 80)).toBe(29);
  });

  it('returns 0 when all ratings are 0', () => {
    expect(computeITAScore(0, 0, 0)).toBe(0);
  });

  it('handles fractional result by flooring', () => {
    expect(computeITAScore(10, 10, 10)).toBe(10);
    expect(computeITAScore(1, 1, 1)).toBe(1);
  });

  it('uses only types present when typesPresent is given (e.g. SS+SD+ST, no Checkout)', () => {
    // (3*30 + 2*20 + 2*10) / (3+2+2) = 150/7 ≈ 21.43 → 21
    expect(computeITAScore(30, 20, 0, 10, ['Singles', 'Doubles', 'Trebles'])).toBe(21);
  });
});

describe('ITA pure functions — OPP_TRAINING_RATING_ENGINE_SPEC_v2.md §4 examples (P5 §9.4)', () => {
  it('Singles: segment scores average → Singles rating', () => {
    const segmentScores = [22, 33, 11, 33, 44];
    expect(computeSinglesRating(segmentScores)).toBeCloseTo(28.6);
  });

  it('Doubles: 5.7 darts → rating ~9 (spec §4.3)', () => {
    const r = computeDoublesRating(5.7);
    expect(r).toBeGreaterThanOrEqual(8.5);
    expect(r).toBeLessThanOrEqual(9.5);
  });

  it('Checkout: scale min→100, min+1→80, min+2→60, min+3→40, min+4→20', () => {
    expect(computeCheckoutRating(0)).toBe(100);
    expect(computeCheckoutRating(1)).toBe(80);
    expect(computeCheckoutRating(2)).toBe(60);
    expect(computeCheckoutRating(3)).toBe(40);
    expect(computeCheckoutRating(4)).toBe(20);
  });

  it('ITA score: Singles 26.4%, Doubles 9, Checkout 80 → 29.53 → 29 (spec §4.5)', () => {
    const raw = (3 * 26.4 + 2 * 9 + 1 * 80) / 6;
    expect(raw).toBeCloseTo(29.53);
    expect(computeITAScore(26.4, 9, 80)).toBe(29);
  });
});
