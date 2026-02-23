/**
 * Unit tests for SessionGameContext pure helpers (§10).
 * Covers: levelToDecade, getDartsPerStep, getLevelReqForStep, hasAnyCheckoutStep,
 * computeRemaining, computeCheckoutBustReason.
 */

import type { LevelRequirement, RoutineStep } from '@opp/data';
import {
  computeCheckoutBustReason,
  computeRemaining,
  getDartsPerStep,
  getLevelReqForStep,
  hasAnyCheckoutStep,
  levelToDecade,
  type RoutineWithSteps,
} from './sessionGameState';

describe('levelToDecade', () => {
  it('floors level to decade', () => {
    expect(levelToDecade(0)).toBe(0);
    expect(levelToDecade(9)).toBe(0);
    expect(levelToDecade(10)).toBe(10);
    expect(levelToDecade(15)).toBe(10);
    expect(levelToDecade(19)).toBe(10);
    expect(levelToDecade(20)).toBe(20);
    expect(levelToDecade(45)).toBe(40);
  });

  it('returns 0 for null or NaN', () => {
    expect(levelToDecade(null)).toBe(0);
    expect(levelToDecade(NaN)).toBe(0);
  });
});

describe('getDartsPerStep', () => {
  it('returns 3 for non-C when lr is null', () => {
    expect(getDartsPerStep(null, 'SS')).toBe(3);
    expect(getDartsPerStep(null, 'SD')).toBe(3);
    expect(getDartsPerStep(null, 'ST')).toBe(3);
  });

  it('returns 9 for C when lr is null', () => {
    expect(getDartsPerStep(null, 'C')).toBe(9);
  });

  it('uses darts_allowed for SS/SD/ST', () => {
    expect(getDartsPerStep({ darts_allowed: 1 } as unknown as LevelRequirement, 'SS')).toBe(1);
    expect(getDartsPerStep({ darts_allowed: 3 } as unknown as LevelRequirement, 'SD')).toBe(3);
  });

  it('uses allowed_throws_per_attempt or darts_allowed for C', () => {
    expect(getDartsPerStep({ allowed_throws_per_attempt: 6, darts_allowed: 9 } as unknown as LevelRequirement, 'C')).toBe(6);
    expect(getDartsPerStep({ darts_allowed: 9 } as unknown as LevelRequirement, 'C')).toBe(9);
  });
});

describe('getLevelReqForStep', () => {
  it('returns level req for given routine type', () => {
    const byType = { SS: { darts_allowed: 3 } as unknown as LevelRequirement, C: { attempt_count: 3 } as unknown as LevelRequirement };
    expect(getLevelReqForStep(byType, 'SS')).toEqual({ darts_allowed: 3 });
    expect(getLevelReqForStep(byType, 'C')).toEqual({ attempt_count: 3 });
  });

  it('falls back to SS when routine type missing', () => {
    const byType = { SS: { darts_allowed: 3 } as unknown as LevelRequirement };
    expect(getLevelReqForStep(byType, 'SD')).toEqual({ darts_allowed: 3 });
  });

  it('returns null when no level req', () => {
    expect(getLevelReqForStep({}, 'SS')).toBeNull();
  });
});

describe('hasAnyCheckoutStep', () => {
  it('returns true if any step is C', () => {
    const routines: RoutineWithSteps[] = [
      { routine: { id: '1', name: 'R1' }, steps: [{ routine_type: 'SS', target: 'S20', step_no: 1 } as unknown as RoutineStep] },
      { routine: { id: '2', name: 'R2' }, steps: [{ routine_type: 'C', target: '41', step_no: 1 } as unknown as RoutineStep] },
    ];
    expect(hasAnyCheckoutStep(routines)).toBe(true);
  });

  it('returns false when no C step', () => {
    const routines: RoutineWithSteps[] = [
      { routine: { id: '1', name: 'R1' }, steps: [{ routine_type: 'SS', target: 'S20', step_no: 1 } as unknown as RoutineStep] },
    ];
    expect(hasAnyCheckoutStep(routines)).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(hasAnyCheckoutStep([])).toBe(false);
  });
});

describe('computeRemaining', () => {
  it('returns target when no darts thrown', () => {
    expect(computeRemaining(50, [])).toBe(50);
  });

  it('subtracts segment scores', () => {
    expect(computeRemaining(50, ['S10'])).toBe(40); // 10
    expect(computeRemaining(50, ['S20', 'S20', 'D5'])).toBe(0); // 20+20+10
  });

  it('returns 0 when over (never negative)', () => {
    expect(computeRemaining(10, ['S20'])).toBe(0);
  });

  it('treats M as 0', () => {
    expect(computeRemaining(20, ['M', 'S20'])).toBe(0);
  });
});

describe('computeCheckoutBustReason', () => {
  it('returns null when remaining > 0', () => {
    expect(computeCheckoutBustReason(50, ['S20'])).toBe(null);
  });

  it('returns null when finished on double/bull', () => {
    expect(computeCheckoutBustReason(40, ['S20', 'D10'])).toBe(null);
    expect(computeCheckoutBustReason(50, ['Bull'])).toBe(null);
  });

  it('returns "over" when remaining < 0 in one dart', () => {
    expect(computeCheckoutBustReason(10, ['S20'])).toBe('over');
  });

  it('returns "one" when remaining is 1', () => {
    expect(computeCheckoutBustReason(21, ['S20', 'M'])).toBe('one');
  });

  it('returns "invalid_finish" when remaining 0 but not double/bull', () => {
    expect(computeCheckoutBustReason(20, ['S20'])).toBe('invalid_finish');
    expect(computeCheckoutBustReason(60, ['T20'])).toBe('invalid_finish');
  });
});
