/**
 * P7 — Unit tests for computePR pure function. Per implementation tasks §14.5.
 */

import { computePR } from './pr';

describe('computePR', () => {
  it('returns null when both TR and OMR are null', () => {
    expect(computePR(null, null)).toBeNull();
  });

  it('TR only: PR = TR clamped 1–99', () => {
    expect(computePR(24, null)).toBe(24);
    expect(computePR(50, null)).toBe(50);
    expect(computePR(99, null)).toBe(99);
    expect(computePR(1, null)).toBe(1);
    expect(computePR(0, null)).toBe(1);
    expect(computePR(100, null)).toBe(99);
  });

  it('OMR only: PR = OMR clamped 1–99', () => {
    expect(computePR(null, 55)).toBe(55);
    expect(computePR(null, 1)).toBe(1);
    expect(computePR(null, 99)).toBe(99);
  });

  it('both present: PR = (TR + OMR) / 2 when α=β=1', () => {
    expect(computePR(20, 40)).toBe(30);
    expect(computePR(50, 50)).toBe(50);
  });

  it('both present: result clamped 1–99', () => {
    expect(computePR(1, 1)).toBe(1);
    expect(computePR(99, 99)).toBe(99);
  });
});
