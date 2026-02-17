/**
 * P7 — Unit tests for computeOMR pure function. Per implementation tasks §14.4.
 */

import { computeOMR } from './omr';
import type { EligibleMatchForOMR } from './omr';

describe('computeOMR', () => {
  it('returns null for no matches', () => {
    expect(computeOMR([])).toBeNull();
  });

  it('n=1: weighted average is the single MR', () => {
    expect(computeOMR([{ match_rating: 60, weight: 1 }])).toBe(60);
  });

  it('n≤5: weighted average of all (no trim)', () => {
    const matches: EligibleMatchForOMR[] = [
      { match_rating: 50, weight: 1 },
      { match_rating: 60, weight: 1 },
      { match_rating: 70, weight: 1 },
    ];
    expect(computeOMR(matches)).toBe(60); // (50+60+70)/3
  });

  it('n≤5 with different weights', () => {
    const matches: EligibleMatchForOMR[] = [
      { match_rating: 40, weight: 2 },
      { match_rating: 60, weight: 1 },
    ];
    expect(computeOMR(matches)).toBeCloseTo((40 * 2 + 60 * 1) / 3, 1);
  });

  it('n≥6: trims highest and lowest then weighted mean', () => {
    const matches: EligibleMatchForOMR[] = [
      { match_rating: 10, weight: 1 },
      { match_rating: 20, weight: 1 },
      { match_rating: 30, weight: 1 },
      { match_rating: 40, weight: 1 },
      { match_rating: 50, weight: 1 },
      { match_rating: 60, weight: 1 },
    ];
    const result = computeOMR(matches);
    expect(result).not.toBeNull();
    const trimmed = [20, 30, 40, 50];
    const expected = trimmed.reduce((a, b) => a + b, 0) / 4;
    expect(result).toBe(expected);
  });

  it('n=10: trim one highest one lowest', () => {
    const matches: EligibleMatchForOMR[] = Array.from({ length: 10 }, (_, i) => ({
      match_rating: 50 + i,
      weight: 1,
    }));
    const result = computeOMR(matches);
    expect(result).not.toBeNull();
    const sorted = [50, 51, 52, 53, 54, 55, 56, 57, 58, 59];
    const trimmed = sorted.slice(1, -1);
    const expected = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
    expect(result).toBe(expected);
  });
});
