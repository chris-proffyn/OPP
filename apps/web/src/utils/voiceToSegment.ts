/**
 * P8 — Map voice utterance to dart segment code for GE.
 * Hit/miss or segment codes (S20, T5, etc.); same payload as manual to dart_scores.
 */

import { normaliseSegment } from '../constants/segments';
import { ALL_SEGMENT_CODES, SEGMENT_MISS } from '../constants/segments';

const HIT_WORDS = ['hit', 'hit it', 'yes', 'got it', 'in'];
const MISS_WORDS = ['miss', 'missed', 'no', 'out'];

/**
 * Map recognised speech text to a segment code for the current step.
 * - "hit" / "hit it" / "yes" → stepTarget (hit)
 * - "miss" / "missed" / "no" → M
 * - Segment codes (S20, T5, single 20, etc.) → normalised segment
 * @param text Raw transcript (trimmed)
 * @param stepTarget Current step target (e.g. S20) for hit mapping
 * @returns Segment code or null if not recognised
 */
export function voiceTextToSegment(text: string, stepTarget: string): string | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  if (HIT_WORDS.some((w) => t === w || t.startsWith(w + ' '))) return stepTarget;
  if (MISS_WORDS.some((w) => t === w || t.startsWith(w + ' '))) return SEGMENT_MISS;
  const normalised = normaliseSegment(text);
  if (normalised && ALL_SEGMENT_CODES.includes(normalised)) return normalised;
  return null;
}
