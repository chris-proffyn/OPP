/**
 * P8 §2.2 — Unit tests for voice utterance mapping (absolute outcomes only).
 * voiceTextToSegment is a pure function; maps speech to segment code or null.
 */

import { parseVisitFromTranscript, voiceTextToSegment } from './voiceToSegment';

describe('voiceTextToSegment', () => {
  const stepTarget = 'S20';

  it('maps segment names and codes to canonical code', () => {
    expect(voiceTextToSegment('Single 20', stepTarget)).toBe('S20');
    expect(voiceTextToSegment('S20', stepTarget)).toBe('S20');
    expect(voiceTextToSegment('single 20', stepTarget)).toBe('S20');
    expect(voiceTextToSegment('Double 8', stepTarget)).toBe('D8');
    expect(voiceTextToSegment('D16', stepTarget)).toBe('D16');
    expect(voiceTextToSegment('Treble 5', stepTarget)).toBe('T5');
    expect(voiceTextToSegment('T5', stepTarget)).toBe('T5');
    expect(voiceTextToSegment('25', stepTarget)).toBe('25');
    expect(voiceTextToSegment('Bull', stepTarget)).toBe('Bull');
    expect(voiceTextToSegment('Bullseye', stepTarget)).toBe('Bull');
    expect(voiceTextToSegment('Treble 20', stepTarget)).toBe('T20');
    expect(voiceTextToSegment('T20', stepTarget)).toBe('T20');
    expect(voiceTextToSegment('Miss', stepTarget)).toBe('M');
  });

  it('maps bare number to single when step target matches (optional)', () => {
    expect(voiceTextToSegment('20', 'S20')).toBe('S20');
    expect(voiceTextToSegment('5', 'S5')).toBe('S5');
  });

  it('returns null for empty or whitespace', () => {
    expect(voiceTextToSegment('', stepTarget)).toBeNull();
    expect(voiceTextToSegment('   ', stepTarget)).toBeNull();
  });

  it('returns null for unknown text', () => {
    expect(voiceTextToSegment('something random', stepTarget)).toBeNull();
    expect(voiceTextToSegment('nope', stepTarget)).toBeNull();
  });

  it('does not accept hit/yes/no as implicit outcomes (only absolute segment names)', () => {
    expect(voiceTextToSegment('hit', stepTarget)).toBeNull();
    expect(voiceTextToSegment('yes', stepTarget)).toBeNull();
    expect(voiceTextToSegment('no', stepTarget)).toBeNull();
  });

  it('maps Triple and Trouble to treble (STT mishearing)', () => {
    expect(voiceTextToSegment('Triple 5', stepTarget)).toBe('T5');
    expect(voiceTextToSegment('triple 10', stepTarget)).toBe('T10');
    expect(voiceTextToSegment('Trouble 5', stepTarget)).toBe('T5');
    expect(voiceTextToSegment('trouble 20', stepTarget)).toBe('T20');
  });

  it('reconverts STT "Double N" misheard as two digits (11–99) to Double N', () => {
    expect(voiceTextToSegment('55', stepTarget)).toBe('D5');
    expect(voiceTextToSegment('11', stepTarget)).toBe('D1');
    expect(voiceTextToSegment('99', stepTarget)).toBe('D9');
    expect(voiceTextToSegment('22', 'S20')).toBe('D2');
  });

  it('maps STT "two" mishearings (to, too, tube, tune) to 2 / segment', () => {
    expect(voiceTextToSegment('to', 'S2')).toBe('S2');
    expect(voiceTextToSegment('too', 'S2')).toBe('S2');
    expect(voiceTextToSegment('tube', 'S2')).toBe('S2');
    expect(voiceTextToSegment('tune', 'S2')).toBe('S2');
    expect(voiceTextToSegment('Single to', 'S20')).toBe('S2');
    expect(voiceTextToSegment('double too', 'S20')).toBe('D2');
    expect(voiceTextToSegment('treble tube', 'S20')).toBe('T2');
    expect(voiceTextToSegment('trouble tune', 'S20')).toBe('T2');
  });
});

describe('parseVisitFromTranscript', () => {
  it('parses comma-separated visit (segment names and bare numbers)', () => {
    expect(parseVisitFromTranscript('20, Treble 5, 1', 'S20', 3)).toEqual(['S20', 'T5', 'S1']);
    expect(parseVisitFromTranscript('Single 20, T5, Single 1', 'S20', 3)).toEqual(['S20', 'T5', 'S1']);
    expect(parseVisitFromTranscript('Miss, 5, Double 10', 'S20', 3)).toEqual(['M', 'S5', 'D10']);
  });

  it('parses " and " separated visit', () => {
    expect(parseVisitFromTranscript('20 and Treble 5 and 1', 'S20', 3)).toEqual(['S20', 'T5', 'S1']);
  });

  it('returns null for wrong segment count', () => {
    expect(parseVisitFromTranscript('20, 5', 'S20', 3)).toBeNull();
    expect(parseVisitFromTranscript('20, Treble 5, 1, 10', 'S20', 3)).toBeNull();
  });

  it('returns null for unrecognised segment in visit', () => {
    expect(parseVisitFromTranscript('20, something, 1', 'S20', 3)).toBeNull();
  });

  it('returns null for empty or whitespace', () => {
    expect(parseVisitFromTranscript('', 'S20', 3)).toBeNull();
  });

  it('parses STT misheard "55" as Double 5 in visit', () => {
    expect(parseVisitFromTranscript('20, 55, 1', 'S20', 3)).toEqual(['S20', 'D5', 'S1']);
    expect(parseVisitFromTranscript('Double 10, 33, Miss', 'D10', 3)).toEqual(['D10', 'D3', 'M']);
  });

  it('parses Triple and Trouble in visit', () => {
    expect(parseVisitFromTranscript('20, Triple 5, 1', 'S20', 3)).toEqual(['S20', 'T5', 'S1']);
    expect(parseVisitFromTranscript('Trouble 20, 55, Bull', 'T20', 3)).toEqual(['T20', 'D5', 'Bull']);
  });

  it('parses space-separated declarations without comma (e.g. double 1 double 1 double 1)', () => {
    expect(parseVisitFromTranscript('double 1 double 1 double 1', 'D1', 3)).toEqual(['D1', 'D1', 'D1']);
    expect(parseVisitFromTranscript('double 5 double 5 20', 'S20', 3)).toEqual(['D5', 'D5', 'S20']);
  });

  it('pads "miss miss" to three misses when STT drops one (miss miss miss)', () => {
    expect(parseVisitFromTranscript('miss miss', 'S20', 3)).toEqual(['M', 'M', 'M']);
    expect(parseVisitFromTranscript('miss miss miss', 'S20', 3)).toEqual(['M', 'M', 'M']);
  });

  it('parses 25, Bullseye, Treble 20 (and twenty five as 25)', () => {
    expect(parseVisitFromTranscript('25, Bullseye, Treble 20', 'T20', 3)).toEqual(['25', 'Bull', 'T20']);
    expect(parseVisitFromTranscript('twenty five bullseye treble 20', 'T20', 3)).toEqual(['25', 'Bull', 'T20']);
  });

  it('parses Single 1 Single 1 Single 1 and double 2, double 2, double 2', () => {
    expect(parseVisitFromTranscript('Single 1 Single 1 Single 1', 'S1', 3)).toEqual(['S1', 'S1', 'S1']);
    expect(parseVisitFromTranscript('double 2, double 2, double 2', 'D2', 3)).toEqual(['D2', 'D2', 'D2']);
  });

  it('parses spoken number words: one one one, single one single one single one, double two, treble five', () => {
    expect(parseVisitFromTranscript('one one one', 'S1', 3)).toEqual(['S1', 'S1', 'S1']);
    expect(parseVisitFromTranscript('single one single one single one', 'S1', 3)).toEqual(['S1', 'S1', 'S1']);
    expect(parseVisitFromTranscript('double two double two double two', 'D2', 3)).toEqual(['D2', 'D2', 'D2']);
    expect(parseVisitFromTranscript('triple five trouble ten single twenty', 'T5', 3)).toEqual(['T5', 'T10', 'S20']);
  });

  it('parses "two" mishearings: to, too, tube, tune in phrases and as segment tokens', () => {
    expect(parseVisitFromTranscript('single to single to single to', 'S2', 3)).toEqual(['S2', 'S2', 'S2']);
    expect(parseVisitFromTranscript('double too double too 20', 'D2', 3)).toEqual(['D2', 'D2', 'S20']);
    expect(parseVisitFromTranscript('20, to, 1', 'S20', 3)).toEqual(['S20', 'S2', 'S1']);
    // stepTarget T2: bare "2" (tune) matches step type → T2
    expect(parseVisitFromTranscript('treble tube and 5 and tune', 'T2', 3)).toEqual(['T2', 'S5', 'T2']);
  });
});
