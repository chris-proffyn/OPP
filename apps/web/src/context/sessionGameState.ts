/**
 * Pure helpers and types for session game state. Used by SessionGameContext and by unit tests.
 * No React or JSX — safe to test in Node.
 */

import type { LevelRequirement, RoutineStep, RoutineType } from '@opp/data';
import { isDoubleOrBull, segmentToScore } from '../constants/segments';

export type RoutineWithSteps = { routine: { id: string; name: string }; steps: RoutineStep[] };

export function levelToDecade(level: number | null): number {
  if (level == null || Number.isNaN(level)) return 0;
  return Math.floor(Number(level) / 10) * 10;
}

export function getDartsPerStep(lr: LevelRequirement | null | undefined, routineType: RoutineType): number {
  if (!lr) return routineType === 'C' ? 9 : 3;
  if (routineType === 'C') return lr.allowed_throws_per_attempt ?? lr.darts_allowed ?? 9;
  return lr.darts_allowed ?? 3;
}

export function getLevelReqForStep(
  levelReqsByType: Partial<Record<RoutineType, LevelRequirement>>,
  routineType: RoutineType
): LevelRequirement | null {
  return levelReqsByType[routineType] ?? levelReqsByType.SS ?? null;
}

export function hasAnyCheckoutStep(routinesWithSteps: RoutineWithSteps[]): boolean {
  return routinesWithSteps.some((r) => r.steps.some((s) => s.routine_type === 'C'));
}

export function computeRemaining(stepTarget: number, visitSelections: string[]): number {
  const scored = visitSelections.reduce(
    (sum, seg) => sum + segmentToScore(seg ?? 'M'),
    0
  );
  return Math.max(0, stepTarget - scored);
}

export function computeCheckoutBustReason(
  stepTarget: number,
  visitSelections: string[]
): 'over' | 'one' | 'invalid_finish' | null {
  let remaining = stepTarget;
  for (const actual of visitSelections) {
    const seg = actual ?? 'M';
    remaining -= segmentToScore(seg);
    if (remaining < 0) return 'over';
    if (remaining === 1) return 'one';
    if (remaining === 0) return isDoubleOrBull(seg) ? null : 'invalid_finish';
  }
  return null;
}
