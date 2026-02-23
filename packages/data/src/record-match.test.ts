/**
 * P7 — Integration-style test for recordMatch. Mock client; insert two rows, OMR/PR updates. Per §14.6.
 */

import { recordMatch } from './record-match';
import { createMockClient } from './test-utils';

const player1 = {
  id: 'p1',
  user_id: 'u1',
  nickname: 'Player 1',
  full_name: null as string | null,
  display_name: 'Player 1',
  email: 'p1@test.com',
  gender: null,
  age_range: null,
  baseline_rating: 20,
  training_rating: 24,
  match_rating: null,
  player_rating: 24,
  date_joined: '2026-01-01',
  role: 'player' as const,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const player2 = {
  ...player1,
  id: 'p2',
  user_id: 'u2',
  nickname: 'Player 2',
  display_name: 'Player 2',
  email: 'p2@test.com',
  player_rating: 26,
};

const matchRow = (player_id: string, opponent_id: string, legs_won: number, legs_lost: number, mr: number) => ({
  id: `m-${player_id}-${opponent_id}`,
  player_id,
  opponent_id,
  competition_id: null,
  calendar_id: null,
  played_at: '2026-02-15T12:00:00Z',
  format_best_of: 5,
  legs_won,
  legs_lost,
  total_legs: 5,
  three_dart_avg: 45,
  player_3da_baseline: null,
  doubles_attempted: 5,
  doubles_hit: 2,
  doubles_pct: 0.4,
  opponent_rating_at_match: 26,
  rating_difference: -2,
  match_rating: mr,
  weight: 1,
  eligible: true,
  created_at: '2026-02-15T12:00:00Z',
  updated_at: '2026-02-15T12:00:00Z',
});

describe('recordMatch', () => {
  it('inserts two rows and returns both matches; eligibility and weight set', async () => {
    const inserted = [
      matchRow('p1', 'p2', 3, 2, 58.5),
      matchRow('p2', 'p1', 2, 3, 41.2),
    ];
    const client = createMockClient([
      { data: player1, error: null },
      { data: player2, error: null },
      { data: inserted, error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: player1, error: null },
      { data: player2, error: null },
    ]);
    const result = await recordMatch(client, {
      playerId: 'p1',
      opponentId: 'p2',
      formatBestOf: 5,
      legsWon: 3,
      legsLost: 2,
      threeDartAvg: 45,
      doublesAttempted: 5,
      doublesHit: 2,
    });
    expect(result.playerMatch.player_id).toBe('p1');
    expect(result.playerMatch.opponent_id).toBe('p2');
    expect(result.playerMatch.legs_won).toBe(3);
    expect(result.playerMatch.legs_lost).toBe(2);
    expect(result.opponentMatch.player_id).toBe('p2');
    expect(result.opponentMatch.opponent_id).toBe('p1');
    expect(result.opponentMatch.legs_won).toBe(2);
    expect(result.opponentMatch.legs_lost).toBe(3);
    expect(result.playerMatch.match_rating).toBeGreaterThanOrEqual(0);
    expect(result.playerMatch.match_rating).toBeLessThanOrEqual(100);
    expect(result.playerMatch.weight).toBe(1);
    expect(result.playerMatch.eligible).toBe(true);
  });

  it('throws VALIDATION when formatBestOf < 5', async () => {
    const client = createMockClient([]);
    await expect(
      recordMatch(client, {
        playerId: 'p1',
        opponentId: 'p2',
        formatBestOf: 3,
        legsWon: 2,
        legsLost: 1,
      })
    ).rejects.toMatchObject({ code: 'VALIDATION', message: expect.stringContaining('Format') });
  });

  it('throws VALIDATION when playerId === opponentId', async () => {
    const client = createMockClient([]);
    await expect(
      recordMatch(client, {
        playerId: 'p1',
        opponentId: 'p1',
        formatBestOf: 5,
        legsWon: 3,
        legsLost: 2,
      })
    ).rejects.toMatchObject({ code: 'VALIDATION', message: expect.stringContaining('different') });
  });

  it('throws NOT_FOUND when player missing', async () => {
    const client = createMockClient([
      { data: null, error: null },
      { data: player2, error: null },
    ]);
    await expect(
      recordMatch(client, {
        playerId: 'nonexistent',
        opponentId: 'p2',
        formatBestOf: 5,
        legsWon: 3,
        legsLost: 2,
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
