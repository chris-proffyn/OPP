/**
 * Canonical dart segment codes for scoring input.
 * Used for dart_scores.actual and for the segment grid UI.
 * Result H/M is derived: hit when actual matches step target (after normalisation).
 */

export const SEGMENT_MISS = 'M';

const SINGLES = Array.from({ length: 20 }, (_, i) => `S${i + 1}`);
const DOUBLES = Array.from({ length: 20 }, (_, i) => `D${i + 1}`);
const TREBLES = Array.from({ length: 20 }, (_, i) => `T${i + 1}`);

/** All segment codes in grid order: Singles, Doubles, Trebles, 25, Bull, Miss */
export const ALL_SEGMENT_CODES: string[] = [
  ...SINGLES,
  ...DOUBLES,
  ...TREBLES,
  '25',
  'Bull',
  SEGMENT_MISS,
];

/** Grouped for grid display: label + codes */
export const SEGMENT_GROUPS: { label: string; codes: string[] }[] = [
  { label: 'Singles', codes: SINGLES },
  { label: 'Doubles', codes: DOUBLES },
  { label: 'Trebles', codes: TREBLES },
  { label: '25 / Bull', codes: ['25', 'Bull'] },
  { label: 'Miss', codes: [SEGMENT_MISS] },
];

/**
 * Normalise a step target or actual segment for hit comparison.
 * Maps common variants to canonical code (S20, D16, T20, 25, Bull, M).
 */
export function normaliseSegment(segment: string): string {
  if (!segment || typeof segment !== 'string') return '';
  const s = segment.trim();
  if (s === 'M' || s.toUpperCase() === 'MISS') return 'M';
  if (s === '25') return '25';
  if (s === 'Bull' || s.toLowerCase() === 'bullseye') return 'Bull';
  const singleMatch = s.match(/^single\s*(\d{1,2})$/i) || s.match(/^s(\d{1,2})$/i);
  if (singleMatch?.[1]) return 'S' + String(parseInt(singleMatch[1], 10));
  const doubleMatch = s.match(/^double\s*(\d{1,2})$/i) || s.match(/^d(\d{1,2})$/i);
  if (doubleMatch?.[1]) return 'D' + String(parseInt(doubleMatch[1], 10));
  const trebleMatch = s.match(/^treble\s*(\d{1,2})$/i) || s.match(/^t(\d{1,2})$/i);
  if (trebleMatch?.[1]) return 'T' + String(parseInt(trebleMatch[1], 10));
  return s;
}

/** Return true if actual segment counts as a hit for the given step target */
export function isHitForTarget(actual: string, stepTarget: string): boolean {
  return normaliseSegment(actual) === normaliseSegment(stepTarget);
}

/**
 * Points value of a segment for checkout remaining calculation.
 * S1→1..S20→20, D1→2..D20→40, T1→3..T20→60, 25→25, Bull→50, M→0.
 */
export function segmentToScore(segment: string): number {
  if (!segment || segment === SEGMENT_MISS) return 0;
  const s = segment.trim();
  if (s === '25') return 25;
  if (s === 'Bull' || s.toLowerCase() === 'bullseye') return 50;
  const singleMatch = s.match(/^s(\d{1,2})$/i);
  if (singleMatch?.[1]) return Math.min(20, Math.max(1, parseInt(singleMatch[1], 10)));
  const doubleMatch = s.match(/^d(\d{1,2})$/i);
  if (doubleMatch?.[1]) return Math.min(40, Math.max(2, parseInt(doubleMatch[1], 10) * 2));
  const trebleMatch = s.match(/^t(\d{1,2})$/i);
  if (trebleMatch?.[1]) return Math.min(60, Math.max(3, parseInt(trebleMatch[1], 10) * 3));
  return 0;
}
