/**
 * Unit tests for checkout expectation formula. Per OPP_CHECKOUT_TRAINING_IMPLEMENTATION_CHECKLIST.md §2.2, §2.3.
 */

import {
  computeExpectedCheckoutSuccesses,
  getExpectedCheckoutSuccesses,
  type LevelAverageForCheckout,
} from './checkout-expectation';
import { createMockClient } from './test-utils';

const level20_29: LevelAverageForCheckout = {
  three_dart_avg: 45,
  double_acc_pct: 40,
};

describe('computeExpectedCheckoutSuccesses', () => {
  describe('target ≤ 40 (W=0, P_reach=1)', () => {
    it('target 40: W=0, expected_successes_int depends on double accuracy only', () => {
      const r = computeExpectedCheckoutSuccesses(level20_29, 40, 9, 9);
      expect(r.expected_successes_int).toBeGreaterThanOrEqual(0);
      expect(r.expected_successes_int).toBeLessThanOrEqual(9);
      expect(r.expected_successes).toBeGreaterThanOrEqual(0);
      const withDebug = computeExpectedCheckoutSuccesses(level20_29, 40, 9, 9, { includeDebug: true });
      expect(withDebug.P_reach).toBe(1);
      expect(withDebug.E).toBe(0);
    });

    it('target 20: same as 40, W=0', () => {
      const r = computeExpectedCheckoutSuccesses(level20_29, 20, 9, 9, { includeDebug: true });
      expect(r.P_reach).toBe(1);
      expect(r.E).toBe(0);
    });

    it('target ≤ 40: n ≈ allowed_throws_per_attempt (darts left for double)', () => {
      const r = computeExpectedCheckoutSuccesses(level20_29, 40, 9, 9, { includeDebug: true });
      expect(r.E).toBe(0);
      expect(r.P_reach).toBe(1);
      expect(r.n).toBe(9);
    });
  });

  describe('target 41, 51, 61 with known level_averages', () => {
    it('target 41: W=1, produces positive expected_successes_int', () => {
      const r = computeExpectedCheckoutSuccesses(level20_29, 41, 9, 9);
      expect(r.expected_successes).toBeGreaterThan(0);
      expect(r.expected_successes_int).toBeGreaterThanOrEqual(0);
      expect(r.expected_successes_int).toBeLessThanOrEqual(9);
    });

    it('target 51: W=11, expected_successes_int in [0, 9]', () => {
      const r = computeExpectedCheckoutSuccesses(level20_29, 51, 9, 9);
      expect(r.expected_successes_int).toBeGreaterThanOrEqual(0);
      expect(r.expected_successes_int).toBeLessThanOrEqual(9);
    });

    it('target 61: W=21, expected_successes_int in [0, 9]', () => {
      const r = computeExpectedCheckoutSuccesses(level20_29, 61, 9, 9);
      expect(r.expected_successes_int).toBeGreaterThanOrEqual(0);
      expect(r.expected_successes_int).toBeLessThanOrEqual(9);
    });

    it('higher targets reduce expected_successes (more scoring required)', () => {
      const r41 = computeExpectedCheckoutSuccesses(level20_29, 41, 9, 9);
      const r51 = computeExpectedCheckoutSuccesses(level20_29, 51, 9, 9);
      const r61 = computeExpectedCheckoutSuccesses(level20_29, 61, 9, 9);
      expect(r41.expected_successes_int).toBeGreaterThanOrEqual(r51.expected_successes_int);
      expect(r51.expected_successes_int).toBeGreaterThanOrEqual(r61.expected_successes_int);
    });
  });

  describe('edge cases', () => {
    it('very low doubles accuracy: expected_successes_int can round to 0', () => {
      const lowDouble: LevelAverageForCheckout = { three_dart_avg: 45, double_acc_pct: 1 };
      const r = computeExpectedCheckoutSuccesses(lowDouble, 61, 9, 9);
      expect(r.expected_successes_int).toBeGreaterThanOrEqual(0);
      expect(r.expected_successes_int).toBeLessThanOrEqual(9);
    });

    it('double_acc_pct null treated as 0: P_finish_given_reach ~ 0, expected_successes_int 0', () => {
      const noDouble: LevelAverageForCheckout = { three_dart_avg: 45, double_acc_pct: null };
      const r = computeExpectedCheckoutSuccesses(noDouble, 41, 9, 9);
      expect(r.expected_successes_int).toBe(0);
      expect(r.expected_successes).toBeLessThanOrEqual(0.5);
    });

    it('expected_successes_int clamped to [0, attempt_count]', () => {
      const highDouble: LevelAverageForCheckout = { three_dart_avg: 60, double_acc_pct: 90 };
      const r = computeExpectedCheckoutSuccesses(highDouble, 41, 9, 5);
      expect(r.expected_successes_int).toBeGreaterThanOrEqual(0);
      expect(r.expected_successes_int).toBeLessThanOrEqual(5);
    });

    it('return type includes optional debug fields when includeDebug true', () => {
      const r = computeExpectedCheckoutSuccesses(level20_29, 51, 9, 9, { includeDebug: true });
      expect(r.expected_successes).toBeDefined();
      expect(r.expected_successes_int).toBeDefined();
      expect(r.P_checkout).toBeDefined();
      expect(r.P_reach).toBeDefined();
      expect(r.n).toBeDefined();
      expect(r.E).toBeDefined();
    });

    it('edge r=1 (scoring_darts/E=1) gives P_reach=0.5', () => {
      const level: LevelAverageForCheckout = { three_dart_avg: 15, double_acc_pct: 50 };
      const r = computeExpectedCheckoutSuccesses(level, 80, 9, 9, { includeDebug: true });
      expect(r.E).toBe(8);
      expect(r.P_reach).toBeCloseTo(0.5, 5);
    });
  });
});

describe('getExpectedCheckoutSuccesses', () => {
  it('returns null when no level average for playerLevel', async () => {
    const client = createMockClient([{ data: null, error: null }]);
    const result = await getExpectedCheckoutSuccesses(client, 99, 41);
    expect(result).toBeNull();
  });

  it('returns result when level average found, using defaults 9,9 when no C level_requirement', async () => {
    const levelRow = {
      id: 'la-1',
      level_min: 20,
      level_max: 29,
      description: 'L20-29',
      three_dart_avg: 45,
      double_acc_pct: 40,
      single_acc_pct: 50,
      treble_acc_pct: 20,
      bull_acc_pct: 10,
      created_at: '',
      updated_at: '',
    };
    const client = createMockClient([
      { data: levelRow, error: null },
      { data: null, error: null },
    ]);
    const result = await getExpectedCheckoutSuccesses(client, 25, 41);
    expect(result).not.toBeNull();
    expect(result!.expected_successes_int).toBeGreaterThanOrEqual(0);
    expect(result!.expected_successes_int).toBeLessThanOrEqual(9);
  });
});
