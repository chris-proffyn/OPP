/**
 * Unit tests for segment helpers: normaliseSegment (format xY, 25, Bull), isDoubleOrBull, segmentToScore.
 */

import { isDoubleOrBull, normaliseSegment, segmentCodeToShortSpoken, segmentCodeToSpoken, segmentToScore } from './segments';

describe('normaliseSegment (segment format xY, 25, Bull)', () => {
  it('normalises S/D/T + number to canonical xY', () => {
    expect(normaliseSegment('S17')).toBe('S17');
    expect(normaliseSegment('s17')).toBe('S17');
    expect(normaliseSegment('D20')).toBe('D20');
    expect(normaliseSegment('T7')).toBe('T7');
    expect(normaliseSegment('single 17')).toBe('S17');
    expect(normaliseSegment('double 20')).toBe('D20');
    expect(normaliseSegment('treble 7')).toBe('T7');
  });

  it('normalises 25 and Bull', () => {
    expect(normaliseSegment('25')).toBe('25');
    expect(normaliseSegment('Bull')).toBe('Bull');
    expect(normaliseSegment('bullseye')).toBe('Bull');
  });

  it('normalises miss to M', () => {
    expect(normaliseSegment('M')).toBe('M');
    expect(normaliseSegment('MISS')).toBe('M');
  });
});

describe('isDoubleOrBull', () => {
  it('returns true for Bull (any casing)', () => {
    expect(isDoubleOrBull('Bull')).toBe(true);
    expect(isDoubleOrBull('bull')).toBe(true);
    expect(isDoubleOrBull('bullseye')).toBe(true);
  });

  it('returns true for D1–D20', () => {
    expect(isDoubleOrBull('D1')).toBe(true);
    expect(isDoubleOrBull('D9')).toBe(true);
    expect(isDoubleOrBull('D20')).toBe(true);
    expect(isDoubleOrBull('d18')).toBe(true);
  });

  it('returns false for singles and trebles', () => {
    expect(isDoubleOrBull('S18')).toBe(false);
    expect(isDoubleOrBull('S9')).toBe(false);
    expect(isDoubleOrBull('T20')).toBe(false);
    expect(isDoubleOrBull('25')).toBe(false);
  });

  it('returns false for miss and empty', () => {
    expect(isDoubleOrBull('M')).toBe(false);
    expect(isDoubleOrBull('')).toBe(false);
  });
});

describe('segmentCodeToSpoken (prompting and feedback)', () => {
  it('maps segment codes to spoken form', () => {
    expect(segmentCodeToSpoken('S20')).toBe('Single 20');
    expect(segmentCodeToSpoken('D16')).toBe('Double 16');
    expect(segmentCodeToSpoken('T5')).toBe('Treble 5');
    expect(segmentCodeToSpoken('25')).toBe('25');
    expect(segmentCodeToSpoken('Bull')).toBe('Bull');
    expect(segmentCodeToSpoken('M')).toBe('Miss');
  });

  it('handles edge cases: empty, S1/D1/T1, normalised input', () => {
    expect(segmentCodeToSpoken('')).toBe('');
    expect(segmentCodeToSpoken('   ')).toBe('');
    expect(segmentCodeToSpoken('S1')).toBe('Single 1');
    expect(segmentCodeToSpoken('D1')).toBe('Double 1');
    expect(segmentCodeToSpoken('T1')).toBe('Treble 1');
    expect(segmentCodeToSpoken('single 20')).toBe('Single 20');
  });
});

describe('segmentCodeToShortSpoken (visit read-back)', () => {
  it('maps segment codes to short form (numbers for singles)', () => {
    expect(segmentCodeToShortSpoken('S20')).toBe('20');
    expect(segmentCodeToShortSpoken('S5')).toBe('5');
    expect(segmentCodeToShortSpoken('T5')).toBe('Treble 5');
    expect(segmentCodeToShortSpoken('D16')).toBe('Double 16');
    expect(segmentCodeToShortSpoken('25')).toBe('25');
    expect(segmentCodeToShortSpoken('Bull')).toBe('Bull');
    expect(segmentCodeToShortSpoken('M')).toBe('Miss');
  });
});

describe('segmentToScore (checkout remaining)', () => {
  it('D9 scores 18 for valid checkout finish', () => {
    expect(segmentToScore('D9')).toBe(18);
  });
  it('S18 scores 18 but is not valid finish', () => {
    expect(segmentToScore('S18')).toBe(18);
    expect(isDoubleOrBull('S18')).toBe(false);
  });
});
