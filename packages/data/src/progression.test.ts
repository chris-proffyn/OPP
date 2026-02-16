/**
 * Unit tests for P5 applyTrainingRatingProgression. Per P5_TRAINING_RATING_IMPLEMENTATION_TASKS.md §9.2.
 * Mock client: getPlayerById then update consume queued responses.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError, applyTrainingRatingProgression } from './progression';
import { createMockClient } from './test-utils';

function playerWithTR(training_rating: number | null) {
  return {
    id: 'pid-1',
    user_id: 'uid-1',
    display_name: 'Test',
    email: 'test@example.com',
    gender: null,
    age_range: null,
    baseline_rating: null,
    training_rating: training_rating as number | null,
    match_rating: null,
    player_rating: null,
    date_joined: '2026-01-01',
    role: 'player' as const,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

describe('applyTrainingRatingProgression', () => {
  it('TR 24, session 75% → TR stays 24 (50–99% → 0 change)', async () => {
    const client = createMockClient([
      { data: playerWithTR(24), error: null },
      { data: { training_rating: 24 }, error: null },
    ]) as unknown as SupabaseClient;
    const result = await applyTrainingRatingProgression(client, 'pid-1', 75);
    expect(result).toBe(24);
  });

  it('TR 24, session 120% → TR 25 (100–199% → +1)', async () => {
    const client = createMockClient([
      { data: playerWithTR(24), error: null },
      { data: { training_rating: 25 }, error: null },
    ]) as unknown as SupabaseClient;
    const result = await applyTrainingRatingProgression(client, 'pid-1', 120);
    expect(result).toBe(25);
  });

  it('TR null, session 150% → TR 1 (treat null as 0, +1, clamped)', async () => {
    const client = createMockClient([
      { data: playerWithTR(null), error: null },
      { data: { training_rating: 1 }, error: null },
    ]) as unknown as SupabaseClient;
    const result = await applyTrainingRatingProgression(client, 'pid-1', 150);
    expect(result).toBe(1);
  });

  it('TR 99, session 300% → TR 99 (clamped to 99)', async () => {
    const client = createMockClient([
      { data: playerWithTR(99), error: null },
      { data: { training_rating: 99 }, error: null },
    ]) as unknown as SupabaseClient;
    const result = await applyTrainingRatingProgression(client, 'pid-1', 300);
    expect(result).toBe(99);
  });

  it('throws NOT_FOUND when player missing', async () => {
    const client = createMockClient([{ data: null, error: null }]) as unknown as SupabaseClient;
    await expect(applyTrainingRatingProgression(client, 'nonexistent', 100)).rejects.toThrow(
      DataError
    );
    await expect(applyTrainingRatingProgression(client, 'nonexistent', 100)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Player not found',
    });
  });
});
