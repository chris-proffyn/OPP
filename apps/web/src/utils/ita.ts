/**
 * P5: ITA (Initial Training Assessment) session identification in GE.
 * Per P5_TRAINING_RATING_DOMAIN.md §9.1 Option A — name-based.
 * No config/env: session is ITA if its name equals "ITA" or "Initial Training Assessment" (case-insensitive).
 */

/**
 * Returns true if the session is an ITA session (name-based).
 * Used in GE to skip CR progression and run ITA completion flow instead.
 */
export function isITASession(sessionName: string): boolean {
  const n = sessionName.trim().toLowerCase();
  return n === 'ita' || n === 'initial training assessment';
}
