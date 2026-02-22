/**
 * Checkout expectation formula: expected number of checkout completions per step.
 * Per OPP_CHECKOUT_TRAINING_DOMAIN.md. Pure function for testing; use getExpectedCheckoutSuccesses for API.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getLevelAverageForLevel } from './level-averages';
import { getLevelRequirementByMinLevelAndRoutineType } from './level-requirements';

/** Level band stats required for the formula. Map doubles_accuracy_pct → double_acc_pct. */
export interface LevelAverageForCheckout {
  three_dart_avg: number;
  /** 0..100. Domain doc calls this doubles_accuracy_pct. */
  double_acc_pct: number | null;
}

export interface ExpectedCheckoutResult {
  expected_successes: number;
  expected_successes_int: number;
  P_checkout?: number;
  P_reach?: number;
  n?: number;
  E?: number;
}

const K_REACH = 3;

/**
 * Compute expected checkout completions for one step (target) given level band stats and config.
 * Step 1: W = max(target - 40, 0)
 * Step 2: ppd = three_dart_avg / 3
 * Step 3: E = W === 0 ? 0 : W / ppd
 * Step 4: P_reach via logistic on r = scoring_darts / E
 * Step 5: n = darts left for double, clamped
 * Step 6: P_finish_given_reach = 1 - (1 - pD)^n
 * Step 7: P_checkout = P_reach * P_finish_given_reach
 * Step 8: expected_successes, expected_successes_int clamped to [0, attempt_count]
 */
const DEBUG_PREFIX = '[OPP checkout expectation]';

export function computeExpectedCheckoutSuccesses(
  levelAverage: LevelAverageForCheckout,
  target: number,
  allowedThrowsPerAttempt: number = 9,
  attemptCount: number = 9,
  options?: { includeDebug?: boolean; logToConsole?: boolean }
): ExpectedCheckoutResult {
  const includeDebug = options?.includeDebug ?? false;
  const logToConsole = options?.logToConsole ?? false;
  const log = logToConsole ? (step: string, value: unknown) => console.log(DEBUG_PREFIX, step, value) : () => {};

  // Step 1
  const W = Math.max(target - 40, 0);
  log('Step 1 — W (points to reach ≤40):', { target, W, formula: 'max(target - 40, 0)' });

  // Step 2
  const ppd = levelAverage.three_dart_avg / 3;
  log('Step 2 — ppd (points per dart):', { three_dart_avg: levelAverage.three_dart_avg, ppd, formula: 'three_dart_avg / 3' });

  // Step 3
  const E = W === 0 ? 0 : W / ppd;
  log('Step 3 — E (expected darts to reach ≤40):', { W, ppd, E, formula: 'W / ppd' });

  // Step 4
  const scoring_darts = allowedThrowsPerAttempt - 1;
  let P_reach: number;
  if (E === 0) {
    P_reach = 1;
    log('Step 4 — P_reach (prob. reach range):', { scoring_darts, E, P_reach, note: 'E=0 so P_reach=1' });
  } else {
    const r = scoring_darts / E;
    P_reach = 1 / (1 + Math.exp(-K_REACH * (r - 1)));
    log('Step 4 — P_reach (prob. reach range):', { scoring_darts, E, r, P_reach, k: K_REACH, formula: '1 / (1 + exp(-k*(r-1)))' });
  }

  // Step 5
  let n = Math.round(allowedThrowsPerAttempt - Math.min(E, scoring_darts));
  n = Math.max(1, Math.min(n, allowedThrowsPerAttempt));
  log('Step 5 — n (darts left for double):', { allowedThrowsPerAttempt, E, scoring_darts, n, formula: 'round(allowed - min(E, scoring_darts)), clamped [1, allowed]' });

  // Step 6
  const pD = (levelAverage.double_acc_pct ?? 0) / 100;
  const P_finish_given_reach = 1 - Math.pow(1 - pD, n);
  log('Step 6 — P_finish_given_reach:', { double_acc_pct: levelAverage.double_acc_pct, pD, n, P_finish_given_reach, formula: '1 - (1 - pD)^n' });

  // Step 7
  const P_checkout = P_reach * P_finish_given_reach;
  log('Step 7 — P_checkout (prob. checkout in one attempt):', { P_reach, P_finish_given_reach, P_checkout, formula: 'P_reach * P_finish_given_reach' });

  // Step 8
  let expected_successes = attemptCount * P_checkout;
  let expected_successes_int = Math.round(expected_successes);
  expected_successes_int = Math.max(0, Math.min(expected_successes_int, attemptCount));
  log('Step 8 — expected_successes & int:', { attemptCount, P_checkout, expected_successes, expected_successes_int, formula: 'attempt_count * P_checkout, rounded, clamped [0, attempt_count]' });

  const result: ExpectedCheckoutResult = {
    expected_successes,
    expected_successes_int,
  };
  if (includeDebug) {
    result.P_checkout = P_checkout;
    result.P_reach = P_reach;
    result.n = n;
    result.E = E;
  }
  return result;
}

/**
 * Load level_averages for playerLevel and level_requirements (C) for defaults, then compute expected checkout successes.
 * Returns null if no level average row found for playerLevel.
 * Pass options.logToConsole: true to log each step of the calculation to the console.
 */
export async function getExpectedCheckoutSuccesses(
  client: SupabaseClient,
  playerLevel: number,
  target: number,
  allowedThrowsPerAttempt?: number,
  attemptCount?: number,
  options?: { logToConsole?: boolean }
): Promise<ExpectedCheckoutResult | null> {
  const row = await getLevelAverageForLevel(client, playerLevel);
  if (!row) {
    if (options?.logToConsole) {
      console.log(DEBUG_PREFIX, 'No level_averages row found for playerLevel:', playerLevel, '(no band with level_min <= level <= level_max)');
    }
    return null;
  }

  const minLevel = Math.floor(playerLevel / 10) * 10;
  const lrC = await getLevelRequirementByMinLevelAndRoutineType(client, minLevel, 'C');
  const allowed = allowedThrowsPerAttempt ?? lrC?.allowed_throws_per_attempt ?? 9;
  const attempts = attemptCount ?? lrC?.attempt_count ?? 9;

  if (options?.logToConsole) {
    console.log(DEBUG_PREFIX, 'Inputs (from level_averages + level_requirements):', {
      playerLevel,
      target,
      levelBand: `level_min <= ${playerLevel} <= level_max`,
      three_dart_avg: row.three_dart_avg,
      double_acc_pct: row.double_acc_pct ?? null,
      allowed_throws_per_attempt: allowed,
      attempt_count: attempts,
    });
  }

  return computeExpectedCheckoutSuccesses(
    { three_dart_avg: row.three_dart_avg, double_acc_pct: row.double_acc_pct },
    target,
    allowed,
    attempts,
    { includeDebug: options?.logToConsole ?? false, logToConsole: options?.logToConsole ?? false }
  );
}
