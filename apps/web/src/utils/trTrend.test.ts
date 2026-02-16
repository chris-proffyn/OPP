/**
 * Unit tests for computeTRTrend. P6 §9.4.
 * Pure function: last 2 avg vs previous 2 avg → up/down/stable; fewer than 4 scores → null.
 */

import { computeTRTrend } from './trTrend';

describe('computeTRTrend', () => {
  it('returns "up" when last 2 avg > previous 2 avg', () => {
    // recent (82+78)/2 = 80, previous (75+80)/2 = 77.5
    const scores = [
      { session_score: 82 },
      { session_score: 78 },
      { session_score: 75 },
      { session_score: 80 },
    ];
    expect(computeTRTrend(scores)).toBe('up');
  });

  it('returns "down" when last 2 avg < previous 2 avg', () => {
    // recent (70+72)/2 = 71, previous (80+78)/2 = 79
    const scores = [
      { session_score: 70 },
      { session_score: 72 },
      { session_score: 80 },
      { session_score: 78 },
    ];
    expect(computeTRTrend(scores)).toBe('down');
  });

  it('returns "stable" when last 2 avg === previous 2 avg', () => {
    const scores = [
      { session_score: 80 },
      { session_score: 80 },
      { session_score: 80 },
      { session_score: 80 },
    ];
    expect(computeTRTrend(scores)).toBe('stable');
  });

  it('returns null when fewer than 4 scores', () => {
    expect(computeTRTrend([])).toBeNull();
    expect(computeTRTrend([{ session_score: 80 }])).toBeNull();
    expect(computeTRTrend([{ session_score: 80 }, { session_score: 82 }])).toBeNull();
    expect(computeTRTrend([{ session_score: 80 }, { session_score: 82 }, { session_score: 78 }])).toBeNull();
  });

  it('uses first 4 elements only (most recent first)', () => {
    const scores = [
      { session_score: 90 },
      { session_score: 90 },
      { session_score: 70 },
      { session_score: 70 },
    ];
    expect(computeTRTrend(scores)).toBe('up');
  });
});
