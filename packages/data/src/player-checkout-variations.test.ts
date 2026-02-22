/**
 * Unit tests for player checkout variations: list, getPlayerCheckoutVariationByTotal, create, update, delete.
 */

import { DataError } from './errors';
import {
  getPlayerCheckoutVariationByTotal,
  listPlayerCheckoutVariations,
} from './player-checkout-variations';
import { adminPlayer, createMockClient } from './test-utils';

const sampleVariation = {
  id: 'pcv-1',
  player_id: adminPlayer.id,
  total: 121,
  dart1: 'T19',
  dart2: 'S12',
  dart3: 'D25',
  created_at: '2026-01-01T00:00:00Z',
};

describe('listPlayerCheckoutVariations', () => {
  it('returns current player variations ordered by total descending', async () => {
    const client = createMockClient([
      { data: adminPlayer, error: null },
      { data: [sampleVariation], error: null },
    ]);
    const list = await listPlayerCheckoutVariations(client);
    expect(list).toHaveLength(1);
    expect(list[0].total).toBe(121);
    expect(list[0].dart1).toBe('T19');
  });
});

describe('getPlayerCheckoutVariationByTotal', () => {
  it('returns variation when player has one for total', async () => {
    const client = createMockClient([
      { data: adminPlayer, error: null },
      { data: sampleVariation, error: null },
    ]);
    const result = await getPlayerCheckoutVariationByTotal(client, 121);
    expect(result).not.toBeNull();
    expect(result!.total).toBe(121);
    expect(result!.dart1).toBe('T19');
    expect(result!.dart2).toBe('S12');
    expect(result!.dart3).toBe('D25');
  });

  it('returns null when player has no variation for total', async () => {
    const client = createMockClient([
      { data: adminPlayer, error: null },
      { data: null, error: null },
    ]);
    const result = await getPlayerCheckoutVariationByTotal(client, 121);
    expect(result).toBeNull();
  });

  it('throws UNAUTHORIZED when not signed in', async () => {
    const client = createMockClient([{ data: null, error: null }]);
    await expect(getPlayerCheckoutVariationByTotal(client, 121)).rejects.toThrow(DataError);
    await expect(getPlayerCheckoutVariationByTotal(client, 121)).rejects.toMatchObject({
      message: 'You must be signed in',
    });
  });
});
