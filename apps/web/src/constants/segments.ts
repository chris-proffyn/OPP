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
  const trebleMatch =
    s.match(/^treble\s*(\d{1,2})$/i) ||
    s.match(/^triple\s*(\d{1,2})$/i) ||
    s.match(/^trouble\s*(\d{1,2})$/i) ||
    s.match(/^t(\d{1,2})$/i);
  if (trebleMatch?.[1]) return 'T' + String(parseInt(trebleMatch[1], 10));
  return s;
}

/** Return true if actual segment counts as a hit for the given step target */
export function isHitForTarget(actual: string, stepTarget: string): boolean {
  return normaliseSegment(actual) === normaliseSegment(stepTarget);
}

/**
 * True if the segment is a valid checkout finish: double (D1–D20) or bullseye (Bull).
 * Used to require finishing on double/bull for checkout success.
 */
export function isDoubleOrBull(segment: string): boolean {
  if (!segment || typeof segment !== 'string') return false;
  const s = segment.trim().toLowerCase();
  if (s === 'bull' || s === 'bullseye') return true;
  const doubleMatch = s.match(/^d(\d{1,2})$/i);
  if (doubleMatch?.[1]) {
    const n = parseInt(doubleMatch[1], 10);
    return n >= 1 && n <= 20;
  }
  return false;
}

/**
 * Spoken form of a segment code for prompting and feedback (e.g. S20 → "Single 20", D16 → "Double 16").
 * Used by voice prompting and read-back.
 */
export function segmentCodeToSpoken(code: string): string {
  if (!code || typeof code !== 'string') return '';
  const s = normaliseSegment(code.trim());
  if (s === SEGMENT_MISS) return 'Miss';
  if (s === '25') return '25';
  if (s === 'Bull') return 'Bull';
  const singleMatch = s.match(/^S(\d{1,2})$/);
  if (singleMatch?.[1]) return 'Single ' + singleMatch[1];
  const doubleMatch = s.match(/^D(\d{1,2})$/);
  if (doubleMatch?.[1]) return 'Double ' + doubleMatch[1];
  const trebleMatch = s.match(/^T(\d{1,2})$/);
  if (trebleMatch?.[1]) return 'Treble ' + trebleMatch[1];
  return s;
}

/**
 * Short spoken form for visit read-back (e.g. "You scored 20, Treble 5, 1").
 * Singles as number (S20 → "20"), others as name (T5 → "Treble 5", D16 → "Double 16", 25, Bull, M → "Miss").
 */
export function segmentCodeToShortSpoken(code: string): string {
  if (!code || typeof code !== 'string') return '';
  const s = normaliseSegment(code.trim());
  if (s === SEGMENT_MISS) return 'Miss';
  if (s === '25') return '25';
  if (s === 'Bull') return 'Bull';
  const singleMatch = s.match(/^S(\d{1,2})$/);
  if (singleMatch?.[1]) return singleMatch[1];
  const doubleMatch = s.match(/^D(\d{1,2})$/);
  if (doubleMatch?.[1]) return 'Double ' + doubleMatch[1];
  const trebleMatch = s.match(/^T(\d{1,2})$/);
  if (trebleMatch?.[1]) return 'Treble ' + trebleMatch[1];
  return s;
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
