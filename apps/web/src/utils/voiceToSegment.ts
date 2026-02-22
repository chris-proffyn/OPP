/**
 * P8 — Map voice utterance to dart segment code for GE.
 * Absolute outcomes only: segment names/codes (Single 20, S20, Double 16, 25, Bull, Miss);
 * same payload as manual to dart_scores.
 */

import { normaliseSegment } from '../constants/segments';
import { ALL_SEGMENT_CODES } from '../constants/segments';

/**
 * Map recognised speech text to a segment code.
 * Only absolute outcomes are recognised (no "hit" / "miss" / implicit outcomes).
 *
 * - Segment names and codes: "Single 20", "S20", "Double 16", "D16", "Treble 5", "25", "Bull", "Miss" → canonical code.
 * - Optional bare number: e.g. "20" when stepTarget is S20 → 'S20' (singles context).
 * - Unrecognised → null.
 *
 * @param text Raw transcript (trimmed)
 * @param stepTarget Current step target (e.g. S20); used only for optional bare-number mapping
 * @returns Canonical segment code (e.g. 'S20', 'D16', 'M') or null if not recognised. Same format as manual grid.
 */
/**
 * STT often transcribes "Double 5" as "55". Reconvert two identical digits (11–99) to "Double N".
 * Players never say "55" for fifty-five in this context.
 */
const VOICE_DEBUG = true; // set to false to reduce console noise

/** Number word → digit string (1–20). Replace longest first so "twenty" isn't turned into "2enty". */
const NUMBER_WORDS: [string, string][] = [
  ['twenty', '20'], ['nineteen', '19'], ['eighteen', '18'], ['seventeen', '17'], ['sixteen', '16'],
  ['fifteen', '15'], ['fourteen', '14'], ['thirteen', '13'], ['twelve', '12'], ['eleven', '11'],
  ['ten', '10'], ['nine', '9'], ['eight', '8'], ['seven', '7'], ['six', '6'],
  ['five', '5'], ['four', '4'], ['three', '3'], ['two', '2'], ['one', '1'],
];

/**
 * STT often mishears "two" as "to", "too", "tube", or "tune". Normalize these in segment contexts only.
 */
function normalizeTwoMishearings(transcript: string): string {
  let s = transcript.trim();
  const twoVariants = 'to|too|tube|tune';
  // After segment keyword: "single to", "double too", "treble tube" → "single 2", "double 2", "treble 2"
  s = s.replace(new RegExp(`\\b(single|double|treble|triple|trouble)\\s+(${twoVariants})\\b`, 'gi'), '$1 2');
  // Standalone as a segment token (at start, or after comma/" and "): ", to," or " and to " → ", 2," / " and 2 "
  s = s.replace(new RegExp(`(^|[,\\s]+and\\s+|,\\s*)(${twoVariants})(?=\\s*,\\s*|\\s+and\\s+|\\s*$)`, 'gi'), '$12');
  return s;
}

/**
 * Normalize spoken number words to digits in the transcript so "single one" and "one one one" work.
 * "twenty five" → 25 (single segment) before other number words so it isn't split into "20" and "5".
 * Commas are not present in STT output; splitting is done by phrase regex after this.
 */
function normalizeNumberWords(transcript: string): string {
  let s = transcript.trim();
  s = normalizeTwoMishearings(s);
  // Replace "twenty five" / "twenty-five" as a phrase with "25" first (segment 25, not 20 and 5).
  s = s.replace(/\btwenty[- ]five\b/gi, '25');
  for (const [word, num] of NUMBER_WORDS) {
    const re = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    s = s.replace(re, num);
  }
  return s;
}

function reconvertSttDoubleToken(text: string): string {
  const m = text.trim().match(/^(\d)\1$/);
  if (m && m[1] !== '0') return 'Double ' + m[1];
  return text;
}

export function voiceTextToSegment(text: string, stepTarget: string): string | null {
  const t = text.trim();
  if (!t) {
    if (VOICE_DEBUG) console.log('[OPP Voice mapping] voiceTextToSegment: empty input → null');
    return null;
  }

  let afterStt = reconvertSttDoubleToken(t);
  if (VOICE_DEBUG && afterStt !== t) {
    console.log('[OPP Voice mapping] voiceTextToSegment: STT reconvert', JSON.stringify(t), '→', JSON.stringify(afterStt));
  }
  // STT "two" → "to"/"too"/"tube"/"tune": after keyword ("Single to") or as sole token ("to")
  afterStt = normalizeTwoMishearings(afterStt);
  const twoAliases = ['to', 'too', 'tube', 'tune'];
  const forNormalise = twoAliases.includes(t.toLowerCase()) ? '2' : afterStt;
  const normalised = normaliseSegment(forNormalise);
  if (VOICE_DEBUG) {
    console.log('[OPP Voice mapping] voiceTextToSegment: input', JSON.stringify(t), '| afterStt', JSON.stringify(afterStt), '| normalised', JSON.stringify(normalised), '| in ALL_SEGMENT_CODES', normalised ? ALL_SEGMENT_CODES.includes(normalised) : false);
  }
  if (normalised && ALL_SEGMENT_CODES.includes(normalised)) return normalised;

  // Optional bare number: "20" with stepTarget S20 → S20; also "to"/"too"/"tube"/"tune" (forNormalise "2") → S2/D2/T2
  const digitSource = forNormalise;
  const bareNum = digitSource.match(/^\d{1,2}$/);
  if (bareNum) {
    const n = parseInt(bareNum[0], 10);
    if (n >= 1 && n <= 20) {
      const singleCode = 'S' + n;
      const stepNorm = normaliseSegment(stepTarget);
      if (stepNorm === singleCode) {
        if (VOICE_DEBUG) console.log('[OPP Voice mapping] voiceTextToSegment: bare number →', singleCode, '(stepTarget match)');
        return singleCode;
      }
      // Step might be double/treble for this number (e.g. D2, T2 when user said "to")
      if (stepNorm === 'D' + n || stepNorm === 'T' + n) {
        if (VOICE_DEBUG) console.log('[OPP Voice mapping] voiceTextToSegment: bare number →', stepNorm, '(stepTarget match)');
        return stepNorm;
      }
    }
  }

  if (VOICE_DEBUG) console.log('[OPP Voice mapping] voiceTextToSegment: no match → null');
  return null;
}

/**
 * Number pattern: 20 and 10–19 before 1–9 so "10" and "20" match in full, not as "1" and "0".
 */
const NUM_1_20 = '(?:20|1[0-9]|[1-9])';

/**
 * Regex to match one segment phrase (for splitting space-separated declarations).
 * Matches: double/treble/triple/trouble/single + number, D/T/S + number, 25/bull/bullseye/miss, bare 1–20, or STT double (11–99).
 */
const SEGMENT_PHRASE_REGEX = new RegExp(
  `(?:double|treble|triple|trouble|single)\\s*${NUM_1_20}|[dDsStT]${NUM_1_20}|\\b(?:25|bull|bullseye|miss)\\b|\\b${NUM_1_20}\\b|\\b(\\d)\\1\\b`,
  'gi'
);

/**
 * Split transcript into segment phrases. First tries comma / " and "; if that yields one long part and we need
 * visitSize > 1, split that part by matching segment phrases (e.g. "double 1 double 1 double 1" → ["double 1", "double 1", "double 1"]).
 */
function splitIntoParts(transcript: string, visitSize: number): string[] | null {
  const t = transcript.trim();
  if (!t) return null;
  let parts = t.split(/\s*,\s*|\s+and\s+/i).map((p) => p.trim()).filter(Boolean);
  if (VOICE_DEBUG) {
    console.log('[OPP Voice mapping] splitIntoParts: transcript', JSON.stringify(t), '| visitSize', visitSize);
    console.log('[OPP Voice mapping] splitIntoParts: after comma/"and" split →', parts.length, 'parts', parts.map((p) => JSON.stringify(p)));
  }
  if (parts.length === 1 && visitSize > 1) {
    SEGMENT_PHRASE_REGEX.lastIndex = 0;
    const matches = t.match(SEGMENT_PHRASE_REGEX);
    if (VOICE_DEBUG) {
      console.log('[OPP Voice mapping] splitIntoParts: segment-phrase regex matches →', matches?.length ?? 0, matches ? matches.map((m) => JSON.stringify(m)) : 'null');
    }
    // Use phrase split whenever we found at least one segment phrase (don't require match count === visitSize).
    if (matches && matches.length > 0) {
      parts = matches.map((m) => m.trim());
      // STT often drops one repeated "miss" (e.g. hears "miss miss" for "miss miss miss"). Pad to visitSize when all matches are "miss".
      if (parts.length < visitSize && parts.length > 0 && parts.every((p) => p.toLowerCase() === 'miss')) {
        while (parts.length < visitSize) parts.push('Miss');
        if (VOICE_DEBUG) console.log('[OPP Voice mapping] splitIntoParts: padded miss(es) →', parts.length, 'parts');
      }
      if (VOICE_DEBUG) console.log('[OPP Voice mapping] splitIntoParts: using phrase split →', parts.length, 'parts', parts.map((p) => JSON.stringify(p)));
    } else if (VOICE_DEBUG) {
      console.log('[OPP Voice mapping] splitIntoParts: phrase split not used (no matches)');
    }
  }
  const ok = parts.length === visitSize;
  if (VOICE_DEBUG) console.log('[OPP Voice mapping] splitIntoParts: result', ok ? 'OK' : 'FAIL (count mismatch)', '→', parts.length, 'parts');
  return ok ? parts : null;
}

/**
 * Parse a full-visit utterance (e.g. "20, Treble 5, 1" or "double 1 double 1 double 1") into an array of segment codes.
 * Voice input is always one visit; the caller must pass the darts-per-visit count (3 for standard darts).
 * Splits on comma and " and "; if no separators, splits by segment phrases (double N, treble N, etc.).
 * @param transcript Raw transcript (e.g. "20, Treble 5, 1" or "single one single one single one")
 * @param stepTarget Current step target (used for single-segment mapping where applicable)
 * @param visitSize Darts per visit (always 3 for voice — one voice input = one visit)
 * @returns Array of segment codes of length visitSize, or null if unrecognised or wrong count
 */
export function parseVisitFromTranscript(
  transcript: string,
  stepTarget: string,
  visitSize: number
): string[] | null {
  const raw = transcript.trim();
  if (VOICE_DEBUG) {
    console.log('[OPP Voice mapping] parseVisitFromTranscript: START', { transcript: JSON.stringify(transcript), stepTarget, visitSize });
  }
  if (!raw) {
    if (VOICE_DEBUG) console.log('[OPP Voice mapping] parseVisitFromTranscript: empty transcript → null');
    return null;
  }
  const t = normalizeNumberWords(raw);
  if (VOICE_DEBUG && t !== raw) {
    console.log('[OPP Voice mapping] parseVisitFromTranscript: after number-word normalization', JSON.stringify(raw), '→', JSON.stringify(t));
  }
  const parts = splitIntoParts(t, visitSize);
  if (!parts) {
    if (VOICE_DEBUG) console.log('[OPP Voice mapping] parseVisitFromTranscript: splitIntoParts returned null → null');
    return null;
  }
  if (VOICE_DEBUG) console.log('[OPP Voice mapping] parseVisitFromTranscript: mapping', parts.length, 'parts to segment codes');
  const segments: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    let code = voiceTextToSegment(part, stepTarget);
    if (code == null) {
      const bare = part.match(/^\d{1,2}$/);
      if (bare) {
        const n = parseInt(bare[0], 10);
        if (n >= 1 && n <= 20) code = 'S' + n;
      }
    }
    if (VOICE_DEBUG) console.log('[OPP Voice mapping] parseVisitFromTranscript: part', i + 1, JSON.stringify(part), '→ code', code ?? 'null');
    if (code == null) {
      if (VOICE_DEBUG) console.log('[OPP Voice mapping] parseVisitFromTranscript: FAIL at part', i + 1, '→ null');
      return null;
    }
    segments.push(code);
  }
  if (VOICE_DEBUG) console.log('[OPP Voice mapping] parseVisitFromTranscript: SUCCESS →', segments);
  return segments;
}
