/**
 * P7 — Unit tests for matches and next competition. Mock client. Per implementation tasks §14.2, §14.7.
 */

import {
  getNextCompetitionForPlayer,
  listMatchesForPlayer,
} from './matches';
import type { Competition } from './types';
import type { MatchWithOpponentDisplay } from './types';
import { createMockClient } from './test-utils';

const sampleCohort = {
  id: 'cohort-1',
  name: 'Test Cohort',
  level: 20,
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  schedule_id: 'sched-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const futureCompetition: Competition = {
  id: 'comp-1',
  name: 'Competition day',
  cohort_id: 'cohort-1',
  competition_type: 'competition_day',
  scheduled_at: '2026-12-01T18:00:00Z',
  format_legs: 5,
  format_target: 501,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('getNextCompetitionForPlayer', () => {
  it('returns next competition for player cohort when scheduled_at >= now', async () => {
    const client = createMockClient([
      { data: [{ cohort_id: 'cohort-1' }], error: null },
      { data: [sampleCohort], error: null },
      { data: [futureCompetition], error: null },
    ]);
    const next = await getNextCompetitionForPlayer(client, 'player-1');
    expect(next).not.toBeNull();
    expect(next!.name).toBe('Competition day');
    expect(next!.scheduled_at).toBe('2026-12-01T18:00:00Z');
  });

  it('returns null when player has no cohort', async () => {
    const client = createMockClient([
      { data: [], error: null },
    ]);
    const next = await getNextCompetitionForPlayer(client, 'player-1');
    expect(next).toBeNull();
  });

  it('returns null when cohort has no future competitions', async () => {
    const client = createMockClient([
      { data: [{ cohort_id: 'cohort-1' }], error: null },
      { data: [sampleCohort], error: null },
      { data: [], error: null },
    ]);
    const next = await getNextCompetitionForPlayer(client, 'player-1');
    expect(next).toBeNull();
  });
});

describe('listMatchesForPlayer', () => {
  it('returns matches for player with opponent_display_name', async () => {
    const matchRow = {
      id: 'm1',
      player_id: 'p1',
      opponent_id: 'p2',
      competition_id: null,
      calendar_id: null,
      played_at: '2026-02-01T12:00:00Z',
      format_best_of: 5,
      legs_won: 3,
      legs_lost: 2,
      total_legs: 5,
      three_dart_avg: 45,
      player_3da_baseline: null,
      doubles_attempted: 5,
      doubles_hit: 2,
      doubles_pct: 0.4,
      opponent_rating_at_match: 50,
      rating_difference: 0,
      match_rating: 58,
      weight: 1,
      eligible: true,
      created_at: '2026-02-01T12:00:00Z',
      updated_at: '2026-02-01T12:00:00Z',
      opponent: { display_name: 'Opponent Name' },
    };
    const client = createMockClient([
      { data: [matchRow], error: null },
    ]);
    const list = await listMatchesForPlayer(client, 'p1');
    expect(list).toHaveLength(1);
    expect(list[0].legs_won).toBe(3);
    expect(list[0].legs_lost).toBe(2);
    expect(list[0].opponent_display_name).toBe('Opponent Name');
  });

  it('returns empty array when no matches', async () => {
    const client = createMockClient([{ data: [], error: null }]);
    const list = await listMatchesForPlayer(client, 'p1');
    expect(list).toEqual([]);
  });
});
