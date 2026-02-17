/**
 * P8 §11.4 — Unit tests for voice utterance mapping (hit, miss, unknown).
 * voiceTextToSegment is a pure function; maps speech to segment code or null.
 */

import { voiceTextToSegment } from './voiceToSegment';

describe('voiceTextToSegment', () => {
  const stepTarget = 'S20';

  it('returns stepTarget for "hit" and hit-like words', () => {
    expect(voiceTextToSegment('hit', stepTarget)).toBe('S20');
    expect(voiceTextToSegment('Hit', stepTarget)).toBe('S20');
    expect(voiceTextToSegment('hit it', stepTarget)).toBe('S20');
    expect(voiceTextToSegment('yes', stepTarget)).toBe('S20');
    expect(voiceTextToSegment('got it', stepTarget)).toBe('S20');
    expect(voiceTextToSegment('in', stepTarget)).toBe('S20');
  });

  it('returns M (miss) for "miss" and miss-like words', () => {
    expect(voiceTextToSegment('miss', stepTarget)).toBe('M');
    expect(voiceTextToSegment('Missed', stepTarget)).toBe('M');
    expect(voiceTextToSegment('no', stepTarget)).toBe('M');
    expect(voiceTextToSegment('out', stepTarget)).toBe('M');
  });

  it('returns null for unknown or empty input', () => {
    expect(voiceTextToSegment('', stepTarget)).toBeNull();
    expect(voiceTextToSegment('   ', stepTarget)).toBeNull();
    expect(voiceTextToSegment('something random', stepTarget)).toBeNull();
    expect(voiceTextToSegment('nope', stepTarget)).toBeNull();
  });

  it('returns normalised segment for segment-like input', () => {
    expect(voiceTextToSegment('S20', stepTarget)).toBe('S20');
    expect(voiceTextToSegment('T5', stepTarget)).toBe('T5');
    expect(voiceTextToSegment('single 20', stepTarget)).toBe('S20');
  });
});
