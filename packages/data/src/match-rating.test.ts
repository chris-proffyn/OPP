/**
 * P7 — Unit tests for match rating (MR) pure functions. Per implementation tasks §14.3.
 */

import { computeMatchRating, getFormatWeight, isOpponentInBand } from './match-rating';

describe('computeMatchRating (placeholder)', () => {
  it('returns value in 0–100 for win with high leg share', () => {
    const mr = computeMatchRating({
      opponentStrength: 50,
      legShare: 0.8,
    });
    expect(mr).toBeGreaterThanOrEqual(0);
    expect(mr).toBeLessThanOrEqual(100);
    expect(mr).toBeGreaterThan(50);
  });

  it('returns value in 0–100 for loss with low leg share', () => {
    const mr = computeMatchRating({
      opponentStrength: 50,
      legShare: 0.2,
    });
    expect(mr).toBeGreaterThanOrEqual(0);
    expect(mr).toBeLessThanOrEqual(100);
    expect(mr).toBeLessThan(50);
  });

  it('returns ~50 for equal legs (0.5 leg share) vs 50 strength', () => {
    const mr = computeMatchRating({
      opponentStrength: 50,
      legShare: 0.5,
    });
    expect(mr).toBeGreaterThanOrEqual(48);
    expect(mr).toBeLessThanOrEqual(52);
  });

  it('beats stronger opponent gives higher MR than beating weaker', () => {
    const mrStrong = computeMatchRating({ opponentStrength: 80, legShare: 0.6 });
    const mrWeak = computeMatchRating({ opponentStrength: 20, legShare: 0.6 });
    expect(mrStrong).toBeGreaterThan(mrWeak);
  });

  it('clamps to 0–100', () => {
    const mrLow = computeMatchRating({ opponentStrength: 0, legShare: 0 });
    const mrHigh = computeMatchRating({ opponentStrength: 100, legShare: 1 });
    expect(mrLow).toBeGreaterThanOrEqual(0);
    expect(mrHigh).toBeLessThanOrEqual(100);
  });
});

describe('getFormatWeight', () => {
  it('returns 1.0, 1.1, 1.2, 1.3 for 5, 7, 9, 11', () => {
    expect(getFormatWeight(5)).toBe(1.0);
    expect(getFormatWeight(7)).toBe(1.1);
    expect(getFormatWeight(9)).toBe(1.2);
    expect(getFormatWeight(11)).toBe(1.3);
  });

  it('returns 1.0 for unknown format', () => {
    expect(getFormatWeight(3)).toBe(1.0);
    expect(getFormatWeight(13)).toBe(1.0);
  });
});

describe('isOpponentInBand', () => {
  it('returns true when opponent in same decade', () => {
    expect(isOpponentInBand(24, 26)).toBe(true);
    expect(isOpponentInBand(30, 39)).toBe(true);
  });

  it('returns true when opponent in ±1 decade', () => {
    expect(isOpponentInBand(25, 35)).toBe(true);
    expect(isOpponentInBand(35, 25)).toBe(true);
  });

  it('returns false when opponent outside ±1 decade', () => {
    expect(isOpponentInBand(25, 45)).toBe(false);
    expect(isOpponentInBand(50, 20)).toBe(false);
  });

  it('returns false when either rating is null', () => {
    expect(isOpponentInBand(null, 30)).toBe(false);
    expect(isOpponentInBand(30, null)).toBe(false);
    expect(isOpponentInBand(null, null)).toBe(false);
  });
});
