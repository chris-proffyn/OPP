/**
 * Unit tests for player routine scores (upsertPlayerRoutineScore). Per P4 §11.3.
 * Insert new; update existing for same (training_id, routine_id). Uses mocked Supabase client.
 */

import { upsertPlayerRoutineScore } from './player-routine-scores';
import type { PlayerRoutineScore, PlayerRoutineScorePayload } from './types';
import { createMockClient } from './test-utils';

const samplePayload: PlayerRoutineScorePayload = {
  player_id: 'pid-1',
  training_id: 'run-1',
  routine_id: 'rout-1',
  routine_score: 75.5,
};

const sampleRow: PlayerRoutineScore = {
  id: 'prs-1',
  player_id: samplePayload.player_id,
  training_id: samplePayload.training_id,
  routine_id: samplePayload.routine_id,
  routine_score: samplePayload.routine_score,
  created_at: '2026-02-15T10:00:00Z',
  updated_at: '2026-02-15T10:00:00Z',
};

describe('upsertPlayerRoutineScore', () => {
  it('returns row on insert (new training_id, routine_id)', async () => {
    const client = createMockClient([
      { data: sampleRow, error: null },
    ]);
    const result = await upsertPlayerRoutineScore(client, samplePayload);
    expect(result).toEqual(sampleRow);
    expect(result.player_id).toBe('pid-1');
    expect(result.training_id).toBe('run-1');
    expect(result.routine_id).toBe('rout-1');
    expect(result.routine_score).toBe(75.5);
  });

  it('returns row on update (existing training_id, routine_id)', async () => {
    const updated: PlayerRoutineScore = {
      ...sampleRow,
      routine_score: 88.2,
      updated_at: '2026-02-15T11:00:00Z',
    };
    const client = createMockClient([
      { data: updated, error: null },
    ]);
    const result = await upsertPlayerRoutineScore(client, {
      ...samplePayload,
      routine_score: 88.2,
    });
    expect(result.routine_score).toBe(88.2);
    expect(result.training_id).toBe('run-1');
    expect(result.routine_id).toBe('rout-1');
  });
});
