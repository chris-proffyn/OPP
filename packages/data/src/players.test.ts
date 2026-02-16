/**
 * Unit tests for player data layer. Supabase client is mocked.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DataError,
  createPlayer,
  getCurrentPlayer,
  getPlayerById,
  listPlayers,
  setBaselineAndTrainingRating,
  updatePlayer,
} from './players';

function mockClient(overrides: {
  select?: { data: unknown; error: unknown };
  listSelect?: { data: unknown; error: unknown };
  authGetUser?: { user: { id: string } | null; error: unknown };
  insert?: { data: unknown; error: unknown };
  update?: { data: unknown; error: unknown };
}): SupabaseClient {
  const auth = {
    getUser: () =>
      Promise.resolve({
        data: { user: overrides.authGetUser?.user ?? null },
        error: overrides.authGetUser?.error ?? null,
      }),
  };
  const selectResult = overrides.select ?? { data: null, error: null };
  const listResult = overrides.listSelect ?? { data: [], error: null };
  const from = () => ({
    select: (cols?: string) => {
      if (cols && cols !== '*') {
        return Promise.resolve(listResult);
      }
      return {
        limit: () => ({
          maybeSingle: () => Promise.resolve(selectResult),
        }),
        eq: () => ({
          maybeSingle: () => Promise.resolve(selectResult),
        }),
        single: () => Promise.resolve(selectResult),
      };
    },
    insert: () => ({
      select: () => ({
        single: () => Promise.resolve(overrides.insert ?? { data: null, error: null }),
      }),
    }),
    update: () => ({
      eq: () => ({
        select: () => ({
          single: () => Promise.resolve(overrides.update ?? { data: null, error: null }),
        }),
      }),
    }),
  });
  return { from, auth } as unknown as SupabaseClient;
}

const samplePlayer = {
  id: 'pid-1',
  user_id: 'uid-1',
  display_name: 'Test',
  email: 'test@example.com',
  gender: null,
  age_range: null,
  baseline_rating: null,
  training_rating: null,
  match_rating: null,
  player_rating: null,
  date_joined: '2026-01-01',
  role: 'player' as const,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('getCurrentPlayer', () => {
  it('returns player when row exists', async () => {
    const client = mockClient({ select: { data: samplePlayer, error: null } });
    const result = await getCurrentPlayer(client);
    expect(result).toEqual(samplePlayer);
  });

  it('returns null when no row', async () => {
    const client = mockClient({ select: { data: null, error: null } });
    const result = await getCurrentPlayer(client);
    expect(result).toBeNull();
  });
});

describe('createPlayer', () => {
  it('returns created row on success', async () => {
    const client = mockClient({
      authGetUser: { user: { id: 'uid-1' }, error: null },
      insert: { data: samplePlayer, error: null },
    });
    const result = await createPlayer(client, {
      display_name: 'Test',
      email: 'test@example.com',
    });
    expect(result).toEqual(samplePlayer);
  });

  it('throws DataError CONFLICT on unique violation', async () => {
    const client = mockClient({
      authGetUser: { user: { id: 'uid-1' }, error: null },
      insert: { data: null, error: { code: '23505' } },
    });
    await expect(createPlayer(client, { display_name: 'A', email: 'a@b.com' })).rejects.toThrow(
      DataError
    );
    await expect(createPlayer(client, { display_name: 'A', email: 'a@b.com' })).rejects.toMatchObject({
      code: 'CONFLICT',
      message: 'Profile already exists',
    });
  });

  it('throws when not authenticated', async () => {
    const client = mockClient({
      authGetUser: { user: null, error: null },
      insert: { data: null, error: null },
    });
    await expect(createPlayer(client, { display_name: 'A', email: 'a@b.com' })).rejects.toThrow(
      DataError
    );
    await expect(createPlayer(client, { display_name: 'A', email: 'a@b.com' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});

describe('updatePlayer', () => {
  it('returns updated row when payload has fields', async () => {
    const updated = { ...samplePlayer, display_name: 'Updated' };
    const client = mockClient({
      authGetUser: { user: { id: 'uid-1' }, error: null },
      update: { data: updated, error: null },
    });
    const result = await updatePlayer(client, { display_name: 'Updated' });
    expect(result.display_name).toBe('Updated');
  });

  it('returns current player when payload is empty', async () => {
    const client = mockClient({ select: { data: samplePlayer, error: null } });
    const result = await updatePlayer(client, {});
    expect(result).toEqual(samplePlayer);
  });

  it('throws NOT_FOUND when update returns no row', async () => {
    const client = mockClient({
      authGetUser: { user: { id: 'uid-1' }, error: null },
      update: { data: null, error: null },
    });
    await expect(updatePlayer(client, { display_name: 'Updated' })).rejects.toThrow(DataError);
    await expect(updatePlayer(client, { display_name: 'Updated' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Player not found',
    });
  });
});

describe('listPlayers', () => {
  it('throws FORBIDDEN when current user is not admin', async () => {
    const client = mockClient({ select: { data: { ...samplePlayer, role: 'player' }, error: null } });
    await expect(listPlayers(client)).rejects.toThrow(DataError);
    await expect(listPlayers(client)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  });

  it('returns list when current user is admin', async () => {
    const admin = { ...samplePlayer, role: 'admin' as const };
    const client = mockClient({
      select: { data: admin, error: null },
      listSelect: { data: [admin, { ...samplePlayer, id: 'pid-2' }], error: null },
    });
    const list = await listPlayers(client);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(2);
  });
});

describe('getPlayerById', () => {
  // RLS: in real DB, only own row or admin can read. RLS-denied is mocked as empty result → null.
  it('returns player when RLS allows', async () => {
    const client = mockClient({ select: { data: samplePlayer, error: null } });
    const result = await getPlayerById(client, 'pid-1');
    expect(result).toEqual(samplePlayer);
  });

  it('returns null when no row', async () => {
    const client = mockClient({ select: { data: null, error: null } });
    const result = await getPlayerById(client, 'nonexistent');
    expect(result).toBeNull();
  });
});

describe('setBaselineAndTrainingRating', () => {
  it('sets baseline_rating and training_rating when current BR is null', async () => {
    const updated = {
      ...samplePlayer,
      baseline_rating: 29,
      training_rating: 29,
    };
    const client = mockClient({
      select: { data: samplePlayer, error: null },
      update: { data: updated, error: null },
    });
    const result = await setBaselineAndTrainingRating(client, 'pid-1', 29);
    expect(result.baseline_rating).toBe(29);
    expect(result.training_rating).toBe(29);
  });

  it('throws NOT_FOUND when player missing', async () => {
    const client = mockClient({ select: { data: null, error: null } });
    await expect(setBaselineAndTrainingRating(client, 'nonexistent', 50)).rejects.toThrow(
      DataError
    );
    await expect(setBaselineAndTrainingRating(client, 'nonexistent', 50)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Player not found',
    });
  });

  it('throws VALIDATION when baseline_rating already set', async () => {
    const playerWithBR = { ...samplePlayer, baseline_rating: 50, training_rating: 50 };
    const client = mockClient({ select: { data: playerWithBR, error: null } });
    await expect(setBaselineAndTrainingRating(client, 'pid-1', 60)).rejects.toThrow(DataError);
    await expect(setBaselineAndTrainingRating(client, 'pid-1', 60)).rejects.toMatchObject({
      code: 'VALIDATION',
      message: 'Baseline rating already set',
    });
  });
});
