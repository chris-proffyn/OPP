/**
 * Unit tests for scoring pure functions (round, routine, session). Per TR spec §6.
 * P5: levelChangeFromSessionScore per TR spec §8.
 */

import { levelChangeFromSessionScore, roundScore, routineScore, sessionScore } from './scoring';

describe('roundScore', () => {
  it('returns (hits / targetHits) × 100', () => {
    expect(roundScore(2, 3)).toBeCloseTo(66.666666667);
    expect(roundScore(3, 3)).toBe(100);
    expect(roundScore(0, 9)).toBe(0);
    expect(roundScore(9, 9)).toBe(100);
  });

  it('allows scores over 100%', () => {
    expect(roundScore(4, 3)).toBeCloseTo(133.333333333);
    expect(roundScore(9, 3)).toBe(300);
  });

  it('when targetHits is 0 (e.g. level 0): 0 hits → 0, any hit → 100', () => {
    expect(roundScore(0, 0)).toBe(0);
    expect(roundScore(1, 0)).toBe(100);
    expect(roundScore(5, 0)).toBe(100);
  });

  it('returns 0 when targetHits is negative', () => {
    expect(roundScore(1, -1)).toBe(0);
  });
});

describe('routineScore', () => {
  it('returns average of round scores', () => {
    expect(routineScore([50, 100])).toBe(75);
    expect(routineScore([0, 100])).toBe(50);
    expect(routineScore([100, 100, 100])).toBe(100);
  });

  it('returns 0 for empty array', () => {
    expect(routineScore([])).toBe(0);
  });

  it('returns the single value for one element', () => {
    expect(routineScore([66.67])).toBe(66.67);
  });
});

describe('sessionScore', () => {
  it('returns average of all round scores', () => {
    expect(sessionScore([50, 75, 100])).toBe(75);
    expect(sessionScore([22, 33, 11, 44])).toBe(27.5);
  });

  it('returns 0 for empty array', () => {
    expect(sessionScore([])).toBe(0);
  });

  it('matches routineScore when same inputs', () => {
    const scores = [50, 100, 75];
    expect(sessionScore(scores)).toBe(routineScore(scores));
  });
});

describe('levelChangeFromSessionScore', () => {
  it('returns −1 for <50%', () => {
    expect(levelChangeFromSessionScore(0)).toBe(-1);
    expect(levelChangeFromSessionScore(49)).toBe(-1);
    expect(levelChangeFromSessionScore(49.99)).toBe(-1);
  });

  it('returns 0 for 50–99%', () => {
    expect(levelChangeFromSessionScore(50)).toBe(0);
    expect(levelChangeFromSessionScore(99)).toBe(0);
    expect(levelChangeFromSessionScore(99.99)).toBe(0);
  });

  it('returns +1 for 100–199%', () => {
    expect(levelChangeFromSessionScore(100)).toBe(1);
    expect(levelChangeFromSessionScore(150)).toBe(1);
    expect(levelChangeFromSessionScore(199)).toBe(1);
    expect(levelChangeFromSessionScore(199.99)).toBe(1);
  });

  it('returns +2 for 200–299%', () => {
    expect(levelChangeFromSessionScore(200)).toBe(2);
    expect(levelChangeFromSessionScore(250)).toBe(2);
    expect(levelChangeFromSessionScore(299.99)).toBe(2);
  });

  it('returns +3 for ≥300%', () => {
    expect(levelChangeFromSessionScore(300)).toBe(3);
    expect(levelChangeFromSessionScore(400)).toBe(3);
  });

  it('edge cases per P5 §9.1: 49.9, 50, 99, 100, 299, 300', () => {
    expect(levelChangeFromSessionScore(49.9)).toBe(-1);
    expect(levelChangeFromSessionScore(50)).toBe(0);
    expect(levelChangeFromSessionScore(99)).toBe(0);
    expect(levelChangeFromSessionScore(100)).toBe(1);
    expect(levelChangeFromSessionScore(299)).toBe(2);
    expect(levelChangeFromSessionScore(300)).toBe(3);
  });
});
